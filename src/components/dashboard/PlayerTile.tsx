"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, ListMusic, Infinity, Trash2, Shuffle, Menu, X } from "lucide-react";
import YouTube, { YouTubeProps, YouTubePlayer } from "react-youtube";
import axios from "axios";
import { usePlayerStore, Track } from "@/store/usePlayerStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getTranslations } from "@/i18n";
import { ProgressBar } from "./ProgressBar";

export function PlayerTile() {
    const {
        currentTrack,
        isPlaying,
        queue,
        play,
        pause,
        togglePlay,
        nextTrack,
        prevTrack,
        clearQueue,
        shuffleQueue,
        triggerCreatorReset,
        skipToTrack
    } = usePlayerStore();

    const { volume, locale } = useSettingsStore();
    const tr = getTranslations(locale);

    const [player, setPlayer] = useState<YouTubePlayer | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
    const [isQueuePopupOpen, setIsQueuePopupOpen] = useState(false);

    // Infinite fetching state
    const [isFetchingInfinite, setIsFetchingInfinite] = useState(false);

    // Guard: prevents YouTube's internal paused(2) events from
    // polluting the store while we are programmatically loading a new video.
    const isTransitioningRef = useRef(false);

    // Store the ID of the last video we explicitly asked YouTube to load
    // This prevents React's useEffect from double-calling loadVideoById in background tabs
    const lastRequestedVideoIdRef = useRef<string | null>(null);

    // Keep volume in sync with store
    useEffect(() => {
        if (player && isPlayerReady) {
            try {
                if (typeof player.setVolume === 'function') {
                    player.setVolume(volume);
                }
            } catch (err) {
                console.warn("YouTube player.setVolume error:", err);
            }
        }
    }, [volume, player, isPlayerReady]);

    // Handle React-Youtube Events
    const onReady: YouTubeProps['onReady'] = (event) => {
        setPlayer(event.target);
        setIsPlayerReady(true);
        try {
            if (typeof event.target.setVolume === 'function') {
                event.target.setVolume(volume);
            }
            // Auto-play on page load / reload (iOS support via cueVideoById)
            if (currentTrack?.id && typeof event.target.cueVideoById === 'function') {
                isTransitioningRef.current = true;
                lastRequestedVideoIdRef.current = currentTrack.id;
                event.target.cueVideoById(currentTrack.id);
                setNeedsTapToPlay(true);
            }
        } catch (err) {
            console.warn("YouTube player onReady init error:", err);
        }
    };

    const onStateChange: YouTubeProps['onStateChange'] = (event) => {
        // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
        if (event.data === 1) {
            // Video started playing — transition complete, sync store
            isTransitioningRef.current = false;
            setNeedsTapToPlay(false); // Reset overlay if autoplay succeeds
            if (!isPlaying) play();
        } else if (event.data === 2) {
            // Only sync user-initiated pause (not YouTube's internal pause during loading)
            if (!isTransitioningRef.current && isPlaying) {
                pause();
            }
        } else if (event.data === 0) {
            // Track ended
            isTransitioningRef.current = true;

            // Peek at next track and SYNCHRONOUSLY load it BEFORE updating Zustand.
            // This is crucial for surviving background tab throttling in modern browsers.
            const storeState = usePlayerStore.getState();
            if (storeState.queue.length > 0) {
                const nextTrackItem = storeState.queue[0];
                if (event.target && typeof event.target.loadVideoById === 'function') {
                    try {
                        lastRequestedVideoIdRef.current = nextTrackItem.id;
                        event.target.loadVideoById(nextTrackItem.id);
                    } catch { }
                }
            }

            // Now update the store (this may be delayed in a background tab, but media is already playing)
            nextTrack();
        } else if (event.data === 5) {
            // Video cued — attempt to play (may fail due to autoplay policy)
            // Do NOT call play() here. Let playing(1) handle the store sync.
            // Otherwise, if autoplay is blocked, the UI shows "playing" while video is paused.
            isTransitioningRef.current = false;
            try {
                if (typeof event.target.playVideo === 'function') {
                    event.target.playVideo();
                }
            } catch { }
            // Play might fail silently on iOS, show tap-to-play overlay just in case
            setNeedsTapToPlay(true);
        }
    };

    // Keep iframe state in sync with Zustand
    useEffect(() => {
        if (player && isPlayerReady) {
            try {
                // Sync Track ID
                if (currentTrack?.id) {
                    // Only load if we haven't already requested this ID to load
                    if (currentTrack.id !== lastRequestedVideoIdRef.current) {
                        isTransitioningRef.current = true;
                        lastRequestedVideoIdRef.current = currentTrack.id;
                        if (typeof player.loadVideoById === 'function') {
                            player.loadVideoById(currentTrack.id);
                        }
                    }
                }

                // Sync Play/Pause (only if not transitioning)
                if (!isTransitioningRef.current) {
                    if (isPlaying && typeof player.playVideo === 'function') {
                        player.playVideo();
                    } else if (!isPlaying && typeof player.pauseVideo === 'function') {
                        player.pauseVideo();
                    }
                }
            } catch (err) {
                console.warn("YouTube Player Sync Error:", err);
            }
        }
    }, [isPlaying, currentTrack, player, isPlayerReady]);

    // Infinite Playlist Logic
    const { isInfinite, infiniteArtists, addTracksToQueue, history } = usePlayerStore();

    // Use a ref to track the last pop count we successfully fetched for, to prevent duplicate fetches
    useEffect(() => {
        const fetchMoreTracks = async () => {
            // Only fetch if infinite mode is on, we have artists, an API key, and the queue is totally empty
            if (!isInfinite || infiniteArtists.length === 0 || isFetchingInfinite) return;
            if (queue.length > 0) return; // Wait until all tracks up next are played

            setIsFetchingInfinite(true);
            try {
                const apiArtists = infiniteArtists.map(name => ({ name }));
                const res = await axios.post("/api/youtube/generate", {
                    artists: apiArtists,
                    durationMinutes: 120, // Add 2 hours in batch
                });

                if (res?.data?.playlist && Array.isArray(res.data.playlist)) {
                    // Filter out tracks that are currently playing, or already played
                    const excludeIds = new Set([
                        currentTrack?.id,
                        ...history.map(t => t.id)
                    ]);

                    const potentialTracks: Track[] = res.data.playlist.map((t: Record<string, unknown>) => ({
                        id: String(t.id || ""),
                        title: String(t.title || tr.unknownTitle),
                        artist: String(t.artist || "Unknown Artist"),
                        thumbnailUrl: String(t.thumbnailUrl || ""),
                        durationString: t.durationString ? String(t.durationString) : undefined
                    })).filter((t: Track) => t.id && !excludeIds.has(t.id));

                    if (potentialTracks.length > 0) {
                        addTracksToQueue(potentialTracks);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch infinite track batch", err);
            } finally {
                setIsFetchingInfinite(false);
            }
        };

        // When queue length hits 0 (i.e. we are playing the very last track in the list)
        if (queue.length === 0 && isInfinite && currentTrack) {
            fetchMoreTracks();
        }
    }, [queue.length, isInfinite, isFetchingInfinite, infiniteArtists, currentTrack, history, addTracksToQueue, tr.unknownTitle]);

    const opts: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
        },
    };

    // Avoid Hydration Errors for persisted Zustand state
    const [mounted, setMounted] = useState(false);

    // Close menu when clicking outside
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => setMounted(true), []);
    if (!mounted) return <div className="glass-tile w-full h-full animate-pulse"></div>;

    const bgImage = currentTrack?.thumbnailUrl ? `url("${currentTrack.thumbnailUrl}")` : 'none';

    const handleTrackSelect = (index: number) => {
        skipToTrack(index);
        setIsQueuePopupOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="glass-tile w-full h-full p-6 relative overflow-hidden group hover:border-accent/50 transition-colors duration-300 flex flex-col md:flex-row gap-6">
            {/* Lightweight Background Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity duration-1000 z-0"
                style={{ backgroundImage: bgImage, filter: "blur(20px) saturate(1.3)", transform: "scale(1.3)" }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent"></div>
            </div>

            {/* Left: Player Section */}
            <div className="relative z-10 flex flex-col h-full flex-1 md:border-r border-white/10 md:pr-6">
                <h2 className="text-xl font-bold text-white mb-auto drop-shadow-sm flex items-center justify-between">
                    {tr.player}
                </h2>

                {/* Video Area */}
                <div className="flex-1 flex flex-col items-center justify-center my-4">
                    <div className="w-64 lg:w-[400px] aspect-video bg-black/80 rounded-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center overflow-hidden relative group-hover:shadow-2xl group-hover:shadow-accent/30 transition-shadow duration-500">
                        {currentTrack && currentTrack.id ? (
                            <div className="w-full h-full pointer-events-none opacity-80 z-10 relative">
                                {mounted && (
                                    <YouTube
                                        videoId={currentTrack?.id || ''}
                                        opts={opts}
                                        onReady={onReady}
                                        onStateChange={onStateChange}
                                        onError={(e) => console.error("YouTube Player errored:", e)}
                                        className="w-full h-full absolute inset-0 transform scale-[1.5]" // Scale to hide borders
                                        iframeClassName="w-full h-full"
                                    />
                                )}
                            </div>
                        ) : (
                            <span className="text-white/40 text-sm font-medium tracking-wide">{tr.noTrackSelected}</span>
                        )}

                        {/* Overlay to catch clicks and prevent pausing from iframe */}
                        <div className="absolute inset-0 z-20 cursor-pointer" onClick={togglePlay}></div>

                        {/* iOS Tap to Play Overlay */}
                        {needsTapToPlay && currentTrack?.id && (
                            <div
                                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer group/overlay transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (player && typeof player.playVideo === 'function') {
                                        player.playVideo();
                                    }
                                    setNeedsTapToPlay(false);
                                    play();
                                }}
                            >
                                <div className="p-4 rounded-full bg-accent/80 text-white shadow-lg group-hover/overlay:scale-110 transition-transform mb-2">
                                    <Play className="w-8 h-8 fill-current translate-x-0.5" />
                                </div>
                                <span className="text-white font-bold tracking-wide drop-shadow-md">{tr.tapToPlay}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center justify-center mt-auto pb-4 gap-4 w-full">
                    <ProgressBar player={player} isPlayerReady={isPlayerReady} isPlaying={isPlaying} />

                    <div className="flex flex-col items-center gap-1 text-center max-w-[90%]">
                        <h3 className="text-white font-semibold text-lg drop-shadow-md line-clamp-1 w-full" title={currentTrack?.title || tr.playerFallbackTitle}>
                            {currentTrack?.title || tr.playerFallbackTitle}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-1">{currentTrack?.artist || "Load a playlist to start"}</p>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={prevTrack}
                            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                        >
                            <SkipBack className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                // Call player API directly within user gesture context
                                // (useEffect is async and loses the gesture context, causing autoplay policy blocks)
                                if (player && isPlayerReady) {
                                    try {
                                        if (isPlaying) {
                                            player.pauseVideo();
                                        } else {
                                            player.playVideo();
                                        }
                                    } catch { }
                                }
                                togglePlay();
                            }}
                            disabled={!currentTrack || !currentTrack.id}
                            className="p-4 rounded-full bg-accent hover:bg-accent/80 transition-all transform hover:scale-105 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isPlaying ? (
                                <Pause className="w-7 h-7 text-white fill-current" />
                            ) : (
                                <Play className="w-7 h-7 text-white fill-current translate-x-0.5" />
                            )}
                        </button>
                        <button
                            onClick={nextTrack}
                            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                        >
                            <SkipForward className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile Up Next Controls */}
                    <div className="md:hidden flex items-center justify-center gap-6 mt-4 opacity-80">
                        <div className="p-2 rounded-full bg-white/5 flex items-center justify-center" title={isInfinite ? tr.infiniteModeActive : ""}>
                            <Infinity className={`w-5 h-5 transition-all duration-500 ${isInfinite ? 'text-accent brightness-150 drop-shadow-[0_0_8px_var(--accent)]' : 'text-gray-400 drop-shadow-none'}`} />
                        </div>
                        <button
                            onClick={() => setIsQueuePopupOpen(true)}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            <ListMusic className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Up Next Section (Desktop) */}
            <div className="relative z-10 hidden md:flex flex-col h-full w-full md:w-64 lg:w-80 shrink-0">
                <div className="flex items-center justify-between mb-4 relative" ref={menuRef}>
                    <h2 className="text-lg font-bold text-accent-foreground flex items-center gap-2">
                        <span>{tr.upNext}</span>
                        <ListMusic className="w-4 h-4 text-accent opacity-70" />
                    </h2>

                    <div className="flex items-center gap-1">
                        {/* Infinite Status Icon */}
                        <div className="p-1 relative z-20 flex items-center justify-center" title={isInfinite ? tr.infiniteModeActive : ""}>
                            <Infinity className={`w-5 h-5 transition-all duration-500 ${isInfinite ? 'text-accent brightness-150 drop-shadow-[0_0_8px_var(--accent)]' : 'text-black drop-shadow-none'}`} />
                        </div>

                        {/* Hamburger Menu */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative z-20"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Dropdown */}
                    {isMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-black/90 border border-white/10 rounded-xl shadow-2xl py-2 z-30 backdrop-blur-xl">
                            <button
                                onClick={() => {
                                    shuffleQueue();
                                    setIsMenuOpen(false);
                                }}
                                disabled={!queue || queue.length < 2}
                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <Shuffle className="w-4 h-4 text-gray-400 group-hover:text-accent transition-colors" />
                                {tr.shufflePlaylist}
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm(tr.confirmDelete)) {
                                        clearQueue();
                                        pause();
                                        triggerCreatorReset();
                                    }
                                    setIsMenuOpen(false);
                                }}
                                disabled={!currentTrack && (!queue || queue.length === 0)}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-3 transition-colors mt-1 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <Trash2 className="w-4 h-4 text-red-400/70 group-hover:text-red-400 transition-colors" />
                                {tr.deletePlaylist}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {!queue || !Array.isArray(queue) || queue.length === 0 ? (
                        <div className="text-gray-500 text-sm italic text-center mt-10">
                            Queue is empty
                        </div>
                    ) : (
                        queue.map((track, i) => {
                            if (!track || typeof track !== 'object') return null;
                            const trackId = track.id ? String(track.id) : `unknown-${i}`;
                            const title = track.title ? String(track.title) : tr.unknownTitle;
                            const artist = track.artist ? String(track.artist) : "Unknown Artist";
                            const thumb = track.thumbnailUrl ? String(track.thumbnailUrl) : "";

                            return (
                                <div key={`queue-${trackId}-${i}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/10 transition-colors group/item cursor-pointer" onClick={() => handleTrackSelect(i)}>
                                    <div className="w-12 h-10 bg-black/40 rounded-md shrink-0 flex flex-col items-center justify-center relative overflow-hidden outline outline-1 outline-white/10">
                                        {thumb && thumb.length > 5 ? (
                                            <img
                                                src={thumb}
                                                alt={title}
                                                className="w-full h-full object-cover opacity-80"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.src = '';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-[8px] text-gray-500">{tr.noImg}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-semibold text-white truncate group-hover/item:text-accent transition-colors">
                                            {title}
                                        </span>
                                        <div className="flex items-center text-[10px] text-gray-400 gap-2 mt-0.5">
                                            <span className="truncate">{artist}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Mobile Queue Popup */}
            {isQueuePopupOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsQueuePopupOpen(false)}></div>
                    <div className="glass-tile w-full max-h-[80vh] flex flex-col p-6 relative z-10 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4 relative" ref={menuRef}>
                            <h2 className="text-lg font-bold text-accent-foreground flex items-center gap-2">
                                <span>{tr.upNext}</span>
                                <ListMusic className="w-4 h-4 text-accent opacity-70" />
                            </h2>

                            <div className="flex items-center gap-1">
                                <div className="p-1 relative z-20 flex items-center justify-center" title={isInfinite ? tr.infiniteModeActive : ""}>
                                    <Infinity className={`w-5 h-5 transition-all duration-500 ${isInfinite ? 'text-accent brightness-150 drop-shadow-[0_0_8px_var(--accent)]' : 'text-gray-400'}`} />
                                </div>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative z-20"
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setIsQueuePopupOpen(false)}
                                    className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-2"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Dropdown Menu Mobile */}
                            {isMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-[#151515] border border-white/10 rounded-xl shadow-2xl py-2 z-30">
                                    <button
                                        onClick={() => {
                                            shuffleQueue();
                                            setIsMenuOpen(false);
                                        }}
                                        disabled={!queue || queue.length < 2}
                                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors disabled:opacity-50"
                                    >
                                        <Shuffle className="w-4 h-4 text-gray-400" />
                                        {tr.shufflePlaylist}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(tr.confirmDelete)) {
                                                clearQueue();
                                                pause();
                                                triggerCreatorReset();
                                            }
                                            setIsMenuOpen(false);
                                            setIsQueuePopupOpen(false);
                                        }}
                                        disabled={!currentTrack && (!queue || queue.length === 0)}
                                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-3 transition-colors mt-1 disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                        {tr.deletePlaylist}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {!queue || !Array.isArray(queue) || queue.length === 0 ? (
                                <div className="text-gray-500 text-sm italic text-center mt-10">
                                    Queue is empty
                                </div>
                            ) : (
                                queue.map((track, i) => {
                                    if (!track || typeof track !== 'object') return null;
                                    const trackId = track.id ? String(track.id) : `unknown-${i}`;
                                    const title = track.title ? String(track.title) : tr.unknownTitle;
                                    const artist = track.artist ? String(track.artist) : "Unknown Artist";
                                    const thumb = track.thumbnailUrl ? String(track.thumbnailUrl) : "";

                                    return (
                                        <div key={`queue-mobile-${trackId}-${i}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/10 transition-colors group/item cursor-pointer" onClick={() => handleTrackSelect(i)}>
                                            <div className="w-12 h-10 bg-black/40 rounded-md shrink-0 flex flex-col items-center justify-center relative overflow-hidden outline outline-1 outline-white/10">
                                                {thumb && thumb.length > 5 ? (
                                                    <img
                                                        src={thumb}
                                                        alt={title}
                                                        className="w-full h-full object-cover opacity-80"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.src = '';
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-[8px] text-gray-500">{tr.noImg}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-sm font-semibold text-white truncate group-hover/item:text-accent transition-colors">
                                                    {title}
                                                </span>
                                                <div className="flex items-center text-[10px] text-gray-400 gap-2 mt-0.5">
                                                    <span className="truncate">{artist}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
