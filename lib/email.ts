import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
    // If no Gmail credentials configured, log OTP to console (dev mode)
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.log(`\n📧 [DEV MODE] OTP for ${email}: ${otp}\n`);
        return true;
    }

    try {
        await transporter.sendMail({
            from: `"SecretChat" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Your SecretChat Verification Code',
            html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #ededed; border-radius: 16px;">
                    <h2 style="text-align: center; margin-bottom: 8px;">🔒 SecretChat</h2>
                    <p style="text-align: center; color: #888; font-size: 14px;">Your verification code</p>
                    <div style="text-align: center; font-size: 36px; font-weight: 900; letter-spacing: 8px; padding: 24px 0; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        ${otp}
                    </div>
                    <p style="text-align: center; color: #666; font-size: 12px;">This code expires in 5 minutes. Do not share it.</p>
                </div>
            `,
        });
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}
