"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Clock, Play, X, Loader2, Plus, ChevronUp, ChevronDown, History } from "lucide-react";

import { usePlayerStore, Track, ArtistInfo } from "@/store/usePlayerStore";
import axios from "axios";
import { BrownianMotionCanvas } from "@/components/effects/BrownianMotionCanvas";

export interface Artist {
    id: string;
    name: string;
    color: string;
}

// Helper to generate a random bright color for tags (similar to Munsell S>8, V>5)
// Excludes Cyan (170-200) and Purple (250-290) which are reserved for base wave colors
const getRandomColor = () => {
    let hue = 0;
    // Keep generating until we get a hue that isn't in the restricted ranges
    while (true) {
        hue = Math.floor(Math.random() * 360);
        const isCyan = hue >= 170 && hue <= 200;
        const isPurple = hue >= 250 && hue <= 290;
        if (!isCyan && !isPurple) break;
    }

    // Saturation 80-100%, Lightness 60-80% for vibrant colors on dark backgrounds
    const saturation = Math.floor(Math.random() * 20) + 80;
    const lightness = Math.floor(Math.random() * 20) + 60;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function PlaylistCreatorTile() {

    const { setQueue, setCurrentTrack, currentTrack, queue, isInfinite, addTracksToQueue, addArtistHistory, clearArtistHistory, addPlaylistHistory, artistHistory, resetCreatorTrigger } = usePlayerStore();

    const [inputValue, setInputValue] = useState("");
    const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
    const [duration, setDuration] = useState("60");
    const [isAddMode, setIsAddMode] = useState(false); // false = replace, true = add
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false);

    // Autocomplete states
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const durationMenuRef = useRef<HTMLDivElement>(null);
    const inputWrapperRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (durationMenuRef.current && !durationMenuRef.current.contains(event.target as Node)) {
                setIsDurationMenuOpen(false);
            }
            if (inputWrapperRef.current && !inputWrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Listen to store reset trigger (e.g., when "Clear Playlist" is clicked)
    useEffect(() => {
        if (resetCreatorTrigger > 0) {
            setInputValue("");
            setSelectedArtists([]);
            setDuration("60");
            setIsAddMode(false);
            setIsGenerating(false);
            setSuggestions([]);
            setIsSearching(false);
            setShowSuggestions(false);
        }
    }, [resetCreatorTrigger]);

    // iTunes Autocomplete Debounce (via server-side API route)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!inputValue.trim()) {
                setSuggestions([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const response = await axios.get(`/api/itunes/search?term=${encodeURIComponent(inputValue)}`);

                if (response.data && response.data.results) {
                    const uniqueNames: string[] = response.data.results;
                    setSuggestions(uniqueNames);
                    setShowSuggestions(uniqueNames.length > 0);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch (err) {
                console.error("iTunes API search failed:", err);
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [inputValue]);

    const handleAddArtist = (e?: React.FormEvent, nameOverride?: string) => {
        if (e) e.preventDefault();
        // Require nameOverride from suggestion click to prevent arbitrary text input
        const artistName = nameOverride;
        if (!artistName) return;

        const newArtist: ArtistInfo = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: artistName,
            color: getRandomColor(),
        };

        setSelectedArtists([...selectedArtists, newArtist]);
        addArtistHistory(artistName);
        setInputValue("");
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Disabled adding arbitrary strings via Enter key
        }
    };

    const handleRemoveArtist = (id: string) => {
        setSelectedArtists(selectedArtists.filter(a => a.id !== id));
    };

    const handleGeneratePlaylist = async () => {
        if (selectedArtists.length === 0 || isInfinite) return;

        if (!isAddMode && (currentTrack || queue.length > 0)) {
            if (!window.confirm("現在のプレイリストが削除されます。よろしいですか？")) {
                return;
            }
        }

        setIsGenerating(true);
        try {
            const isInf = duration === "infinite";
            const reqDuration = isInf ? 120 : parseInt(duration);

            const res = await axios.post("/api/youtube/generate", {
                artists: selectedArtists,
                durationMinutes: reqDuration,
            });

            if (!res || !res.data || !res.data.playlist) {
                throw new Error("Invalid response from server");
            }

            // Create a clean array of tracks from the response
            const playlist: Track[] = res.data.playlist.map((t: any) => ({
                id: String(t.id || ""),
                title: String(t.title || "Unknown Title"),
                artist: String(t.artist || "Unknown Artist"),
                thumbnailUrl: String(t.thumbnailUrl || ""),
                durationString: t.durationString ? String(t.durationString) : undefined
            })).filter((t: Track) => t.id);

            if (playlist.length > 0) {
                addPlaylistHistory(selectedArtists, duration);
                if (isAddMode && (currentTrack || queue.length > 0)) {
                    // Add Mode: just append to the existing queue
                    addTracksToQueue(playlist);
                } else {
                    // Replace Mode (or empty queue): set current track and queue
                    setCurrentTrack(playlist[0]);
                    const artistNames = selectedArtists.map(a => a.name);
                    setQueue(playlist.slice(1), isInf, artistNames);
                }

                // APIトークン消費抑制のためにも、生成後はアーティストタグをクリアする
                setSelectedArtists([]);
            } else {
                alert("Could not generate a playlist (No suitable tracks found). Try a different artist.");
            }
        } catch (error: any) {
            console.error("Failed to generate playlist:", error?.response?.data || error.message);
            const errMsg = error?.response?.data?.error || "Failed to generate playlist. Check your API keys and try again.";
            alert(errMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    // Render dummy UI while waiting for client render if needed
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return (
        <div className="glass-tile w-full h-full p-6 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
    );



    return (
        <div className="glass-tile w-full h-full p-6 flex flex-col relative group hover:border-accent/50 transition-all duration-300 overflow-hidden">
            {/* Dynamic Background Tint based on Mode */}
            <div
                className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-700 ${isAddMode ? 'bg-accent-secondary/15' : 'bg-[#4682b4]/10'}`}
            ></div>

            <h2 className="text-xl font-bold text-accent-foreground mb-4 relative z-10 flex items-center justify-between">
                Create Playlist

            </h2>

            {/* Album Cover / Animation target with modern shadow and lens distortion */}
            <div className="relative w-56 aspect-square mx-auto mb-6 z-10 group/canvas shrink-0">
                {/* Outer Glow / Drop Shadow */}
                <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-xl group-hover/canvas:bg-accent/30 transition-all duration-700 -z-10"></div>

                {/* Main Container */}
                <div className="w-full h-full bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <BrownianMotionCanvas artists={selectedArtists} isAddMode={isAddMode} isGenerating={isGenerating} />

                    {/* Inner Lens Distortion / Glass Edge Effect */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_20px_rgba(255,255,255,0.15),inset_0_0_5px_rgba(255,255,255,0.1)] ring-1 ring-inset ring-white/10 mix-blend-overlay"></div>
                    {/* Subtle chromatic/glass reflection */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-tr from-[rgba(255,255,255,0.05)] via-transparent to-[rgba(100,200,255,0.1)] opacity-70"></div>
                </div>
            </div>

            <div className="flex flex-col gap-3 relative z-10 flex-1">
                {/* Artist Input */}
                <div className="relative z-[60] flex gap-2" ref={inputWrapperRef}>
                    <div className="flex-1 flex items-center bg-black/60 rounded-xl border border-white/10 px-4 py-3 focus-within:border-accent/50 transition-colors shadow-inner relative">
                        {isSearching ? (
                            <Loader2 className="w-4 h-4 text-accent mr-3 shrink-0 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                        )}
                        <input
                            type="text"
                            placeholder={"Type artist name & press Enter..."}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => { if (suggestions.length > 0 || (!inputValue.trim() && artistHistory.length > 0)) setShowSuggestions(true); }}
                            onKeyDown={handleKeyDown}
                            disabled={isGenerating}
                            className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500 font-medium disabled:opacity-50"
                        />

                        {/* Autocomplete & History Dropdown */}
                        {showSuggestions && (suggestions.length > 0 || (!inputValue.trim() && artistHistory.length > 0)) && (
                            <div className="absolute bottom-full left-0 w-full mb-2 bg-black/95 border border-white/10 rounded-xl shadow-2xl py-2 z-[100] backdrop-blur-xl max-h-48 overflow-y-auto custom-scrollbar">
                                {!inputValue.trim() && artistHistory.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            clearArtistHistory();
                                        }}
                                        className="w-full text-left px-4 py-2 text-xs text-red-400 font-bold hover:bg-white/10 hover:text-red-300 transition-colors flex items-center justify-between border-b border-red-500/20 mb-1"
                                    >
                                        <span>履歴削除</span>
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {!inputValue.trim() && artistHistory.map((sugg, i) => (
                                    <button
                                        key={`ah-${i}`}
                                        onClick={(e) => handleAddArtist(e as any, sugg)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 font-medium hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 border-b border-white/5 last:border-b-0"
                                    >
                                        <History className="w-3.5 h-3.5 text-gray-500" />
                                        {sugg}
                                    </button>
                                ))}
                                {inputValue.trim() && suggestions.map((sugg, i) => (
                                    <button
                                        key={`su-${i}`}
                                        onClick={(e) => handleAddArtist(e as any, sugg)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-white font-medium hover:bg-white/10 transition-colors flex items-center gap-3 border-b border-white/5 last:border-b-0"
                                    >
                                        <Search className="w-3.5 h-3.5 text-gray-400" />
                                        {sugg}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Tags */}
                <div className="flex flex-wrap gap-2 min-h-[30px] items-center">
                    {selectedArtists.length === 0 && (
                        <span className="text-xs text-gray-600 italic">No artists selected</span>
                    )}
                    {selectedArtists.map(artist => (
                        <span
                            key={artist.id}
                            className="text-white text-xs pl-3 pr-1 py-1 rounded-full border shadow-sm flex items-center gap-1 group/tag"
                            style={{
                                backgroundColor: `${artist.color}30`, // 30 is hex for roughly 20% opacity
                                borderColor: `${artist.color}80`
                            }}
                        >
                            <span className="truncate max-w-[80px] font-medium">{artist.name}</span>
                            <button onClick={() => !isGenerating && handleRemoveArtist(artist.id)} className="p-0.5 rounded-full hover:bg-black/30 text-white/70 hover:text-white transition-colors disabled:opacity-50">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>

                {/* Replace / Add Toggle */}
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 mt-2">
                    <button
                        onClick={() => setIsAddMode(false)}
                        disabled={isGenerating}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isAddMode ? 'bg-white/10 text-[#8fd3ff] shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
                    >
                        Replace
                    </button>
                    <button
                        onClick={() => setIsAddMode(true)}
                        disabled={isGenerating}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isAddMode ? 'bg-white/10 text-[#d8b4fe] shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
                    >
                        Add
                    </button>
                </div>

                {/* Time Selection */}
                <div className="relative z-[100] shrink-0" ref={durationMenuRef}>
                    <button
                        onClick={() => setIsDurationMenuOpen(!isDurationMenuOpen)}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-between bg-black/60 rounded-xl border border-white/10 px-4 py-2.5 shadow-inner transition-colors focus:border-accent/50 hover:bg-black/80 disabled:opacity-50"
                    >
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                            <span className="text-sm text-white font-medium">
                                {duration === "30" && "30 Minutes"}
                                {duration === "60" && "1 Hour"}
                                {duration === "90" && "1.5 Hours"}
                                {duration === "120" && "2 Hours"}
                                {duration === "infinite" && "Infinite"}
                            </span>
                        </div>
                        {isDurationMenuOpen ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                        )}
                    </button>

                    {/* Dropdown Menu */}
                    {isDurationMenuOpen && (
                        <div className="absolute bottom-full left-0 w-full bg-black/90 border border-white/10 rounded-xl shadow-2xl py-2 z-30 backdrop-blur-xl mb-2">
                            {[
                                { value: "30", label: "30 Minutes" },
                                { value: "60", label: "1 Hour" },
                                { value: "90", label: "1.5 Hours" },
                                { value: "120", label: "2 Hours" },
                                { value: "infinite", label: "Infinite" },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setDuration(option.value);
                                        setIsDurationMenuOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between group
                                        ${duration === option.value ? 'text-accent font-bold' : 'text-white'}`}
                                >
                                    <span>{option.label}</span>
                                    {duration === option.value && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Generate Button */}
                <button
                    disabled={selectedArtists.length === 0 || isGenerating || isInfinite}
                    onClick={handleGeneratePlaylist}
                    className="w-full mt-1 shrink-0 bg-accent brightness-110 hover:brightness-125 disabled:bg-accent/40 disabled:brightness-100 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl border border-accent/20 transition-all shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4 fill-current" />
                    )}
                    {isInfinite ? "Infinite Active" : (isGenerating ? "Generating..." : "Play")}
                </button>
            </div>
        </div>
    );
}
