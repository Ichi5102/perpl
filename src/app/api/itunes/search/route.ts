import { NextResponse } from 'next/server';
import axios from 'axios';

// === Rate Limiting ===
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30; // More lenient for autocomplete
const requestLog = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = requestLog.get(ip);

    if (!entry || now > entry.resetTime) {
        requestLog.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// === Constants ===
const MAX_TERM_LENGTH = 100;

export async function GET(req: Request) {
    try {
        // --- Rate Limiting ---
        const ip = req.headers.get('cf-connecting-ip')
            || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || 'unknown';

        if (isRateLimited(ip)) {
            return NextResponse.json({ results: [] }, { status: 429 });
        }

        const { searchParams } = new URL(req.url);
        const term = searchParams.get('term');

        if (!term || !term.trim()) {
            return NextResponse.json({ results: [] });
        }

        // --- Input Validation ---
        const safeTerm = term.trim().slice(0, MAX_TERM_LENGTH);

        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(safeTerm)}&entity=musicArtist&limit=5&country=JP`;
        const response = await axios.get(url);

        if (response.data && response.data.results) {
            const names: string[] = response.data.results
                .map((res: any) => res.artistName)
                .filter((name: string) => name);

            // Remove duplicates
            const uniqueNames = [...new Set(names)];
            return NextResponse.json({ results: uniqueNames });
        }

        return NextResponse.json({ results: [] });
    } catch (error: any) {
        console.error('iTunes API Error:', error.message);
        return NextResponse.json({ results: [] });
    }
}
