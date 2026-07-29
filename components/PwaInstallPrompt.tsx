'use client';
import { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const userAgent = window.navigator.userAgent.toLowerCase();
        const mobileCheck = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent) ||
            (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
        
        setIsMobile(mobileCheck);
        if (!mobileCheck) return; // Strict check: ONLY run on mobile devices

        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        // Check if already running in standalone native app mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        if (isStandalone) return;

        // Chromium / Android beforeinstallprompt event
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);

            const hasDismissed = localStorage.getItem('sc_pwa_dismissed');
            if (!hasDismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // iOS Safari hint (first time on mobile)
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

    if (!isMobile || !showPrompt) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '92%',
            maxWidth: '400px',
            background: 'rgba(15, 23, 42, 0.96)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            borderRadius: '20px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
            zIndex: 99999,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <img
                    src="/icons/icon-192.png"
                    alt="SecretChat Logo"
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        flexShrink: 0
                    }}
                />
                <div>
                    <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                        Install SecretChat App
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px', lineHeight: 1.3 }}>
                        {isIOS ? 'Tap Share ➔ "Add to Home Screen"' : 'Add to home screen for full app mode'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isIOS && (
                    <button
                        onClick={handleInstallClick}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
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
                        color: '#64748b',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                    title="Close"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
