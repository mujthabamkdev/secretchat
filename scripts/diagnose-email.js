const nodemailer = require('nodemailer');
require('dotenv').config();

async function diagnose() {
    console.log('--- Email Configuration Diagnosis ---');
    console.log('GMAIL_USER:', process.env.GMAIL_USER);
    console.log('GMAIL_APP_PASSWORD set:', process.env.GMAIL_APP_PASSWORD ? 'YES' : 'NO');

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error('ERROR: Missing environment variables!');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    console.log('\nTesting connection...');
    try {
        await transporter.verify();
        console.log('✅ Connection verified successfully!');
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        if (error.message.includes('Username and Password not accepted')) {
            console.log('\n--- DIAGNOSIS ---');
            console.log('Gmail rejected your credentials.');
            console.log('1. Ensure your GMAIL_USER is "secretchatreal@gmail.com".');
            console.log('2. Ensure GMAIL_APP_PASSWORD is a 16-character APP PASSWORD from Google Security.');
            console.log('   Do NOT use your regular login password.');
            console.log('3. Ensure 2-Step Verification is ON in your Google Account.');
        }
        return;
    }

    console.log('\nAttempting to send a test email to yourself...');
    try {
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER,
            subject: 'SecretChat Diagnosis Test',
            text: 'This is a test email to verify your configuration.',
        });
        console.log('✅ Test email sent successfully! Please check your inbox.');
    } catch (error) {
        console.error('❌ Failed to send test email:', error.message);
    }
}

diagnose();
