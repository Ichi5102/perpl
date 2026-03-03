import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
    },
}));

import axios from 'axios';

describe('/api/youtube/generate', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    async function callRoute(body: object) {
        // Dynamic import to pick up fresh env each time
        const { POST } = await import('@/app/api/youtube/generate/route');
        const request = new Request('http://localhost/api/youtube/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return POST(request);
    }

    it('should return 500 if YOUTUBE_API_KEY is not set', async () => {
        delete process.env.YOUTUBE_API_KEY;
        const res = await callRoute({ artists: [{ name: 'Test' }], durationMinutes: 30 });
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toContain('not configured');
    });

    it('should return 400 if artists are missing', async () => {
        process.env.YOUTUBE_API_KEY = 'test-key';
        const res = await callRoute({ durationMinutes: 30 });
        expect(res.status).toBe(400);
    });

    it('should return 400 if both durationMinutes and trackCount are missing', async () => {
        process.env.YOUTUBE_API_KEY = 'test-key';
        const res = await callRoute({ artists: [{ name: 'Test' }] });
        expect(res.status).toBe(400);
    });

    it('should call YouTube API with server-side key and return playlist', async () => {
        process.env.YOUTUBE_API_KEY = 'server-secret-key';

        const mockYouTubeResponse = {
            data: {
                items: [
                    {
                        id: { videoId: 'abc123' },
                        snippet: {
                            title: 'Test Song',
                            thumbnails: { high: { url: 'https://img.youtube.com/test.jpg' } },
                        },
                    },
                    {
                        id: { videoId: 'def456' },
                        snippet: {
                            title: 'Another Song',
                            thumbnails: { default: { url: 'https://img.youtube.com/test2.jpg' } },
                        },
                    },
                ],
            },
        };

        vi.mocked(axios.get).mockResolvedValue(mockYouTubeResponse);

        const res = await callRoute({
            artists: [{ name: 'TestArtist' }],
            durationMinutes: 30,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.playlist).toBeDefined();
        expect(data.playlist.length).toBeGreaterThan(0);
        expect(data.playlist[0].id).toBeTruthy();

        // Verify the API was called with the server-side key (not a client key)
        expect(vi.mocked(axios.get)).toHaveBeenCalled();
        const calledUrl = vi.mocked(axios.get).mock.calls[0][0];
        expect(calledUrl).toContain('key=server-secret-key');
    });

    it('should NOT accept apiKey from request body (ignored)', async () => {
        process.env.YOUTUBE_API_KEY = 'server-only-key';

        vi.mocked(axios.get).mockResolvedValue({
            data: {
                items: [{
                    id: { videoId: 'vid1' },
                    snippet: { title: 'Song', thumbnails: { default: { url: 'http://img.jpg' } } },
                }],
            },
        });

        const res = await callRoute({
            artists: [{ name: 'Artist' }],
            durationMinutes: 10,
            apiKey: 'client-leaked-key', // This should be IGNORED
        });

        expect(res.status).toBe(200);
        const calledUrl = vi.mocked(axios.get).mock.calls[0][0];
        expect(calledUrl).toContain('key=server-only-key');
        expect(calledUrl).not.toContain('client-leaked-key');
    });

    it('should return 404 when YouTube returns no items for any artist', async () => {
        process.env.YOUTUBE_API_KEY = 'test-key';
        vi.mocked(axios.get).mockResolvedValue({ data: { items: [] } });

        const res = await callRoute({
            artists: [{ name: 'UnknownArtist' }],
            durationMinutes: 30,
        });

        expect(res.status).toBe(404);
    });
});
