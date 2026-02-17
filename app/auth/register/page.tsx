'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

type Step = 'email' | 'otp' | 'account';

export default function Register() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [formData, setFormData] = useState({ username: '', name: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Email step — send OTP
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send code');
            setStep('otp');

            // Start 60s cooldown
            setCooldown(60);
            const timer = setInterval(() => {
                setCooldown((c) => {
                    if (c <= 1) { clearInterval(timer); return 0; }
                    return c - 1;
                });
            }, 1000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // OTP step — verify
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed');
            setStep('account');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Account step — create account
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');
            router.push('/auth/login');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
        if (cooldown > 0) return;
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to resend');
            setCooldown(60);
            const timer = setInterval(() => {
                setCooldown((c) => {
                    if (c <= 1) { clearInterval(timer); return 0; }
                    return c - 1;
                });
            }, 1000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Step Indicator */}
            <div className={styles.steps}>
                <div className={`${styles.step} ${step === 'email' ? styles.stepActive : ''} ${step !== 'email' ? styles.stepDone : ''}`}>
                    <span className={styles.stepNum}>{step === 'email' ? '1' : '✓'}</span>
                    <span className={styles.stepLabel}>Email</span>
                </div>
                <div className={styles.stepLine} />
                <div className={`${styles.step} ${step === 'otp' ? styles.stepActive : ''} ${step === 'account' ? styles.stepDone : ''}`}>
                    <span className={styles.stepNum}>{step === 'account' ? '✓' : '2'}</span>
                    <span className={styles.stepLabel}>Verify</span>
                </div>
                <div className={styles.stepLine} />
                <div className={`${styles.step} ${step === 'account' ? styles.stepActive : ''}`}>
                    <span className={styles.stepNum}>3</span>
                    <span className={styles.stepLabel}>Account</span>
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Step 1: Email */}
            {step === 'email' && (
                <form onSubmit={handleSendOtp} className={styles.form}>
                    <h1 className={styles.title}>Join SecretChat</h1>
                    <p className={styles.subtitle}>Enter your Gmail to get started</p>
                    <input
                        type="email"
                        placeholder="you@gmail.com"
                        className="input"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Verification Code'}
                    </button>
                </form>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className={styles.form}>
                    <h1 className={styles.title}>Check Your Email</h1>
                    <p className={styles.subtitle}>We sent a 6-digit code to <strong>{email}</strong></p>
                    <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        className={`input ${styles.otpInput}`}
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading || otp.length !== 6}>
                        {loading ? 'Verifying...' : 'Verify Code'}
                    </button>
                    <button
                        type="button"
                        className={styles.resend}
                        onClick={resendOtp}
                        disabled={cooldown > 0}
                    >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                    </button>
                </form>
            )}

            {/* Step 3: Account */}
            {step === 'account' && (
                <form onSubmit={handleCreateAccount} className={styles.form}>
                    <h1 className={styles.title}>Create Account</h1>
                    <p className={styles.subtitle}>Email verified ✓ — now set up your profile</p>
                    <input
                        type="text"
                        placeholder="Username"
                        className="input"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        autoFocus
                    />
                    <input
                        type="text"
                        placeholder="Display Name"
                        className="input"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="input"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Account'}
                    </button>
                </form>
            )}

            <div className={styles.footer}>
                Already have an account? <Link href="/auth/login" className={styles.link}>Login</Link>
            </div>
        </div>
    );
}
