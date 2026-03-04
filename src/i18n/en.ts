export const en = {
    // page.tsx
    appName: "Perpl",
    footer: "Developed by Taichi Hirano",

    // PlayerTile
    noTrackSelected: "No Track Selected",
    player: "Player",
    playerFallbackTitle: "Perpl Player",
    upNext: "Up Next",
    unknownTitle: "Unknown Title",
    noImg: "No Img",
    infiniteModeActive: "Infinite Mode Active",
    shufflePlaylist: "Shuffle Playlist",
    deletePlaylist: "Delete Playlist",
    confirmDelete: "Delete the current playlist?",

    // PlaylistCreatorTile
    createPlaylist: "Create Playlist",
    artistInputPlaceholder: "Type artist name...",
    noArtistsSelected: "No artists selected",
    modeReplace: "Replace",
    modeAdd: "Add",
    duration30min: "30 Minutes",
    duration1h: "1 Hour",
    duration1_5h: "1.5 Hours",
    duration2h: "2 Hours",
    durationInfinite: "Infinite",
    play: "Play",
    generating: "Generating...",
    confirmReplace: "Current playlist will be deleted. Continue?",

    // HistoryTile
    history: "History",
    noHistory: "No History",
    noHistoryDesc: "No past playlists yet.",
    inf: "Inf",
    minuteShort: "m",

    // SettingsTile
    settings: "Settings",
    volume: "Volume",
    advanced: "Advanced",
    clearPlayerState: "Clear Player State (Fix Crash)",
    language: "Language",
} as const;

export type TranslationKeys = keyof typeof en;
