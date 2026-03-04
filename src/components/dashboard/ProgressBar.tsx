import React, { useState, useEffect } from 'react';
import type { YouTubePlayer } from 'react-youtube';

// Format seconds into mm:ss
const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

interface ProgressBarProps {
    player: YouTubePlayer | null;
    isPlayerReady: boolean;
    isPlaying: boolean;
}

export function ProgressBar({ player, isPlayerReady, isPlaying }: ProgressBarProps) {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    // Polling interval for progress bar
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && player && isPlayerReady && !isSeeking) {
            // Using a slightly lower interval length (500ms instead of 1000) for smoother updates,
            // while keeping the re-renders completely isolated to this tiny component
            interval = setInterval(async () => {
                try {
                    if (typeof player.getCurrentTime === 'function') {
                        const current = await player.getCurrentTime();
                        const dur = await player.getDuration();
                        setCurrentTime(current || 0);
                        setDuration(dur || 0);
                    }
                } catch {
                    // ignore
                }
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isPlaying, player, isPlayerReady, isSeeking]);

    // Handle seeking
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (player && typeof player.seekTo === 'function') {
            player.seekTo(time, true);
        }
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="w-full max-w-[80%] flex flex-col items-center gap-2">
            <div className="flex justify-between w-full text-xs font-semibold text-gray-400 font-mono tracking-widest overflow-hidden h-4">
                <span className="w-12 text-left">{formatTime(currentTime)}</span>
                <span className="w-12 text-right">{formatTime(duration)}</span>
            </div>
            <div className="w-full relative group/slider">
                {/* Custom Range Slider Core */}
                <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    onMouseDown={() => setIsSeeking(true)}
                    onMouseUp={() => setIsSeeking(false)}
                    onTouchStart={() => setIsSeeking(true)}
                    onTouchEnd={() => setIsSeeking(false)}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                />

                {/* Visual Track */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden shadow-inner flex relative">
                    {/* Fill */}
                    <div
                        className="h-full bg-accent rounded-full transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(147,112,219,0.5)]"
                        style={{ width: `${progressPercentage}%` }}
                    />

                    {/* Handle visualization */}
                    <div
                        className="absolute h-3 w-3 bg-white rounded-full top-1/2 -translate-y-1/2 -ml-1.5 shadow-md shadow-black/50 opacity-0 group-hover/slider:opacity-100 transition-opacity"
                        style={{ left: `${progressPercentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
