import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/i18n';

interface SettingsState {
    volume: number;
    locale: Locale;

    setVolume: (volume: number) => void;
    setLocale: (locale: Locale) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            volume: 50,
            locale: 'ja',

            setVolume: (volume) => set({ volume }),
            setLocale: (locale) => set({ locale }),
        }),
        {
            name: 'perpl-settings-storage',
            version: 1,
            migrate: (persistedState, version) => {
                if (version === 0) {
                    // 古いバージョンの設定を破棄して初期状態を返す
                    return {
                        volume: 50,
                        locale: 'ja',
                    };
                }
                return persistedState as SettingsState;
            },
        }
    )
);
