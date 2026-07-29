'use client';
import { useState, useRef, useEffect } from 'react';
import { Camera, Flame, Send } from 'lucide-react';
import { encryptText } from '@/lib/crypto';

interface Props {
    friendId: string;
    sharedKey: CryptoKey | null;
    onSend: (message: any) => void;
    defaultEphemeral?: boolean;
}

export default function ChatInput({ friendId, sharedKey, onSend, defaultEphemeral }: Props) {
    const [text, setText] = useState('');
    const [isEphemeral, setIsEphemeral] = useState(defaultEphemeral || false);
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsEphemeral(defaultEphemeral || false);
    }, [defaultEphemeral]);

    const getWordCount = (str: string) => {
        const trimmed = str.trim();
        return trimmed ? trimmed.split(/\s+/).length : 0;
    };

    const wordCount = getWordCount(text);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || sending) return;

        if (wordCount > 60) {
            alert('Messages cannot exceed 60 words.');
            return;
        }

        setSending(true);
        try {
            let finalContent = text.trim();
            let ivString: string | null = null;

            // Encrypt content client-side using shared AES-GCM key if available
            if (sharedKey) {
                const { ciphertext, iv } = await encryptText(finalContent, sharedKey);
                finalContent = ciphertext;
                ivString = iv;
            }

            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    friendId,
                    content: finalContent,
                    iv: ivString,
                    type: isEphemeral ? 'EPHEMERAL_TEXT' : 'TEXT'
                })
            });

            if (res.ok) {
                const data = await res.json();
                onSend(data.message);
                setText('');
            }
        } catch (error) {
            console.error('Send error:', error);
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
            let imageUrl = uploadData.url;
            let ivString: string | null = null;

            // Encrypt image URL if shared key available
            if (sharedKey) {
                const { ciphertext, iv } = await encryptText(imageUrl, sharedKey);
                imageUrl = ciphertext;
                ivString = iv;
            }

            // Send message
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    friendId,
                    content: imageUrl,
                    iv: ivString,
                    type: isEphemeral ? 'EPHEMERAL_IMAGE' : 'IMAGE'
                })
            });

            if (res.ok) {
                const data = await res.json();
                onSend(data.message);
            }
        } catch (error) {
            console.error('Image upload error:', error);
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
                    color: isEphemeral ? '#ef4444' : '#94a3b8',
                    cursor: 'pointer',
                    opacity: isEphemeral ? 1 : 0.5,
                    transition: 'all 0.2s',
                    position: 'relative',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title={isEphemeral ? "Disappearing message ON" : "Turn on disappearing messages"}
            >
                <Flame size={20} />
                {isEphemeral && (
                    <span style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }} />
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
                    color: wordCount > 60 ? '#ef4444' : '#fff', fontSize: '1rem', outline: 'none',
                    fontFamily: 'inherit', padding: '0 4px', minWidth: '0'
                }}
            />

            {text.trim().length > 0 && (
                <span style={{ fontSize: '0.7rem', color: wordCount > 60 ? '#ef4444' : '#64748b', fontWeight: 600, paddingRight: '4px' }}>
                    {wordCount}/60w
                </span>
            )}

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
                    background: 'transparent',
                    border: 'none',
                    color: uploadingImage ? '#14b8a6' : '#94a3b8',
                    cursor: uploadingImage ? 'wait' : 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s'
                }}
                title="Send Image"
            >
                <Camera size={20} />
            </button>

            <button
                type="submit"
                disabled={!text.trim() || sending || uploadingImage || wordCount > 60}
                style={{
                    background: text.trim() && wordCount <= 60 ? 'var(--brand-gradient)' : '#1e293b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: text.trim() && !sending && !uploadingImage && wordCount <= 60 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    padding: '0',
                    marginLeft: '4px',
                    boxShadow: text.trim() && wordCount <= 60 ? '0 2px 10px rgba(20, 184, 166, 0.3)' : 'none'
                }}
            >
                <Send size={16} style={{ transform: 'translateX(1px)' }} />
            </button>
        </form>
    );
}
