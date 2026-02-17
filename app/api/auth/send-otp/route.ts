import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        // Validate Gmail only
        if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
            return NextResponse.json(
                { error: 'Only Gmail addresses are allowed' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if email already registered
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
        }

        // Rate limit: check for recent OTP (last 60 seconds)
        const recentOtp = await prisma.otpVerification.findFirst({
            where: {
                email: normalizedEmail,
                createdAt: { gt: new Date(Date.now() - 60 * 1000) },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (recentOtp) {
            return NextResponse.json(
                { error: 'Please wait 60 seconds before requesting a new code' },
                { status: 429 }
            );
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP (expires in 5 minutes)
        await prisma.otpVerification.create({
            data: {
                email: normalizedEmail,
                otp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            },
        });

        // Send OTP email (mock log)
        const sent = await sendOtpEmail(normalizedEmail, otp);

        // Return OTP in response for dev/auto-fill
        return NextResponse.json({
            success: true,
            message: 'Verification code sent',
            debugOtp: otp
        });
    } catch (error: any) {
        console.error('Send OTP Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
