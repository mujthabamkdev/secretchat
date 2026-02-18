'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function ClientSearch({ initialQuery }: { initialQuery: string }) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query !== initialQuery) {
                router.push(`/dashboard?q=${query}`);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [query, router, initialQuery]);

    return (
        <form className={styles.searchForm} onSubmit={(e) => e.preventDefault()}>
            <input
                type="text"
                name="q"
                placeholder="Search by name or username..."
                className={styles.searchInput}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: '#fff' }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
            />
        </form>
    );
}
