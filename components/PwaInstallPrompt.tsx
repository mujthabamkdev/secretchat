'use client';
import { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        // Check if already in standalone app mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) return;

        // Android / Chromium beforeinstallprompt handler
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Show iOS hint if on iOS browser and not installed
        if (ios && !isStandalone) {
            const hasDismissed = localStorage.getItem('sc_pwa_dismissed');
            if (!hasDismissed) {
                setShowPrompt(true);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('sc_pwa_dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '420px',
            background: 'rgba(18, 18, 18, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '16px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 9999,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0
                }}>
                    📱
                </div>
                <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Install SecretChat App</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '2px' }}>
                        {isIOS ? 'Tap Share ➔ "Add to Home Screen"' : 'Add to home screen for full app mode'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isIOS && (
                    <button
                        onClick={handleInstallClick}
                        style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}
                    >
                        Install
                    </button>
                )}
                <button
                    onClick={handleDismiss}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
