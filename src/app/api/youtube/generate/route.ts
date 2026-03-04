import { NextResponse } from 'next/server';
import axios from 'axios';

// Estimate 4 mins per song on average to calculate track count
const AVG_SONG_DURATION_MINUTES = 4;

// === Rate Limiting ===
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;   // max 10 requests per minute per IP
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

// === Input Sanitization ===
function sanitizeString(input: string): string {
    return input
        .replace(/[<>'"&]/g, '') // Remove HTML-significant characters
        .trim()
        .slice(0, 200); // Max 200 characters
}

// === Validation Constants ===
const MAX_DURATION_MINUTES = 120;
const MAX_ARTISTS = 10;
const MAX_ARTIST_NAME_LENGTH = 200;

/**
 * 環境変数からAPIキーの配列を取得する。
 * YOUTUBE_API_KEYS (カンマ区切り) を優先し、なければ YOUTUBE_API_KEY を使用。
 */
function getApiKeys(): string[] {
    const keysStr = process.env.YOUTUBE_API_KEYS;
    if (keysStr) {
        return keysStr.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    const singleKey = process.env.YOUTUBE_API_KEY;
    if (singleKey) {
        return [singleKey.trim()];
    }
    return [];
}

/**
 * YouTube APIにリクエストを送信。403/429エラー時は次のキーにフォールバック。
 */
async function fetchYouTubeWithRotation(url: string, apiKeys: string[]): Promise<any> {
    let lastError: any = null;
    for (const key of apiKeys) {
        try {
            const fullUrl = `${url}&key=${key}`;
            const response = await axios.get(fullUrl);
            return response;
        } catch (err: any) {
            const status = err.response?.status;
            lastError = err;
            // 403 (Quota Exceeded / Forbidden) or 429 (Rate Limit) → try next key
            if (status === 403 || status === 429) {
                console.warn(`API key exhausted (HTTP ${status}), trying next key...`);
                continue;
            }
            // Other errors → throw immediately, no point retrying with another key
            throw err;
        }
    }
    // All keys exhausted
    throw lastError;
}

export async function POST(req: Request) {
    try {
        // --- Rate Limiting ---
        const ip = req.headers.get('cf-connecting-ip')
            || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || 'unknown';

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { artists, durationMinutes, trackCount } = body;
        const apiKeys = getApiKeys();

        if (apiKeys.length === 0) {
            return NextResponse.json({ error: 'YouTube API Key is not configured on the server.' }, { status: 500 });
        }

        if (!artists || !artists.length || (!durationMinutes && !trackCount)) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // --- Input Validation ---
        if (!Array.isArray(artists) || artists.length > MAX_ARTISTS) {
            return NextResponse.json(
                { error: `Too many artists. Maximum is ${MAX_ARTISTS}.` },
                { status: 400 }
            );
        }

        const safeDuration = Math.min(
            Math.max(1, Number(durationMinutes) || 30),
            MAX_DURATION_MINUTES
        );

        const totalTracksTarget = trackCount
            ? Math.min(Math.max(1, Number(trackCount)), 50)
            : Math.ceil(safeDuration / AVG_SONG_DURATION_MINUTES);
        const tracksPerArtist = Math.ceil(totalTracksTarget / artists.length);
        let allTracks: any[] = [];
        let lastApiError: string | null = null;

        // Fetch popular tracks for each artist from YouTube
        for (const artist of artists) {
            try {
                // Sanitize artist name
                const artistName = sanitizeString(String(artist.name || ''));
                if (!artistName) continue;

                const query = encodeURIComponent(`${artistName} official music video`);
                const baseUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoCategoryId=10&maxResults=${Math.min(tracksPerArtist + 5, 25)}`;
                const response = await fetchYouTubeWithRotation(baseUrl, apiKeys);

                const items = response.data?.items || [];
                if (items.length === 0) {
                    console.log(`No videos found for artist: ${artistName}`);
                    continue;
                }

                const tracks = items.map((item: any) => ({
                    id: item.id?.videoId || "",
                    title: sanitizeString(String(item.snippet?.title || "Unknown Title")),
                    artist: artistName,
                    thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
                })).filter((t: any) => t.id); // Ensure we actually have an ID

                // Shuffle tracks and take the required amount
                const shuffledTracks = tracks.sort(() => 0.5 - Math.random()).slice(0, tracksPerArtist);
                allTracks = [...allTracks, ...shuffledTracks];
            } catch (err: any) {
                lastApiError = err.response?.data?.error?.message || err.message;
                console.error(`Error fetching YouTube data for artist:`, err.response?.status || err.message);
                // Continue to the next artist if one fails
            }
        }

        if (allTracks.length === 0) {
            if (lastApiError) {
                // Don't expose internal API error details
                return NextResponse.json(
                    { error: 'Failed to fetch videos. Please try again.' },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: 'Could not find any videos for the selected artists.' },
                { status: 404 }
            );
        }

        // Final shuffle to blend artists
        const playlist = allTracks.sort(() => 0.5 - Math.random());

        return NextResponse.json({ playlist });
    } catch (error: any) {
        console.error('YouTube API Generic Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to generate playlist.' },
            { status: 500 }
        );
    }
}
