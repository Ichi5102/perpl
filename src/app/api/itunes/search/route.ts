import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const term = searchParams.get('term');

        if (!term || !term.trim()) {
            return NextResponse.json({ results: [] });
        }

        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=musicArtist&limit=5&country=JP`;
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
