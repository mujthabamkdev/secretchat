'use client';
import { useState } from 'react';

interface Props {
    friendId: string;
    onSend: (message: any) => void;
}

export default function ChatInput({ friendId, onSend }: Props) {
    const [text, setText] = useState('');
    const [isEphemeral, setIsEphemeral] = useState(false);
    const [sending, setSending] = useState(false);

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

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                display: 'flex', gap: '8px', alignItems: 'center',
                background: 'rgba(255,255,255,0.05)', padding: '12px',
                borderRadius: '24px', margin: '0 16px 16px'
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
                placeholder={isEphemeral ? "Type a secret..." : "Message..."}
                style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: '#fff', fontSize: '1rem', outline: 'none',
                    fontFamily: 'inherit'
                }}
            />

            <button
                type="submit"
                disabled={!text.trim() || sending}
                style={{
                    background: text.trim() ? '#10b981' : '#374151',
                    color: '#fff', border: 'none', borderRadius: '50%',
                    width: '36px', height: '36px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                }}
            >
                {sending ? '...' : '➤'}
            </button>
        </form>
    );
}
