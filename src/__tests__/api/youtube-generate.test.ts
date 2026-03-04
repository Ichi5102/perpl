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

    it('should fallback to second key when first key returns 403', async () => {
        process.env.YOUTUBE_API_KEYS = 'key-exhausted,key-working';
        delete process.env.YOUTUBE_API_KEY;

        const mockSuccess = {
            data: {
                items: [{
                    id: { videoId: 'vid1' },
                    snippet: { title: 'Song', thumbnails: { default: { url: 'http://img.jpg' } } },
                }],
            },
        };

        vi.mocked(axios.get)
            .mockRejectedValueOnce({ response: { status: 403, data: { error: { message: 'quotaExceeded' } } } })
            .mockResolvedValueOnce(mockSuccess);

        const res = await callRoute({
            artists: [{ name: 'Artist' }],
            durationMinutes: 10,
        });

        expect(res.status).toBe(200);
        // First call used exhausted key, second call used working key
        expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2);
        const firstUrl = vi.mocked(axios.get).mock.calls[0][0];
        const secondUrl = vi.mocked(axios.get).mock.calls[1][0];
        expect(firstUrl).toContain('key=key-exhausted');
        expect(secondUrl).toContain('key=key-working');
    });

    it('should return error when ALL keys are exhausted (403)', async () => {
        process.env.YOUTUBE_API_KEYS = 'key1-dead,key2-dead';
        delete process.env.YOUTUBE_API_KEY;

        vi.mocked(axios.get)
            .mockRejectedValue({ response: { status: 403, data: { error: { message: 'quotaExceeded' } } } });

        const res = await callRoute({
            artists: [{ name: 'Artist' }],
            durationMinutes: 10,
        });

        // All keys exhausted → error with quota message
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('quotaExceeded');
    });

    it('should read YOUTUBE_API_KEYS (comma-separated) over YOUTUBE_API_KEY', async () => {
        process.env.YOUTUBE_API_KEYS = 'primary-key,secondary-key';
        process.env.YOUTUBE_API_KEY = 'old-single-key'; // should be ignored

        vi.mocked(axios.get).mockResolvedValue({
            data: {
                items: [{
                    id: { videoId: 'vid1' },
                    snippet: { title: 'Song', thumbnails: { default: { url: '' } } },
                }],
            },
        });

        const res = await callRoute({
            artists: [{ name: 'Test' }],
            durationMinutes: 10,
        });

        expect(res.status).toBe(200);
        const calledUrl = vi.mocked(axios.get).mock.calls[0][0];
        expect(calledUrl).toContain('key=primary-key');
        expect(calledUrl).not.toContain('old-single-key');
    });

    it('should handle 429 rate limit by trying next key', async () => {
        process.env.YOUTUBE_API_KEYS = 'rate-limited-key,backup-key';
        delete process.env.YOUTUBE_API_KEY;

        vi.mocked(axios.get)
            .mockRejectedValueOnce({ response: { status: 429, data: {} } })
            .mockResolvedValueOnce({
                data: {
                    items: [{
                        id: { videoId: 'v1' },
                        snippet: { title: 'Song', thumbnails: { default: { url: '' } } },
                    }],
                },
            });

        const res = await callRoute({
            artists: [{ name: 'Artist' }],
            durationMinutes: 10,
        });

        expect(res.status).toBe(200);
        expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(2);
    });
});
