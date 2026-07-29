import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const username = typeof body.username === 'string' ? body.username.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        const rateLimitRes = checkRateLimit(`login_${username || 'unknown'}`, 10, 60 * 1000);
        if (rateLimitRes) return rateLimitRes;

        if (!username || !password || username.length > 50 || password.length > 200) {
            return NextResponse.json({ error: 'Invalid input format' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.password) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Verify hashed password (fallback to direct equality for legacy dev users if any)
        let isValid = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            isValid = user.password === password;
        }

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Set secure HTTP-only cookie
        (await cookies()).set('userId', user.id, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

