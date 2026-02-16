'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
        </div>
    );
}
