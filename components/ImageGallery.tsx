'use client';
import { useState } from 'react';
import styles from '../app/dashboard/profile/[id]/page.module.css';

interface Frame {
    id: string;
    imageUrl: string;
    timestamp: string | Date;
}

export default function ImageGallery({ frames }: { frames: Frame[] }) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    if (!frames || frames.length === 0) return null;

    return (
        <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>📸 Captured Frames (Recent 20)</h3>
            <div className={styles.framesGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                {frames.map((f) => (
                    <div
                        key={f.id}
                        className={styles.frameThumb}
                        onClick={() => setSelectedImage(f.imageUrl)}
                        style={{ cursor: 'pointer', position: 'relative', height: '100px', overflow: 'hidden', borderRadius: '8px', border: '1px solid #333' }}
                    >
                        <img
                            src={f.imageUrl}
                            alt="Captured Frame"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
