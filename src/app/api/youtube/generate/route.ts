import { NextResponse } from 'next/server';
import axios from 'axios';

// Estimate 4 mins per song on average to calculate track count
const AVG_SONG_DURATION_MINUTES = 4;

export async function POST(req: Request) {
    try {
        const { artists, durationMinutes, trackCount } = await req.json();
        const apiKey = process.env.YOUTUBE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'YouTube API Key is not configured on the server.' }, { status: 500 });
        }

        if (!artists || !artists.length || (!durationMinutes && !trackCount)) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const totalTracksTarget = trackCount ? trackCount : Math.ceil(durationMinutes / AVG_SONG_DURATION_MINUTES);
        const tracksPerArtist = Math.ceil(totalTracksTarget / artists.length);
        let allTracks: any[] = [];
        let lastApiError: string | null = null;

        // Fetch popular tracks for each artist from YouTube
        for (const artist of artists) {
            try {
                const query = encodeURIComponent(`${artist.name} official music video`);
                const response = await axios.get(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoCategoryId=10&maxResults=${tracksPerArtist + 5}&key=${apiKey}`
                );

                const items = response.data?.items || [];
                if (items.length === 0) {
                    console.log(`No videos found for artist: ${artist.name}`);
                    continue;
                }

                const tracks = items.map((item: any) => ({
                    id: item.id?.videoId || "",
                    title: item.snippet?.title || "Unknown Title",
                    artist: artist.name,
                    thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
                })).filter((t: any) => t.id); // Ensure we actually have an ID

                // Shuffle tracks and take the required amount
                const shuffledTracks = tracks.sort(() => 0.5 - Math.random()).slice(0, tracksPerArtist);
                allTracks = [...allTracks, ...shuffledTracks];
            } catch (err: any) {
                lastApiError = err.response?.data?.error?.message || err.message;
                console.error(`Error fetching YouTube data for ${artist.name}:`, err.response?.data || err.message);
                // Continue to the next artist if one fails
            }
        }

        if (allTracks.length === 0) {
            if (lastApiError) {
                return NextResponse.json(
                    { error: `YouTube API Error: ${lastApiError}` },
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
            { error: 'Failed to generate playlist from YouTube' },
            { status: 500 }
        );
    }
}
