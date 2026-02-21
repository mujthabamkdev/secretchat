'use client';
import { useState, useRef, useEffect } from 'react';

interface Props {
    friendId: string;
    onSend: (message: any) => void;
    defaultEphemeral?: boolean;
}

export default function ChatInput({ friendId, onSend, defaultEphemeral }: Props) {
    const [text, setText] = useState('');
    const [isEphemeral, setIsEphemeral] = useState(defaultEphemeral || false);
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsEphemeral(defaultEphemeral || false);
    }, [defaultEphemeral]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || sending) return;

        setSending(true);
        try {
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    friendId,
                    content: text.trim(),
                    type: isEphemeral ? 'EPHEMERAL_TEXT' : 'TEXT'
                })
            });

            if (res.ok) {
                const data = await res.json();
                onSend(data.message);
                setText('');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Upload image
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error('Failed to upload image');
            const uploadData = await uploadRes.json();
            const imageUrl = uploadData.url;

            // Send message
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    friendId,
                    content: imageUrl,
                    type: isEphemeral ? 'EPHEMERAL_IMAGE' : 'IMAGE'
                })
            });

            if (res.ok) {
                const data = await res.json();
                onSend(data.message);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                display: 'flex', gap: '10px', alignItems: 'center',
                background: '#1a1a1a', padding: '10px 14px',
                borderRadius: '30px', margin: '0 16px 24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)', border: '1px solid #333'
            }}
        >
            <button
                type="button"
                onClick={() => setIsEphemeral(!isEphemeral)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    opacity: isEphemeral ? 1 : 0.4,
                    transition: 'all 0.2s',
                    position: 'relative',
                    padding: '8px'
                }}
                title={isEphemeral ? "Disappearing message ON" : "Turn on disappearing messages"}
            >
                🔥
                {isEphemeral && (
                    <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                )}
            </button>

            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={uploadingImage ? "Uploading..." : (isEphemeral ? "Type a secret..." : "Message...")}
                disabled={uploadingImage}
                style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: '#fff', fontSize: '1rem', outline: 'none',
                    fontFamily: 'inherit', padding: '0 4px', minWidth: '0'
                }}
            />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
            />

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                style={{
                    background: 'transparent', border: 'none', color: '#9ca3af',
                    fontSize: '1.2rem', cursor: uploadingImage ? 'wait' : 'pointer', padding: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Send Image"
            >
                📷
            </button>

            <button
                type="submit"
                disabled={!text.trim() || sending || uploadingImage}
                style={{
                    background: text.trim() ? '#10b981' : '#374151',
                    color: '#fff', border: 'none', borderRadius: '50%',
                    width: '38px', height: '38px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: text.trim() && !sending && !uploadingImage ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', padding: '0', marginLeft: '4px'
                }}
            >
                <span style={{ transform: 'translateX(2px)' }}>{sending ? '...' : '➤'}</span>
            </button>
        </form>
    );
}
