'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, MessageSquare, Flame, Users, Search } from 'lucide-react';
import TopicsFeed from '@/components/TopicsFeed';
import styles from './page.module.css';

interface User {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
}

interface Friend {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    latestMessage: any;
}

interface DashboardTabsClientProps {
    currentUserId?: string;
    isAdmin: boolean;
    profileAvatar: string;
    friends: Friend[];
    communityUsers: User[];
}

export default function DashboardTabsClient({
    currentUserId,
    isAdmin,
    profileAvatar,
    friends,
    communityUsers,
}: DashboardTabsClientProps) {
    const [activeTab, setActiveTab] = useState<'topics' | 'connections'>('topics');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFriends = friends.filter(
        f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCommunity = communityUsers.filter(
        u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container" style={{ paddingTop: '12px', paddingBottom: '40px' }}>
            {/* Header */}
            <header className={styles.header} style={{ marginTop: 0, marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', marginTop: 0 }}>
                    <div>
                        {isAdmin && (
                            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', color: '#38bdf8', fontSize: '13px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}>
                                <ShieldCheck size={16} /> Admin Panel
                            </Link>
                        )}
                    </div>
                    <Link href="/dashboard/settings" className={styles.profileButton} title="Profile Settings" style={{ margin: 0 }}>
                        <img src={profileAvatar} alt="Profile" />
                    </Link>
                </div>
            </header>

            {/* Main Tabs Header */}
            <div style={{
                display: 'flex',
                background: '#111827',
                borderRadius: '16px',
                padding: '4px',
                marginBottom: '20px',
                border: '1px solid #1e293b'
            }}>
                <button
                    onClick={() => setActiveTab('topics')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'topics' ? 'var(--brand-gradient)' : 'transparent',
                        color: activeTab === 'topics' ? '#ffffff' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Flame size={18} />
                    <span>Topics</span>
                </button>

                <button
                    onClick={() => setActiveTab('connections')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === 'connections' ? 'var(--brand-gradient)' : 'transparent',
                        color: activeTab === 'connections' ? '#ffffff' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={18} />
                    <span>My Connections</span>
                    {friends.length > 0 && (
                        <span style={{
                            background: activeTab === 'connections' ? 'rgba(255,255,255,0.25)' : 'rgba(20, 184, 166, 0.2)',
                            color: activeTab === 'connections' ? '#fff' : '#14b8a6',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                        }}>
                            {friends.length}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB CONTENT: TOPICS */}
            {activeTab === 'topics' && (
                <TopicsFeed />
            )}

            {/* TAB CONTENT: MY CONNECTIONS */}
            {activeTab === 'connections' && (
                <div>
                    {/* Search Bar for Connections */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#111827',
                        border: '1px solid #1e293b',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        marginBottom: '20px',
                        gap: '10px'
                    }}>
                        <Search size={18} color="#64748b" />
                        <input
                            type="text"
                            placeholder="Search your connections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Connections List */}
                    <div className={styles.friendsSection}>
                        <div className={styles.userList}>
                            {filteredFriends.map((friend) => (
                                <div key={friend.id} className={styles.userCard} style={{ borderColor: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Link href={`/dashboard/profile/${friend.id}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flex: 1, minWidth: 0, paddingRight: '12px' }}>
                                        <div className={styles.avatar}>
                                            <img src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} alt={friend.name} />
                                        </div>
                                        <div className={styles.userInfo} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div className={styles.userName}>{friend.name}</div>
                                                {friend.latestMessage && (
                                                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                                        {new Date(friend.latestMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.userHandle}>@{friend.username}</div>
                                            <div style={{
                                                fontSize: '0.8rem', color: friend.latestMessage && !friend.latestMessage.readAt && friend.latestMessage.senderId !== currentUserId ? '#10b981' : '#888',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px', fontStyle: friend.latestMessage?.type.includes('EPHEMERAL') ? 'italic' : 'normal',
                                                fontWeight: friend.latestMessage && !friend.latestMessage.readAt && friend.latestMessage.senderId !== currentUserId ? 'bold' : 'normal'
                                            }}>
                                                {friend.latestMessage
                                                    ? (friend.latestMessage.type.includes('EPHEMERAL') ? '🔥 Disappearing message' : (friend.latestMessage.content || 'Media message'))
                                                    : 'Start a conversation'}
                                            </div>
                                        </div>
                                    </Link>
                                    <Link
                                        href={`/dashboard/chat/${friend.id}`}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(20, 184, 166, 0.12)',
                                            border: '1px solid rgba(20, 184, 166, 0.25)',
                                            color: '#14b8a6',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textDecoration: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Go to Chat"
                                    >
                                        <MessageSquare size={18} />
                                    </Link>
                                </div>
                            ))}
                            {filteredFriends.length === 0 && (
                                <p style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '0.88rem' }}>
                                    {searchQuery ? 'No matching connections found.' : 'No connections added yet.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
