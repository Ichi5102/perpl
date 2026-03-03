"use client";

import { useState, useEffect } from "react";
import { History, Play, Clock, Loader2 } from "lucide-react";
import { usePlayerStore, PlaylistHistoryItem } from "@/store/usePlayerStore";

import axios from "axios";

export function HistoryTile() {
    const { playlistHistory, setQueue, setCurrentTrack, triggerCreatorReset } = usePlayerStore();

    const [isGenerating, setIsGenerating] = useState<string | null>(null); // Store ID of history item being generated
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const handleGenerateFromHistory = async (item: PlaylistHistoryItem) => {

        setIsGenerating(item.id);

        // Let's trigger a creator reset so the tile clears out, making it obvious a new play started
        triggerCreatorReset();

        try {
            const isInf = item.duration === "infinite";
            const reqDuration = isInf ? 30 : parseInt(item.duration);

            const res = await axios.post("/api/youtube/generate", {
                artists: item.artists,
                durationMinutes: reqDuration,
            });

            if (!res || !res.data || !res.data.playlist) {
                throw new Error("Invalid response from server");
            }

            const playlist = res.data.playlist.map((t: any) => ({
                id: String(t.id || ""),
                title: String(t.title || "Unknown Title"),
                artist: String(t.artist || "Unknown Artist"),
                thumbnailUrl: String(t.thumbnailUrl || ""),
            })).filter((t: any) => t.id);

            if (playlist.length > 0) {
                setCurrentTrack(playlist[0]);
                const artistNames = item.artists.map(a => a.name);
                setQueue(playlist.slice(1), isInf, artistNames);
            } else {
                alert("Could not recreate the playlist. Try again.");
            }
        } catch (error: any) {
            console.error("Failed to generate from history:", error);
            const errMsg = error?.response?.data?.error || "Failed to generate playlist. Check your API keys.";
            alert(errMsg);
        } finally {
            setIsGenerating(null);
        }
    };

    if (!mounted) return (
        <div className="glass-tile w-full h-full p-6 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="glass-tile w-full h-full p-6 flex flex-col relative group hover:border-white/20 transition-all duration-300">
            <h2 className="text-xl font-bold text-accent-foreground mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                History
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {playlistHistory && playlistHistory.length > 0 ? (
                    playlistHistory.map((item) => (
                        <div key={item.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col xl:flex-row gap-4 items-start xl:items-center group/item hover:bg-white/10 hover:border-white/20 transition-all">
                            <div className="flex-1 min-w-0 w-full">
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {item.artists.map(a => (
                                        <span
                                            key={a.id}
                                            className="text-xs font-semibold px-2 py-1 rounded-md border shadow-sm truncate max-w-[100px]"
                                            style={{ backgroundColor: `${a.color}30`, borderColor: `${a.color}80` }}
                                        >
                                            {a.name}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.duration === 'infinite' ? 'Inf' : `${item.duration}m`}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <button
                                disabled={isGenerating !== null}
                                onClick={() => handleGenerateFromHistory(item)}
                                className="w-full xl:w-auto shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isGenerating === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                                ) : (
                                    <Play className="w-4 h-4 group-hover/item:text-accent transition-colors" />
                                )}
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10 opacity-50">
                        <History className="w-10 h-10 mb-3" />
                        <p className="text-sm">No History</p>
                    </div>
                )}
            </div>
        </div>
    );
}
