'use client';
import { useState, useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import { getOrGenerateLocalKeyPair, importPublicKey, deriveSharedKey, decryptText } from '@/lib/crypto';

interface Message {
    id: string;
    senderId: string;
    type: string; // TEXT, IMAGE, EPHEMERAL_IMAGE, EPHEMERAL_TEXT
    content: string | null;
    iv: string | null;
    sentAt: string;
    deliveredAt: string | null;
    readAt: string | null;
    expiresAt: string | null;
    isBurned: boolean;
}

interface Props {
    currentUserId: string;
    friendId: string;
    friendName: string;
}

export default function ChatRoom({ currentUserId, friendId, friendName }: Props) {
    const [rawMessages, setRawMessages] = useState<Message[]>([]);
    const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoDisappear, setAutoDisappear] = useState(false);
    const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
    const [e2eeStatus, setE2eeStatus] = useState<string>('Initializing encryption...');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ── Setup E2EE Key Pair & Shared Secret ──
    useEffect(() => {
        let isMounted = true;

        const initE2EE = async () => {
            try {
                // 1. Get or generate local user keypair
                const { keyPair, publicKeyString } = await getOrGenerateLocalKeyPair(currentUserId);

                // Ensure server has our public key stored
                await fetch('/api/user/key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ publicKey: publicKeyString })
                });

                // 2. Fetch friend's public key
                const keyRes = await fetch(`/api/user/key?userId=${friendId}`);
                if (!keyRes.ok) {
                    if (isMounted) setE2eeStatus('Standard Secure Chat');
                    return;
                }

                const keyData = await keyRes.json();
                if (keyData.publicKey) {
                    const peerPubKey = await importPublicKey(keyData.publicKey);
                    const derived = await deriveSharedKey(keyPair.privateKey, peerPubKey);
                    if (isMounted) {
                        setSharedKey(derived);
                        setE2eeStatus('🔒 End-to-End Encrypted (Signal ECDH)');
                    }
                } else {
                    if (isMounted) setE2eeStatus('Waiting for peer E2EE key...');
                }
            } catch (e) {
                console.error('E2EE Init error:', e);
                if (isMounted) setE2eeStatus('Standard Encryption Active');
            }
        };

        initE2EE();
        return () => { isMounted = false; };
    }, [currentUserId, friendId]);

    // Fetch messages from server
    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chat/messages?friendId=${friendId}`);
            if (!res.ok) return;
            const data = await res.json();

            setRawMessages(prev => {
                if (prev.length === data.messages.length && JSON.stringify(prev) === JSON.stringify(data.messages)) {
                    return prev;
                }
                return data.messages;
            });
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    // Poll every 3 seconds
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [friendId]);

    // Decrypt messages asynchronously whenever rawMessages or sharedKey updates
    useEffect(() => {
        let active = true;

        const processDecryption = async () => {
            const decryptedList = await Promise.all(
                rawMessages.map(async (msg) => {
                    if (!msg.content || !msg.iv || !sharedKey) {
                        return msg; // Plaintext or burned message
                    }
                    try {
                        const plain = await decryptText(msg.content, msg.iv, sharedKey);
                        return { ...msg, content: plain };
                    } catch (err) {
                        // Return as-is if decryption fails or fallback
                        return msg;
                    }
                })
            );

            if (active) {
                setDecryptedMessages(decryptedList);
            }
        };

        processDecryption();
        return () => { active = false; };
    }, [rawMessages, sharedKey]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (!loading) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [decryptedMessages, loading]);

    // Mark unread messages as READ
    useEffect(() => {
        const unreadIds = rawMessages
            .filter(m => m.senderId !== currentUserId && !m.readAt && !m.isBurned)
            .map(m => m.id);

        if (unreadIds.length > 0) {
            fetch('/api/chat/messages/read', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: unreadIds, status: 'READ' })
            }).then(() => {
                setRawMessages(prev => prev.map(m =>
                    unreadIds.includes(m.id) ? { ...m, readAt: new Date().toISOString() } : m
                ));
            }).catch(console.error);
        }
    }, [rawMessages, currentUserId]);

    const handleBurn = async (messageId: string) => {
        try {
            await fetch('/api/chat/messages/read', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: [messageId], burn: true })
            });
            setRawMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, isBurned: true, content: null } : m
            ));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (messageId: string) => {
        try {
            await fetch('/api/chat/messages/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })
            });
            setRawMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '10px' }}>
            {/* E2EE Indicator & Disappearing Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '4px' }}>
                <div style={{ fontSize: '0.75rem', color: sharedKey ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                    {e2eeStatus}
                </div>
                <button
                    onClick={() => setAutoDisappear(!autoDisappear)}
                    style={{
                        background: autoDisappear ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: autoDisappear ? '#ef4444' : '#9ca3af',
                        border: `1px solid ${autoDisappear ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                        padding: '6px 14px', borderRadius: '16px', fontSize: '0.8rem',
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    🔥 <span>Default to Disappearing: {autoDisappear ? 'ON' : 'OFF'}</span>
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '20px', paddingLeft: '8px', paddingRight: '8px' }}>
                {decryptedMessages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#666', marginTop: 'auto', marginBottom: 'auto' }}>
                        No messages yet. Send a secret!
                    </div>
                )}
                {decryptedMessages.map((msg, index) => {
                    const isOwn = msg.senderId === currentUserId;
                    const prevMsg = decryptedMessages[index - 1];
                    const isGrouped = prevMsg && prevMsg.senderId === msg.senderId;

                    return (
                        <div key={msg.id} style={{
                            marginTop: isGrouped ? '2px' : '10px',
                            display: 'flex',
                            justifyContent: isOwn ? 'flex-end' : 'flex-start'
                        }}>
                            <MessageBubble
                                message={msg}
                                isOwn={isOwn}
                                onBurn={() => handleBurn(msg.id)}
                                onDelete={isOwn ? () => handleDelete(msg.id) : undefined}
                            />
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <ChatInput
                friendId={friendId}
                sharedKey={sharedKey}
                onSend={(newMsg: Message) => setRawMessages(prev => [...prev, newMsg])}
                defaultEphemeral={autoDisappear}
            />
        </div>
    );
}

// Sub-component for Message Bubble
function MessageBubble({ message, isOwn, onBurn, onDelete }: { message: Message, isOwn: boolean, onBurn: () => void, onDelete?: () => void }) {
    const [viewingEphemeral, setViewingEphemeral] = useState(false);

    const isEphemeral = message.type.startsWith('EPHEMERAL_');
    const isImage = message.type === 'IMAGE' || message.type === 'EPHEMERAL_IMAGE';

    // WhatsApp style read receipts
    let receiptIcon = null;
    if (isOwn) {
        if (message.readAt) {
            receiptIcon = <span style={{ color: '#3b82f6', fontSize: '0.75rem', marginLeft: '4px' }}>✓✓</span>;
        } else if (message.deliveredAt) {
            receiptIcon = <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '4px' }}>✓✓</span>;
        } else {
            receiptIcon = <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '4px' }}>✓</span>;
        }
    }

    const handleViewEphemeral = () => {
        if (message.isBurned) return;
        setViewingEphemeral(true);
        setTimeout(() => {
            setViewingEphemeral(false);
            onBurn();
        }, 5000);
    };

    if (isEphemeral && !isOwn && !message.isBurned && !viewingEphemeral) {
        return (
            <div style={{ alignSelf: 'flex-start', background: '#374151', padding: '10px 14px', borderRadius: '16px', borderBottomLeftRadius: '4px', maxWidth: '75%', cursor: 'pointer', border: '1px solid #d97706', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleViewEphemeral}>
                <span style={{ fontSize: '1.2rem' }}>🔥</span>
                <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.9rem' }}>Tap to view secret</span>
            </div>
        );
    }

    if (isEphemeral && message.isBurned) {
        return (
            <div style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', background: 'transparent', border: '1px dashed #4b5563', padding: '6px 12px', borderRadius: '12px', color: '#6b7280', fontSize: '0.8rem', fontStyle: 'italic' }}>
                This message was burned.
            </div>
        );
    }

    return (
        <div style={{
            alignSelf: isOwn ? 'flex-end' : 'flex-start',
            background: isOwn ? '#10b981' : '#1f2937',
            color: isOwn ? '#fff' : '#e5e7eb',
            padding: '10px 14px',
            borderRadius: '16px',
            borderBottomRightRadius: isOwn ? '4px' : '16px',
            borderBottomLeftRadius: isOwn ? '16px' : '4px',
            maxWidth: '75%',
            position: 'relative',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}>
            {viewingEphemeral && (
                <div style={{ position: 'absolute', top: '-24px', right: 0, background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
                    Burning...
                </div>
            )}

            {isImage ? (
                <img src={message.content!} alt="Chat media" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '250px', objectFit: 'cover' }} />
            ) : (
                <div style={{ wordBreak: 'break-word', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    {message.content}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '4px', fontSize: '0.7rem', color: isOwn ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>
                {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {receiptIcon}
            </div>

            {onDelete && (
                <button
                    onClick={onDelete}
                    style={{ position: 'absolute', top: '10px', left: '-28px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, fontSize: '0.9rem', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Delete message"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                >
                    ✕
                </button>
            )}
        </div>
    );
}
