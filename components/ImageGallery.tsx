'use client';
import { useState } from 'react';
import styles from '../app/dashboard/profile/[id]/page.module.css';

interface Frame {
    id: string;
    imageUrl: string;
    timestamp: string | Date;
    username?: string;
}

export default function ImageGallery({ frames: initialFrames }: { frames: Frame[] }) {
    const [frames, setFrames] = useState(initialFrames);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    if (!frames || frames.length === 0) return null;

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === frames.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(frames.map(f => f.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} images?`)) return;

        setIsDeleting(true);
        try {
            const res = await fetch('/api/admin/frames', {
                method: 'DELETE',
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                setFrames(prev => prev.filter(f => !selectedIds.has(f.id)));
                setSelectedIds(new Set());
            } else {
                alert('Failed to delete images');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting images');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.infoCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className={styles.cardTitle} style={{ margin: 0 }}>📸 Captured Frames ({frames.length})</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleSelectAll}
                        style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}
                    >
                        {selectedIds.size === frames.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px' }}
                        >
                            {isDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.framesGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {frames.map((f) => (
                    <div
                        key={f.id}
                        className={styles.frameThumb}
                        style={{ position: 'relative', height: '120px', overflow: 'hidden', borderRadius: '8px', border: selectedIds.has(f.id) ? '2px solid #10b981' : '1px solid #333' }}
                    >
                        <div
                            style={{ position: 'absolute', top: 5, left: 5, zIndex: 10 }}
                            onClick={(e) => { e.stopPropagation(); handleSelect(f.id); }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.has(f.id)}
                                onChange={() => handleSelect(f.id)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                        </div>
                        <img
                            src={f.imageUrl}
                            alt="Captured Frame"
                            onClick={() => setSelectedImage(f.imageUrl)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                            loading="lazy"
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.username && <span style={{ display: 'block', fontWeight: 'bold' }}>{f.username}</span>}
                            {new Date(f.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {selectedImage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                    onClick={() => setSelectedImage(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                        <img
                            src={selectedImage}
                            alt="Full Screen"
                            style={{ maxWidth: '100%', maxHeight: '90vh', boxShadow: '0 0 20px rgba(0,0,0,0.5)', borderRadius: '4px' }}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                            style={{
                                position: 'absolute',
                                top: '-40px',
                                right: '-40px',
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontSize: '30px',
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
