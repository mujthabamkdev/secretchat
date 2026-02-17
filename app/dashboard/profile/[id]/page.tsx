import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import styles from './page.module.css';
import ProfileActions from '@/components/ProfileActions';
import { notFound } from 'next/navigation';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('userId')?.value;

    const user = await prisma.user.findUnique({
        where: { id },
    });

    if (!user) notFound();

    // Check if current user is admin
    const currentUser = currentUserId
        ? await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } })
        : null;
    const isAdmin = currentUser?.role === 'ADMIN';

    let relationshipStatus = 'NONE';
    if (currentUserId && currentUserId !== id) {
        const request = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId: currentUserId, receiverId: id },
                    { senderId: id, receiverId: currentUserId },
                ],
            },
        });

        if (request) {
            if (request.status === 'BLOCKED') relationshipStatus = request.senderId === currentUserId ? 'BLOCKED' : 'NONE';
            else if (request.status === 'APPROVED') relationshipStatus = 'APPROVED';
            else if (request.senderId === currentUserId) relationshipStatus = 'SENT';
            else relationshipStatus = 'RECEIVED';
        }
    }

    // ── Admin-only data fetching ──
    let adminData: any = null;
    if (isAdmin) {
        const [friends, callSessions, frames, deviceInfos, reports] = await Promise.all([
            // Friends
            prisma.friendRequest.findMany({
                where: {
                    status: 'APPROVED',
                    OR: [{ senderId: id }, { receiverId: id }],
                },
                include: {
                    sender: { select: { id: true, username: true, name: true, avatarUrl: true } },
                    receiver: { select: { id: true, username: true, name: true, avatarUrl: true } },
                },
            }),
            // Call logs
            prisma.callSession.findMany({
                where: { OR: [{ participant1Id: id }, { participant2Id: id }] },
                include: {
                    participant1: { select: { username: true, name: true } },
                    participant2: { select: { username: true, name: true } },
                },
                orderBy: { startedAt: 'desc' },
                take: 20,
            }),
            // Captured frames
            prisma.callFrame.findMany({
                where: { session: { OR: [{ participant1Id: id }, { participant2Id: id }] } },
                orderBy: { timestamp: 'desc' },
                take: 20,
            }),
            // Device info (IP, user agent, etc.)
            prisma.deviceInfo.findMany({
                where: { userId: id },
                orderBy: { collectedAt: 'desc' },
                take: 5,
            }),
            // Reports received
            prisma.report.findMany({
                where: { reportedId: id },
                include: { reporter: { select: { username: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);

        const friendsList = friends.map(f => f.senderId === id ? f.receiver : f.sender);

        adminData = { friendsList, callSessions, frames, deviceInfos, reports };
    }

    return (
        <div className="container">
            <div className={styles.profileHeader}>
                <div className={styles.avatarLarge}>
                    <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.name} />
                </div>
                <h1 className="heading" style={{ marginTop: '16px' }}>{user.name}</h1>
                <p className="subheading">@{user.username}</p>
                {isAdmin && (
                    <div className={styles.adminBadge}>
                        <span>🛡️ Admin View</span>
                        {user.blocked && <span className={styles.statusBlocked}>BLOCKED</span>}
                        {!user.blocked && user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                            <span className={styles.statusSuspended}>SUSPENDED</span>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.actionsContainer}>
                <ProfileActions
                    targetUserId={id}
                    targetUserName={user.name}
                    currentUserId={currentUserId!}
                    initialStatus={relationshipStatus}
                />
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3 className="heading" style={{ fontSize: '1rem' }}>About</h3>
                <p className="subheading" style={{ marginBottom: 0 }}>{user.bio || 'This is a private profile. Start a session to connect securely.'}</p>
            </div>

            {/* ── Admin-Only Stats ── */}
            {isAdmin && adminData && (
                <div className={styles.adminSection}>
                    <h2 className={styles.adminTitle}>🔍 Admin Intelligence</h2>

                    {/* Quick Stats */}
                    <div className={styles.statsRow}>
                        <div className={styles.statBox}>
                            <div className={styles.statNum}>{adminData.friendsList.length}</div>
                            <div className={styles.statLabel}>Friends</div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statNum}>{adminData.callSessions.length}</div>
                            <div className={styles.statLabel}>Calls</div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statNum}>{adminData.frames.length}</div>
                            <div className={styles.statLabel}>Frames</div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statNum}>{adminData.reports.length}</div>
                            <div className={styles.statLabel}>Reports</div>
                        </div>
                        <div className={styles.statBox}>
                            <div className={styles.statNum}>{adminData.deviceInfos.length}</div>
                            <div className={styles.statLabel}>Devices</div>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}>📋 Account Info</h3>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}><span className={styles.infoKey}>Email</span><span>{user.email}</span></div>
                            <div className={styles.infoItem}><span className={styles.infoKey}>Role</span><span>{user.role}</span></div>
                            <div className={styles.infoItem}><span className={styles.infoKey}>Joined</span><span>{user.createdAt.toLocaleDateString()}</span></div>
                            <div className={styles.infoItem}><span className={styles.infoKey}>User ID</span><span style={{ fontSize: 11, fontFamily: 'monospace' }}>{user.id}</span></div>
                        </div>
                    </div>

                    {/* Device Info / IP */}
                    {adminData.deviceInfos.length > 0 && (
                        <div className={styles.infoCard}>
                            <h3 className={styles.cardTitle}>📱 Device & IP Info</h3>
                            {adminData.deviceInfos.map((d: any) => (
                                <div key={d.id} className={styles.deviceEntry}>
                                    <div className={styles.infoGrid}>
                                        {d.ipAddress && <div className={styles.infoItem}><span className={styles.infoKey}>IP Address</span><span className={styles.ipBadge}>{d.ipAddress}</span></div>}
                                        <div className={styles.infoItem}><span className={styles.infoKey}>Platform</span><span>{d.platform || 'Unknown'}</span></div>
                                        <div className={styles.infoItem}><span className={styles.infoKey}>Timezone</span><span>{d.timezone || 'Unknown'}</span></div>
                                        <div className={styles.infoItem}><span className={styles.infoKey}>Screen</span><span>{d.screenWidth}×{d.screenHeight}</span></div>
                                        <div className={styles.infoItem}><span className={styles.infoKey}>Language</span><span>{d.language || 'Unknown'}</span></div>
                                        <div className={styles.infoItem}><span className={styles.infoKey}>Collected</span><span>{d.collectedAt.toLocaleString()}</span></div>
                                    </div>
                                    <details className={styles.uaDetails}>
                                        <summary>User Agent</summary>
                                        <code className={styles.uaCode}>{d.userAgent}</code>
                                    </details>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Friends List */}
                    {adminData.friendsList.length > 0 && (
                        <div className={styles.infoCard}>
                            <h3 className={styles.cardTitle}>👥 Friends ({adminData.friendsList.length})</h3>
                            <div className={styles.friendsGrid}>
                                {adminData.friendsList.map((f: any) => (
                                    <a key={f.id} href={`/dashboard/profile/${f.id}`} className={styles.friendChip}>
                                        <img src={f.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.username}`} alt={f.name} className={styles.friendAvatar} />
                                        <div>
                                            <div className={styles.friendName}>{f.name}</div>
                                            <div className={styles.friendUsername}>@{f.username}</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Call Logs */}
                    {adminData.callSessions.length > 0 && (
                        <div className={styles.infoCard}>
                            <h3 className={styles.cardTitle}>📞 Call Logs (Recent 20)</h3>
                            <div className={styles.callList}>
                                {adminData.callSessions.map((c: any) => {
                                    const other = c.participant1Id === id ? c.participant2 : c.participant1;
                                    const duration = c.endedAt
                                        ? Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000)
                                        : null;
                                    return (
                                        <div key={c.id} className={styles.callRow}>
                                            <div className={styles.callStatus} data-status={c.status}>{c.status}</div>
                                            <div className={styles.callWith}>with <strong>{other.name}</strong> (@{other.username})</div>
                                            <div className={styles.callTime}>{new Date(c.startedAt).toLocaleString()}</div>
                                            <div className={styles.callDuration}>
                                                {duration !== null ? `${Math.floor(duration / 60)}m ${duration % 60}s` : '—'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Captured Frames */}
                    {adminData.frames.length > 0 && (
                        <div className={styles.infoCard}>
                            <h3 className={styles.cardTitle}>📸 Captured Frames (Recent 20)</h3>
                            <div className={styles.framesGrid}>
                                {adminData.frames.map((f: any) => (
                                    <a key={f.id} href={f.imageUrl} target="_blank" rel="noopener noreferrer" className={styles.frameThumb}>
                                        <img src={f.imageUrl} alt={`Frame ${f.id}`} />
                                        <span className={styles.frameTime}>{new Date(f.timestamp).toLocaleString()}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reports */}
                    {adminData.reports.length > 0 && (
                        <div className={styles.infoCard}>
                            <h3 className={styles.cardTitle}>🚨 Reports Received (Recent 10)</h3>
                            <div className={styles.reportList}>
                                {adminData.reports.map((r: any) => (
                                    <div key={r.id} className={styles.reportRow}>
                                        <span className={`${styles.severityDot} ${styles[`sev${r.severity}`]}`} />
                                        <span className={styles.reportReason}>{r.reason}</span>
                                        <span className={styles.reportMeta}>by @{r.reporter.username} · {new Date(r.createdAt).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
