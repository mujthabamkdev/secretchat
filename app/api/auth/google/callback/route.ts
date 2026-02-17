import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
        return NextResponse.redirect(new URL('/auth/login?error=google_denied', req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    try {
        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenRes.json();
        if (!tokens.access_token) {
            console.error('Token exchange failed:', tokens);
            return NextResponse.redirect(new URL('/auth/login?error=token_failed', req.url));
        }

        // Get user info from Google
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const googleUser = await userInfoRes.json();
        if (!googleUser.email) {
            return NextResponse.redirect(new URL('/auth/login?error=no_email', req.url));
        }

        // Find or create user
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { googleId: googleUser.id },
                    { email: googleUser.email },
                ],
            },
        });

        if (!user) {
            // Create new user — generate username from email
            const baseUsername = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            let username = baseUsername;
            let counter = 1;

            // Ensure unique username
            while (await prisma.user.findUnique({ where: { username } })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            user = await prisma.user.create({
                data: {
                    googleId: googleUser.id,
                    email: googleUser.email,
                    username,
                    name: googleUser.name || baseUsername,
                    avatarUrl: googleUser.picture || null,
                },
            });
        } else if (!user.googleId) {
            // Link google account to existing user
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId: googleUser.id,
                    avatarUrl: user.avatarUrl || googleUser.picture || null,
                },
            });
        }

        // Set auth cookie
        const cookieStore = await cookies();
        cookieStore.set('userId', user.id, { path: '/', maxAge: 60 * 60 * 24 * 30 }); // 30 days

        return NextResponse.redirect(new URL('/dashboard', req.url));
    } catch (err) {
        console.error('Google auth error:', err);
        return NextResponse.redirect(new URL('/auth/login?error=server_error', req.url));
    }
}
