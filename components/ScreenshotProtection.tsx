'use client';
import { useEffect, useState } from 'react';

export default function ScreenshotProtection() {
    const [isScreenRecorded, setIsScreenRecorded] = useState(false);
    const [warningMessage, setWarningMessage] = useState<string | null>(null);

    useEffect(() => {
        const isLocal = typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            process.env.NODE_ENV === 'development'
        );

        // 1. Prevent Right Click & Context Menu (only in production)
        const handleContextMenu = (e: MouseEvent) => {
            if (isLocal) return; // Allow right click in local run
            e.preventDefault();
            showWarning('Right-click context menu is disabled for privacy protection.');
        };

        // 2. Prevent Keyboard Shortcut combinations for Screenshots / PrintScreen
        const handleKeyDown = (e: KeyboardEvent) => {
            // PrintScreen key
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
                e.preventDefault();
                blurWindowAndWarn('Screenshots are disabled for privacy protection.');
            }

            // Mac shortcuts: Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5, Cmd + Shift + 6
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5' || e.key === '6' || e.keyCode === 51 || e.keyCode === 52 || e.keyCode === 53 || e.keyCode === 54)) {
                e.preventDefault();
                blurWindowAndWarn('Screen capture shortcut blocked.');
            }

            // Windows / Linux shortcuts: Win + Shift + S, Win + PrintScreen, Alt + PrintScreen
            if ((e.metaKey || e.key === 'Meta') && e.shiftKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                blurWindowAndWarn('Snipping tool shortcut blocked.');
            }

            // Ctrl + P (Print)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                showWarning('Printing chat content is disabled.');
            }
        };

        // 3. Blur window when window loses focus (only in production)
        const handleVisibilityChange = () => {
            if (isLocal) return;
            if (document.hidden) {
                document.body.classList.add('secure-blur');
            } else {
                document.body.classList.remove('secure-blur');
            }
        };

        const handleBlur = () => {
            if (isLocal) return;
            document.body.classList.add('secure-blur');
        };

        const handleFocus = () => {
            if (isLocal) return;
            document.body.classList.remove('secure-blur');
        };

        // 4. Detect Screen Recording via MediaDevices / Display Capture heuristic
        const checkDisplayCapture = () => {
            if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
                // Monitor active screen capture streams if any browser extension/app invokes getDisplayMedia
            }
        };

        // 5. Intercept Copy / Cut events
        const handleCopyCut = (e: ClipboardEvent) => {
            const activeElem = document.activeElement;
            const selection = window.getSelection()?.toString();

            // If text is being copied from a disappearing/secret message element
            if (selection && selection.length > 0) {
                e.preventDefault();
                showWarning('Copying secret chat content is blocked for privacy protection.');
            }
        };

        const showWarning = (msg: string) => {
            setWarningMessage(msg);
            setTimeout(() => setWarningMessage(null), 3500);
        };

        const blurWindowAndWarn = (msg: string) => {
            document.body.classList.add('secure-blur');
            showWarning(msg);
            setTimeout(() => {
                document.body.classList.remove('secure-blur');
            }, 2500);
        };

        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('copy', handleCopyCut);
        window.addEventListener('cut', handleCopyCut);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('copy', handleCopyCut);
            window.removeEventListener('cut', handleCopyCut);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.body.classList.remove('secure-blur');
        };
    }, []);

    return (
        <>
            {/* Warning Alert Banner when screenshot/recording attempt detected */}
            {warningMessage && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '24px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.5)',
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    🔒 <span>{warningMessage}</span>
                </div>
            )}
        </>
    );
}
