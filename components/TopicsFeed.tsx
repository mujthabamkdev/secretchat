'use client';
import { useState, useEffect, useRef } from 'react';
import { Heart, MessageSquare, Trash2, Lock, Unlock, Send, Sparkles, X } from 'lucide-react';

interface Author {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
}

interface Topic {
    id: string;
    author: Author;
    content: string;
    commentsRestricted: boolean;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    isAuthor: boolean;
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: Author;
    isCommentAuthor: boolean;
    isTopicAuthor: boolean;
}

export default function TopicsFeed() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [newContent, setNewContent] = useState('');
    const [restrictComments, setRestrictComments] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Active comment modal
    const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    const fetchTopics = async () => {
        try {
            const res = await fetch('/api/topics');
            const data = await res.json();
            setTopics(data.topics || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopics();
    }, []);

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContent.trim() || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/topics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newContent.trim(),
                    commentsRestricted: restrictComments
                })
            });

            if (res.ok) {
                const data = await res.json();
                setTopics(prev => [data.topic, ...prev]);
                setNewContent('');
                setRestrictComments(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLikeTopic = async (topicId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Optimistic UI update
        setTopics(prev => prev.map(t => {
            if (t.id === topicId) {
                const nextIsLiked = !t.isLiked;
                return {
                    ...t,
                    isLiked: nextIsLiked,
                    likesCount: nextIsLiked ? t.likesCount + 1 : Math.max(0, t.likesCount - 1)
                };
            }
            return t;
        }));

        try {
            const res = await fetch(`/api/topics/${topicId}/like`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setTopics(prev => prev.map(t => {
                    if (t.id === topicId) {
                        return { ...t, isLiked: data.isLiked, likesCount: data.likesCount };
                    }
                    return t;
                }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteTopic = async (topicId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this topic?')) return;

        try {
            const res = await fetch(`/api/topics/${topicId}`, { method: 'DELETE' });
            if (res.ok) {
                setTopics(prev => prev.filter(t => t.id !== topicId));
                if (activeTopic?.id === topicId) setActiveTopic(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleRestriction = async (topicId: string, currentRestricted: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        const nextRestricted = !currentRestricted;

        // Optimistic update
        setTopics(prev => prev.map(t => t.id === topicId ? { ...t, commentsRestricted: nextRestricted } : t));
        if (activeTopic?.id === topicId) {
            setActiveTopic(prev => prev ? { ...prev, commentsRestricted: nextRestricted } : null);
        }

        try {
            await fetch(`/api/topics/${topicId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentsRestricted: nextRestricted })
            });
        } catch (e) {
            console.error(e);
        }
    };

    const openCommentsModal = async (topic: Topic) => {
        setActiveTopic(topic);
        setCommentsLoading(true);
        try {
            const res = await fetch(`/api/topics/${topic.id}/comments`);
            const data = await res.json();
            setComments(data.comments || []);
        } catch (e) {
            console.error(e);
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTopic || !commentText.trim() || sendingComment) return;

        setSendingComment(true);
        try {
            const res = await fetch(`/api/topics/${activeTopic.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText.trim() })
            });

            if (res.ok) {
                const data = await res.json();
                setComments(prev => [...prev, data.comment]);
                setTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, commentsCount: data.commentsCount } : t));
                setCommentText('');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to post comment');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSendingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!activeTopic) return;
        try {
            const res = await fetch(`/api/topics/${activeTopic.id}/comments/${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                const data = await res.json();
                setComments(prev => prev.filter(c => c.id !== commentId));
                setTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, commentsCount: data.commentsCount } : t));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="container" style={{ padding: '16px 20px 40px' }}>
            {/* Create Topic Box */}
            <form onSubmit={handleCreateTopic} style={{
                background: '#111827',
                border: '1px solid #1e293b',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#14b8a6', fontWeight: 700, fontSize: '0.9rem' }}>
                    <Sparkles size={18} />
                    <span>Post a Public Topic</span>
                </div>

                <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Share something secret or ask a question..."
                    rows={3}
                    maxLength={300}
                    style={{
                        width: '100%',
                        background: '#090d16',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        padding: '12px',
                        fontSize: '0.95rem',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                        lineHeight: '1.4'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={restrictComments}
                            onChange={(e) => setRestrictComments(e.target.checked)}
                            style={{ accentColor: '#14b8a6', cursor: 'pointer' }}
                        />
                        <span>Restrict commenting</span>
                    </label>

                    <button
                        type="submit"
                        disabled={!newContent.trim() || submitting}
                        style={{
                            background: newContent.trim() ? 'var(--brand-gradient)' : '#1e293b',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '8px 18px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: newContent.trim() && !submitting ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>{submitting ? 'Posting...' : 'Post Topic'}</span>
                    </button>
                </div>
            </form>

            {/* Feed List */}
            {loading ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>Loading topics...</div>
            ) : topics.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0', fontSize: '0.9rem' }}>
                    No topics posted yet. Be the first to share!
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {topics.map((topic) => (
                        <div
                            key={topic.id}
                            onClick={() => openCommentsModal(topic)}
                            style={{
                                background: '#111827',
                                border: '1px solid #1e293b',
                                borderRadius: '16px',
                                padding: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                        >
                            {/* Author & Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img
                                        src={topic.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topic.author.username}`}
                                        alt={topic.author.name}
                                        style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #1e293b', objectFit: 'cover' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem', lineHeight: '1.2' }}>{topic.author.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>@{topic.author.username} · {timeAgo(topic.createdAt)}</div>
                                    </div>
                                </div>

                                {topic.isAuthor && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={(e) => handleToggleRestriction(topic.id, topic.commentsRestricted, e)}
                                            style={{ background: 'transparent', border: 'none', color: topic.commentsRestricted ? '#ef4444' : '#64748b', cursor: 'pointer', padding: '4px' }}
                                            title={topic.commentsRestricted ? "Commenting restricted" : "Restrict comments"}
                                        >
                                            {topic.commentsRestricted ? <Lock size={16} /> : <Unlock size={16} />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteTopic(topic.id, e)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
                                            title="Delete topic"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Post Text Content */}
                            <div style={{ color: '#e2e8f0', fontSize: '0.92rem', lineHeight: '1.45', wordBreak: 'break-word', marginBottom: '14px' }}>
                                {topic.content}
                            </div>

                            {/* Footer Interaction Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                <button
                                    onClick={(e) => handleLikeTopic(topic.id, e)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: topic.isLiked ? '#ef4444' : '#94a3b8',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontWeight: 600,
                                        padding: 0
                                    }}
                                >
                                    <Heart size={18} fill={topic.isLiked ? '#ef4444' : 'none'} />
                                    <span>{topic.likesCount}</span>
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                                    <MessageSquare size={17} />
                                    <span>{topic.commentsCount}</span>
                                </div>

                                {topic.commentsRestricted && (
                                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginLeft: 'auto', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Lock size={12} /> Restricted
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Comments Detail Modal */}
            {activeTopic && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    padding: '0'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '480px',
                        maxHeight: '85vh',
                        background: '#090d16',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px',
                        border: '1px solid #1e293b',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
                        animation: 'slideUp 0.2s ease'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderBottom: '1px solid #1e293b',
                            background: '#111827'
                        }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}>Topic Comments</div>
                            <button
                                onClick={() => setActiveTopic(null)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }} className="hideScrollbar">
                            {/* Topic Original Banner */}
                            <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#14b8a6', fontWeight: 700, marginBottom: '4px' }}>@{activeTopic.author.username}</div>
                                <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{activeTopic.content}</div>
                            </div>

                            {commentsLoading ? (
                                <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Loading comments...</div>
                            ) : comments.length === 0 ? (
                                <div style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>
                                    No comments yet. Start the conversation!
                                </div>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <img
                                            src={comment.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`}
                                            alt={comment.author.name}
                                            style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, marginTop: '2px' }}
                                        />
                                        <div style={{ flex: 1, background: '#111827', border: '1px solid #1e293b', borderRadius: '12px', padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                                                    {comment.author.name} <span style={{ color: '#64748b', fontWeight: 400 }}>@{comment.author.username}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{timeAgo(comment.createdAt)}</span>
                                                    {(comment.isCommentAuthor || comment.isTopicAuthor) && (
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, opacity: 0.7 }}
                                                            title="Delete comment"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                                {comment.content}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Comment Input Footer */}
                        {activeTopic.commentsRestricted && !activeTopic.isAuthor ? (
                            <div style={{ padding: '14px', background: '#111827', borderTop: '1px solid #1e293b', color: '#ef4444', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                                🔒 Commenting has been restricted by the author.
                            </div>
                        ) : (
                            <form onSubmit={handleSendComment} style={{
                                padding: '12px 16px',
                                background: '#111827',
                                borderTop: '1px solid #1e293b',
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'center'
                            }}>
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Write a comment..."
                                    style={{
                                        flex: 1,
                                        background: '#090d16',
                                        border: '1px solid #1e293b',
                                        borderRadius: '20px',
                                        padding: '8px 14px',
                                        color: '#ffffff',
                                        fontSize: '0.88rem',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!commentText.trim() || sendingComment}
                                    style={{
                                        background: commentText.trim() ? 'var(--brand-gradient)' : '#1e293b',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: commentText.trim() && !sendingComment ? 'pointer' : 'not-allowed',
                                        flexShrink: 0
                                    }}
                                >
                                    <Send size={15} />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
