import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Track {
    id: string; // YouTube Video ID
    title: string;
    artist: string;
    thumbnailUrl: string;
    durationString?: string;
}

export interface ArtistInfo {
    id: string;
    name: string;
    color: string;
}

export interface PlaylistHistoryItem {
    id: string;
    artists: ArtistInfo[];
    duration: string;
    timestamp: number;
}

interface PlayerState {
    // Current Playback
    currentTrack: Track | null;
    isPlaying: boolean;

    // Queue Management
    queue: Track[];
    history: Track[]; // Previously played tracks

    isInfinite: boolean;
    infiniteArtists: string[];

    // History Features
    artistHistory: string[];
    playlistHistory: PlaylistHistoryItem[];
    addArtistHistory: (name: string) => void;
    clearArtistHistory: () => void;
    addPlaylistHistory: (artists: ArtistInfo[], duration: string) => void;

    // Actions
    setCurrentTrack: (track: Track) => void;
    play: () => void;
    pause: () => void;
    togglePlay: () => void;

    addToQueue: (track: Track) => void;
    addTracksToQueue: (tracks: Track[]) => void;
    removeFromQueue: (index: number) => void;
    clearQueue: () => void;
    shuffleQueue: () => void;
    setQueue: (tracks: Track[], isInfinite?: boolean, artists?: string[]) => void;

    nextTrack: () => void;
    prevTrack: () => void;
    skipToTrack: (index: number) => void;

    // Reset UI Triggers
    resetCreatorTrigger: number;
    triggerCreatorReset: () => void;
}

export const usePlayerStore = create<PlayerState>()(
    persist(
        (set, get) => ({
            currentTrack: null,
            isPlaying: false,
            queue: [],
            history: [],
            isInfinite: false,
            infiniteArtists: [],

            artistHistory: [],
            playlistHistory: [],

            resetCreatorTrigger: 0,

            setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true }),
            play: () => set({ isPlaying: true }),
            pause: () => set({ isPlaying: false }),
            togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

            addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
            addTracksToQueue: (tracks) => set((state) => ({ queue: [...state.queue, ...tracks] })),
            removeFromQueue: (index) => set((state) => ({
                queue: state.queue.filter((_, i) => i !== index)
            })),
            clearQueue: () => set({ queue: [], currentTrack: null, isPlaying: false, isInfinite: false, infiniteArtists: [] }),
            shuffleQueue: () => set((state) => {
                const shuffled = [...state.queue];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return { queue: shuffled };
            }),
            setQueue: (tracks, isInfinite = false, artists = []) => set({
                queue: tracks,
                isInfinite,
                infiniteArtists: artists
            }),

            addArtistHistory: (name) => set((state) => {
                const newHistory = [name, ...state.artistHistory.filter(n => n !== name)].slice(0, 20);
                return { artistHistory: newHistory };
            }),

            clearArtistHistory: () => set({ artistHistory: [] }),

            addPlaylistHistory: (artists, duration) => set((state) => {
                const newItem: PlaylistHistoryItem = {
                    id: Date.now().toString() + Math.random().toString(36).substring(7),
                    artists,
                    duration,
                    timestamp: Date.now()
                };
                return { playlistHistory: [newItem, ...state.playlistHistory].slice(0, 10) };
            }),

            nextTrack: () => {
                const { queue, currentTrack, history } = get();

                // If queue is empty, stop playback and unset the track to return UI to normal
                if (queue.length === 0) {
                    set({ currentTrack: null, isPlaying: false });
                    return;
                }

                const next = queue[0];
                const newQueue = queue.slice(1);
                const newHistory = currentTrack ? [...history, currentTrack] : history;

                set({
                    currentTrack: next,
                    queue: newQueue,
                    history: newHistory,
                    isPlaying: true,
                });
            },

            prevTrack: () => {
                const { currentTrack, history, queue } = get();
                if (history.length === 0) return; // At start

                const prev = history[history.length - 1];
                const newHistory = history.slice(0, -1);
                const newQueue = currentTrack ? [currentTrack, ...queue] : queue;

                set({
                    currentTrack: prev,
                    queue: newQueue,
                    history: newHistory,
                    isPlaying: true,
                });
            },

            skipToTrack: (index) => {
                const { queue, currentTrack, history } = get();
                if (index < 0 || index >= queue.length) return;

                const skippedTracks = queue.slice(0, index);
                const target = queue[index];
                const newQueue = queue.slice(index + 1);
                const newHistory = currentTrack
                    ? [...history, currentTrack, ...skippedTracks]
                    : [...history, ...skippedTracks];

                set({
                    currentTrack: target,
                    queue: newQueue,
                    history: newHistory,
                    isPlaying: true,
                });
            },

            triggerCreatorReset: () => set((state) => ({ resetCreatorTrigger: state.resetCreatorTrigger + 1 })),
        }),
        {
            name: 'perpl-player-storage',
            partialize: (state) => ({
                currentTrack: state.currentTrack,
                queue: state.queue,
                history: state.history,
                isInfinite: state.isInfinite,
                infiniteArtists: state.infiniteArtists,
                artistHistory: state.artistHistory,
                playlistHistory: state.playlistHistory
            }), // Persist these fields across page reloads
        }
    )
);
