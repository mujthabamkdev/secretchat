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
        let retryTimer: NodeJS.Timeout;

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
                const fetchPeerKey = async () => {
                    if (!isMounted) return;
                    try {
                        const keyRes = await fetch(`/api/user/key?userId=${friendId}`);
                        if (!keyRes.ok) {
                            if (isMounted) retryTimer = setTimeout(fetchPeerKey, 2000);
                            return;
                        }
                        const keyData = await keyRes.json();

                        if (keyData.publicKey) {
                            const peerPubKey = await importPublicKey(keyData.publicKey);
                            const derived = await deriveSharedKey(keyPair.privateKey, peerPubKey);
                            if (isMounted) {
                                setSharedKey(derived);
                                setE2eeStatus('🔒 End-to-End Encrypted');
                            }
                        } else {
                            if (isMounted) {
                                setE2eeStatus('Waiting for peer E2EE key...');
                                retryTimer = setTimeout(fetchPeerKey, 2000);
                            }
                        }
                    } catch (e) {
                        if (isMounted) retryTimer = setTimeout(fetchPeerKey, 2000);
                    }
                };

                await fetchPeerKey();
            } catch (e) {
                console.error('E2EE Init error:', e);
                if (isMounted) setE2eeStatus('Standard Encryption Active');
            }
        };

        initE2EE();
        return () => {
            isMounted = false;
            if (retryTimer) clearTimeout(retryTimer);
        };
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', padding: '8px' }}>
            {/* E2EE Indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 0 8px', flexShrink: 0 }}>
                <div style={{
                    fontSize: '0.7rem',
                    color: sharedKey ? '#14b8a6' : '#94a3b8',
                    background: sharedKey ? 'rgba(20, 184, 166, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                    border: sharedKey ? '1px solid rgba(20, 184, 166, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontWeight: 500,
                    letterSpacing: '-0.1px'
                }}>
                    {e2eeStatus}
                </div>
            </div>

            {/* Scrollable Messages Section with Hidden Scrollbars */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    paddingBottom: '12px',
                    paddingLeft: '12px',
                    paddingRight: '12px'
                }}
                className="hideScrollbar"
            >
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
                            marginTop: isGrouped ? '6px' : '16px',
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
        if (message.isBurned || viewingEphemeral) return;
        setViewingEphemeral(true);
        setTimeout(() => {
            setViewingEphemeral(false);
            onBurn();
        }, 5000);
    };

    if (isEphemeral && !message.isBurned && !viewingEphemeral) {
        return (
            <div style={{
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                background: isOwn ? 'rgba(239, 68, 68, 0.12)' : '#1e293b',
                padding: '8px 14px',
                borderRadius: '14px',
                cursor: 'pointer',
                border: isOwn ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }} onClick={handleViewEphemeral}>
                <span style={{ fontSize: '1.1rem' }}>🔥</span>
                <span style={{ color: isOwn ? '#ef4444' : '#fbbf24', fontWeight: 600, fontSize: '0.85rem' }}>
                    {isOwn ? 'Tap to view your secret (5s burn)' : 'Tap to reveal secret'}
                </span>
            </div>
        );
    }

    if (isEphemeral && message.isBurned) {
        return (
            <div style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', background: 'transparent', border: '1px dashed #334155', padding: '6px 12px', borderRadius: '12px', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>
                🔥 Disappearing message burned.
            </div>
        );
    }

    return (
        <div style={{
            alignSelf: isOwn ? 'flex-end' : 'flex-start',
            background: isOwn ? '#ffffff' : '#1e293b',
            color: isOwn ? '#0f172a' : '#ffffff',
            padding: '6px 9px 8px 10px',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: isOwn ? '0px' : '8px',
            borderBottomLeftRadius: isOwn ? '8px' : '0px',
            maxWidth: '82%',
            position: 'relative',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            border: isOwn ? '1px solid #e2e8f0' : '1px solid #334155',
            fontFamily: 'Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, sans-serif'
        }}>
            {viewingEphemeral && (
                <div style={{ position: 'absolute', top: '-22px', right: 0, background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                    Burning...
                </div>
            )}

            {isImage ? (
                <img src={message.content!} alt="Chat media" style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '240px', objectFit: 'cover' }} />
            ) : (
                <div style={{
                    wordBreak: 'break-word',
                    fontSize: '0.88rem',
                    lineHeight: '1.38',
                    paddingRight: isOwn ? '45px' : '38px',
                    display: 'inline',
                    fontWeight: isOwn ? 500 : 400
                }}>
                    {message.content}
                </div>
            )}

            {/* Inline WhatsApp Timestamp & Checkmarks */}
            <span style={{
                float: 'right',
                margin: '3px -4px -3px 8px',
                fontSize: '0.66rem',
                color: isOwn ? '#64748b' : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                userSelect: 'none',
                height: '15px'
            }}>
                {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {receiptIcon}
            </span>

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
