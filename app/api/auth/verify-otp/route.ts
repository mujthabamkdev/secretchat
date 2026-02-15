import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find the latest non-expired, non-verified OTP for this email
        const record = await prisma.otpVerification.findFirst({
            where: {
                email: normalizedEmail,
                otp,
                verified: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!record) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        // Mark as verified
        await prisma.otpVerification.update({
            where: { id: record.id },
            data: { verified: true },
        });

        return NextResponse.json({ success: true, message: 'Email verified' });
    } catch (error: any) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
