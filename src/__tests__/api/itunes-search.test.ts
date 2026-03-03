import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
    },
}));

import axios from 'axios';

describe('/api/itunes/search', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    async function callRoute(term?: string) {
        const { GET } = await import('@/app/api/itunes/search/route');
        const url = term
            ? `http://localhost/api/itunes/search?term=${encodeURIComponent(term)}`
            : 'http://localhost/api/itunes/search';
        const request = new Request(url, { method: 'GET' });
        return GET(request);
    }

    it('should return empty results when term is missing', async () => {
        const res = await callRoute();
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.results).toEqual([]);
    });

    it('should return empty results when term is whitespace', async () => {
        const res = await callRoute('   ');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.results).toEqual([]);
    });

    it('should proxy iTunes API and return unique artist names', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                results: [
                    { artistName: 'Aimer' },
                    { artistName: 'YOASOBI' },
                    { artistName: 'Aimer' }, // duplicate
                ],
            },
        });

        const res = await callRoute('aimer');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.results).toEqual(['Aimer', 'YOASOBI']);

        // Verify it called the iTunes API via server, not exposing client
        const calledUrl = vi.mocked(axios.get).mock.calls[0][0];
        expect(calledUrl).toContain('itunes.apple.com');
        expect(calledUrl).toContain('aimer');
    });

    it('should handle iTunes API errors gracefully', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'));

        const res = await callRoute('test');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.results).toEqual([]);
    });
});
