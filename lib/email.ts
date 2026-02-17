import nodemailer from 'nodemailer';

export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
    console.log(`[EMAIL LOG] To: ${email} | OTP: ${otp}`);

    // If GMAIL_USER is set, we attempt to send the email
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD,
                },
            });

            // Send to the User (The one registering)
            await transporter.sendMail({
                from: process.env.GMAIL_USER, // secretchatreal@gmail.com
                to: email,
                subject: `Your SecretChat Verification Code`,
                text: `Here is your verification code: ${otp}\n\nThis code expires in 5 minutes.`,
            });

            console.log(`[EMAIL] Sent OTP to ${email}`);
            return true;
        } catch (error: any) {
            console.error('[EMAIL ERROR] Failed to send email:', error.message);
            // Return false so the API caller knows the email failed
            return false;
        }
    }

    // If no credentials, we assume dev mode and return true (logged to console above)
    return true;
}
