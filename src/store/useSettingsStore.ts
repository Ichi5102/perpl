import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    volume: number;

    setVolume: (volume: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            volume: 50,

            setVolume: (volume) => set({ volume }),
        }),
        {
            name: 'perpl-settings-storage',
        }
    )
);
