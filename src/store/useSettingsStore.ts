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
            locale: 'en',

            setVolume: (volume) => set({ volume }),
            setLocale: (locale) => set({ locale }),
        }),
        {
            name: 'perpl-settings-storage',
        }
    )
);
