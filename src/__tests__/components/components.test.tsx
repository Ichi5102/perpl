import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock dependencies that are hard to render in test environment
vi.mock('react-youtube', () => ({
    __esModule: true,
    default: () => <div data-testid="youtube-player">YouTube Mock</div>,
}));

vi.mock('@/components/effects/BrownianMotionCanvas', () => ({
    BrownianMotionCanvas: () => <canvas data-testid="canvas-mock" />,
}));

vi.mock('@/store/useSettingsStore', () => ({
    useSettingsStore: () => ({
        volume: 50,
        locale: 'en',
        setVolume: vi.fn(),
        setLocale: vi.fn(),
    }),
}));

vi.mock('@/store/usePlayerStore', () => {
    const store = {
        currentTrack: null,
        isPlaying: false,
        queue: [],
        history: [],
        isInfinite: false,
        infiniteArtists: [],
        artistHistory: [],
        playlistHistory: [],
        resetCreatorTrigger: 0,
        setCurrentTrack: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        togglePlay: vi.fn(),
        setQueue: vi.fn(),
        nextTrack: vi.fn(),
        prevTrack: vi.fn(),
        clearQueue: vi.fn(),
        shuffleQueue: vi.fn(),
        removeFromQueue: vi.fn(),
        addToQueue: vi.fn(),
        addTracksToQueue: vi.fn(),
        addArtistHistory: vi.fn(),
        clearArtistHistory: vi.fn(),
        addPlaylistHistory: vi.fn(),
        triggerCreatorReset: vi.fn(),
    };
    return {
        usePlayerStore: () => store,
        __mockStore: store,
    };
});

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

describe('SettingsTile', () => {
    it('should NOT render YouTube API Key input field', async () => {
        const { SettingsTile } = await import('@/components/dashboard/SettingsTile');
        render(<SettingsTile />);

        // Wait for mounted state
        await vi.waitFor(() => {
            expect(screen.getByText('Settings')).toBeInTheDocument();
        });

        // Volume should still be present
        expect(screen.getByText('Volume')).toBeInTheDocument();

        // API Key input should NOT exist
        expect(screen.queryByText('YouTube API Key')).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText('AIzaSy...')).not.toBeInTheDocument();
    });
});

describe('PlaylistCreatorTile', () => {
    it('should render without API Key dependency', async () => {
        const { PlaylistCreatorTile } = await import('@/components/dashboard/PlaylistCreatorTile');
        render(<PlaylistCreatorTile />);

        await vi.waitFor(() => {
            expect(screen.getByText('Create Playlist')).toBeInTheDocument();
        });

        // Should NOT show "YouTube API Key Missing" warning
        expect(screen.queryByText('YouTube API Key Missing')).not.toBeInTheDocument();

        // Input should be enabled (not disabled due to missing API key)
        const input = screen.getByPlaceholderText('Type artist name...');
        expect(input).not.toBeDisabled();
    });
});

describe('HistoryTile', () => {
    it('should render without API Key dependency', async () => {
        const { HistoryTile } = await import('@/components/dashboard/HistoryTile');
        render(<HistoryTile />);

        await vi.waitFor(() => {
            expect(screen.getByText('History')).toBeInTheDocument();
        });

        // Should show empty state (no history items)
        expect(screen.getByText('No History')).toBeInTheDocument();
    });
});
