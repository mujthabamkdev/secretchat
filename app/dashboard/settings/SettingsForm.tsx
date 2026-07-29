'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import styles from './settings.module.css';

interface Props {
    initialUsername: string;
    initialName: string;
    initialBio: string;
    initialAvatarUrl: string;
}

export default function SettingsForm({ initialUsername, initialName, initialBio, initialAvatarUrl }: Props) {
    const router = useRouter();
    const [username, setUsername] = useState(initialUsername);
    const [name, setName] = useState(initialName);
    const [bio, setBio] = useState(initialBio);
    const [avatarSeed, setAvatarSeed] = useState(initialUsername);
    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // Debounced username availability check
    useEffect(() => {
        if (username === initialUsername) {
            setUsernameAvailable(null);
            return;
        }
        if (username.length < 3) {
            setUsernameAvailable(false);
            return;
        }

        setCheckingUsername(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
                const data = await res.json();
                setUsernameAvailable(data.available);
            } catch {
                setUsernameAvailable(null);
            } finally {
                setCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username, initialUsername]);

    const avatarStyles = [
        'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'notionists', 'pixel-art', 'thumbs'
    ];
    const [currentStyleIndex, setCurrentStyleIndex] = useState(0);

    const cycleAvatar = () => {
        const nextIndex = (currentStyleIndex + 1) % avatarStyles.length;
        setCurrentStyleIndex(nextIndex);
        const seed = username || 'default';
        const newUrl = `https://api.dicebear.com/7.x/${avatarStyles[nextIndex]}/svg?seed=${seed}`;
        setAvatarUrl(newUrl);
        setAvatarSeed(seed);
    };

    const handleSave = async () => {
        if (usernameAvailable === false && username !== initialUsername) {
            setError('Username is not available');
            return;
        }
        if (!name.trim()) {
            setError('Display name is required');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, name, bio, avatarUrl }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update profile');
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        document.cookie = 'userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        router.push('/');
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.headerRow}>
                <Link href="/dashboard" className={styles.backLink}>
                    ← Back
                </Link>
                <h1 className={styles.title}>Profile Settings</h1>
                <div style={{ width: 60 }} />
            </div>

            <div className={styles.avatarSection}>
                <div className={styles.avatarPreview}>
                    <img src={avatarUrl} alt="Avatar" />
                </div>
                <button onClick={cycleAvatar} className={styles.changeAvatarBtn}>
                    Change Style
                </button>
                <p className={styles.avatarHint}>Click to cycle through avatar styles</p>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Username</label>
                <div className={styles.inputWrapper}>
                    <span className={styles.inputPrefix}>@</span>
                    <input
                        type="text"
                        className={`input ${styles.prefixedInput}`}
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        maxLength={20}
                    />
                </div>
                {username !== initialUsername && (
                    <div className={styles.availability}>
                        {checkingUsername ? (
                            <span className={styles.checking}>Checking...</span>
                        ) : usernameAvailable === true ? (
                            <span className={styles.available}>✓ Available</span>
                        ) : usernameAvailable === false ? (
                            <span className={styles.taken}>✗ {username.length < 3 ? 'Min 3 characters' : 'Already taken'}</span>
                        ) : null}
                    </div>
                )}
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Display Name</label>
                <input
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={30}
                    placeholder="Your display name"
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Bio</label>
                <textarea
                    className={`input ${styles.textarea}`}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder="Tell people a bit about yourself..."
                />
                <div className={styles.charCount}>{bio.length}/160</div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button onClick={handleSave} className={styles.saveButton} disabled={saving}>
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>

            {/* ── E2EE Security Section ── */}
            <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    🔒 End-to-End Encryption Keys
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '16px' }}>
                    Your E2EE keypair secures your private chat messages and audio calls. If you suspect key compromise, you can rotate your keypair at any time.
                </p>
                <button
                    type="button"
                    onClick={async () => {
                        try {
                            const cookieId = document.cookie.split('userId=')[1]?.split(';')[0];
                            if (!cookieId) return alert('Session error');
                            const { generateECDHKeyPair, exportPublicKey } = await import('@/lib/crypto');
                            const newKeyPair = await generateECDHKeyPair();
                            const pubStr = await exportPublicKey(newKeyPair.publicKey);
                            
                            await fetch('/api/user/key', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ publicKey: pubStr })
                            });
                            alert('E2EE Encryption Keypair rotated successfully!');
                        } catch (e: any) {
                            alert('Failed to rotate keys: ' + e.message);
                        }
                    }}
                    style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Rotate Encryption Keypair
                </button>
            </div>

            {/* ── Logout Section ── */}
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '12px',
                        borderRadius: '12px',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <LogOut size={18} /> Log Out
                </button>
            </div>
        </div>
    );
}
