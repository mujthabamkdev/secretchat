'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

export default function Login() {
    const searchParams = useSearchParams();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const err = searchParams.get('error');
        if (err === 'google_denied') setError('Google sign-in was cancelled.');
        else if (err === 'token_failed') setError('Failed to authenticate with Google. Please try again.');
        else if (err === 'no_email') setError('Could not get your email from Google.');
        else if (err === 'server_error') setError('Something went wrong. Please try again.');
    }, [searchParams]);

    const handleGoogleSignIn = () => {
        setLoading(true);
        setError('');
        window.location.href = '/api/auth/google';
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {/* Logo */}
                <div className={styles.logoContainer}>
                    <div className={styles.logo}>🔒</div>
                    <h1 className={styles.appName}>SecretChat</h1>
                    <p className={styles.tagline}>End-to-end encrypted conversations</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {/* Google Sign In Button */}
                <button
                    onClick={handleGoogleSignIn}
                    className={styles.googleButton}
                    disabled={loading}
                >
                    {loading ? (
                        <div className={styles.spinner} />
                    ) : (
                        <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    )}
                    <span>{loading ? 'Redirecting...' : 'Sign in with Google'}</span>
                </button>

                <div className={styles.divider}>
                    <span>Secure & Private</span>
                </div>

                <div className={styles.features}>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>🔐</span>
                        <span>Encrypted video calls</span>
                    </div>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>👤</span>
                        <span>Auto-created profile</span>
                    </div>
                    <div className={styles.feature}>
                        <span className={styles.featureIcon}>⚡</span>
                        <span>One-tap sign in</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
