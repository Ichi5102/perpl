import type { TranslationKeys } from "./en";

export const ja: Record<TranslationKeys, string> = {
    // page.tsx
    appName: "Perpl",
    footer: "Developed by Taichi Hirano",

    // PlayerTile
    noTrackSelected: "未選択",
    player: "プレイヤー",
    playerFallbackTitle: "Perpl Player",
    upNext: "次の曲",
    unknownTitle: "不明なタイトル",
    noImg: "画像なし",
    infiniteModeActive: "無限モード",
    shufflePlaylist: "プレイリストをシャッフル",
    deletePlaylist: "プレイリストを削除",
    confirmDelete: "プレイリストを削除しますか？",

    // PlaylistCreatorTile
    createPlaylist: "プレイリスト作成",
    artistInputPlaceholder: "アーティスト名を入力...",
    noArtistsSelected: "未選択",
    modeReplace: "入れ替え",
    modeAdd: "追加",
    duration30min: "30分",
    duration1h: "1時間",
    duration1_5h: "1.5時間",
    duration2h: "2時間",
    durationInfinite: "無限",
    play: "再生",
    generating: "作成中...",
    confirmReplace: "現在のプレイリストが削除されます。よろしいですか？",

    // HistoryTile
    history: "履歴",
    noHistory: "履歴なし",
    noHistoryDesc: "過去のプレイリストはありません。",
    inf: "無限",
    minuteShort: "分",

    // SettingsTile
    settings: "設定",
    volume: "音量",
    volumeIOSMessage: "デバイスの音量ボタンで調整",
    advanced: "高度な設定",
    clearPlayerState: "全てリセット",
    language: "言語",

    // iOS
    tapToPlay: "タップして再生",
};
