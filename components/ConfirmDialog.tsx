'use client';
import { AlertTriangle, Info } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

interface Props {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true, onConfirm, onCancel }: Props) {
    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                <div className={`${styles.icon} ${danger ? styles.iconDanger : styles.iconNeutral}`}>
                    {danger ? <AlertTriangle size={24} color="#ef4444" /> : <Info size={24} color="#3b82f6" />}
                </div>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button onClick={onCancel} className={styles.cancelBtn}>{cancelLabel}</button>
                    <button onClick={onConfirm} className={`${styles.confirmBtn} ${danger ? styles.confirmDanger : ''}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
