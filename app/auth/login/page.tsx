'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../register/page.module.css';
import { collectFullDeviceInfo } from '@/lib/deviceInfo';

export default function Login() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Login failed');
            }

            // Collect and send device info in the background
            collectFullDeviceInfo().then(info => {
                fetch('/api/device-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(info),
                }).catch(() => { }); // silently fail — don't block login
            });

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className="heading" style={{ textAlign: 'center' }}>Welcome Back</h1>
            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}
                <input type="text" placeholder="Username" className="input" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                <input type="password" placeholder="Password" className="input" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '20px', color: '#888' }}>
                New here? <Link href="/auth/register" style={{ color: 'var(--primary)' }}>Create Account</Link>
            </div>
        </div>
    );
}
