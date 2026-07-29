import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { username, name, password, email, publicKey } = await req.json();

        if (!email || !username || !name || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Verify that OTP was completed for this email
        const verifiedOtp = await prisma.otpVerification.findFirst({
            where: {
                email: normalizedEmail,
                verified: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!verifiedOtp) {
            return NextResponse.json({ error: 'Email not verified. Please complete OTP verification first.' }, { status: 403 });
        }

        // Check uniqueness
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) return NextResponse.json({ error: 'Username taken' }, { status: 409 });

        const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingEmail) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

        // Hash password securely with bcrypt
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                username,
                name,
                password: hashedPassword,
                email: normalizedEmail,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                publicKey: publicKey || null,
            },
        });

        // Clean up used OTP records
        await prisma.otpVerification.deleteMany({ where: { email: normalizedEmail } });

        (await cookies()).set('userId', user.id, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error: any) {
        console.error('Register API Error:', error);
        return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
    }
}

