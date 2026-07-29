import { NextResponse } from 'next/server';

interface RateLimitStore {
    [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const key in store) {
        if (store[key].resetTime <= now) {
            delete store[key];
        }
    }
}, 5 * 60 * 1000);

export function checkRateLimit(identifier: string, maxRequests: number = 20, windowMs: number = 60 * 1000): NextResponse | null {
    const now = Date.now();
    const entry = store[identifier];

    if (!entry || entry.resetTime <= now) {
        store[identifier] = {
            count: 1,
            resetTime: now + windowMs,
        };
        return null;
    }

    if (entry.count >= maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return NextResponse.json(
            { error: `Too many requests. Please try again in ${retryAfter} seconds.` },
            {
                status: 429,
                headers: { 'Retry-After': String(retryAfter) }
            }
        );
    }

    entry.count += 1;
    return null;
}
