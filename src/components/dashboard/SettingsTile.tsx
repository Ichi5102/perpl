"use client";

import { useSyncExternalStore } from "react";
import { Settings, Volume2, Globe } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getTranslations } from "@/i18n";

// SSR-safe hydration guard using useSyncExternalStore
const emptySubscribe = () => () => { };
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function SettingsTile() {
    const {
        volume,
        locale,
        setVolume,
        setLocale,
    } = useSettingsStore();

    const t = getTranslations(locale);

    // Hydration-safe mount detection without useEffect+setState
    const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

    if (!mounted) return (
        <div className="glass-tile w-full h-full p-6 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="glass-tile w-full h-full lg:col-span-2 row-span-1 p-6 flex flex-col relative group hover:border-accent/50 transition-colors duration-300 overflow-y-auto custom-scrollbar" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--accent) transparent" }}>
            <h2 className="text-xl font-bold text-accent-foreground mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 opacity-70" />
                {t.settings}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pb-2">
                {/* Volume */}
                <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-accent" />
                        {t.volume}
                    </label>
                    <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                        <div className="relative flex-1 h-3 group/slider cursor-pointer flex items-center">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={(e) => setVolume(Number(e.target.value))}
                                className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                            />
                            <div className="w-full h-1 bg-white/30 rounded-full relative">
                                <div
                                    className="h-full bg-accent group-hover/slider:bg-accent-foreground transition-colors rounded-full"
                                    style={{ width: `${volume}%` }}
                                />
                                {/* Circular Thumb */}
                                <div
                                    className="w-3 h-3 bg-white rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1.5 shadow-sm pointer-events-none transition-transform group-hover/slider:scale-125"
                                    style={{ left: `${volume}%` }}
                                ></div>
                            </div>
                        </div>
                        <span className="text-xs font-mono text-gray-400 w-8 text-right">{volume}%</span>
                    </div>
                </div>

                {/* Language Toggle */}
                <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-accent" />
                        {t.language}
                    </label>
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                        <button
                            onClick={() => setLocale('en')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${locale === 'en' ? 'bg-white/10 text-accent-foreground shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLocale('ja')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${locale === 'ja' ? 'bg-white/10 text-accent-foreground shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            JA
                        </button>
                    </div>
                </div>

                {/* Debug / Reset */}
                <div className="flex flex-col space-y-2 md:col-span-2 mt-2 pt-4 border-t border-white/5">
                    <label className="text-xs font-medium text-gray-400">{t.advanced}</label>
                    <button
                        onClick={() => {
                            localStorage.removeItem('perpl-player-storage');
                            window.location.reload();
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium rounded-lg border border-red-500/20 transition-colors flex items-center justify-center"
                    >
                        {t.clearPlayerState}
                    </button>
                </div>
            </div>
        </div>
    );
}

