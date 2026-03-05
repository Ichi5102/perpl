"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { X } from "lucide-react";

interface TutorialTileProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TutorialTile({ isOpen, onClose }: TutorialTileProps) {
    const { locale } = useSettingsStore();

    if (!isOpen) return null;

    // 言語設定によるタイトルの出し分け
    const title = locale === 'ja' ? '初めての方へ (Tutorial)' : 'Welcome to Perpl (Tutorial)';

    const tutorialContent = locale === 'ja' ? [
        {
            title: "1. プレイリストを作ろう",
            desc: "「プレイリスト作成」タイルの検索欄に好きなアーティスト名を入力し、合計時間の設定と「再生」ボタンを押すだけで、自動で関連楽曲を含むプレイリストが作成されます。"
        },
        {
            title: "2. 無限再生モード",
            desc: "プレイヤーの右側にある無限マーク（∞）が点灯している間は、無限再生モードが有効です。プレイリストの曲が残り少なくなると、自動で新しいおすすめの曲が追加され、音楽が途切れることなく再生され続けます。"
        },
        {
            title: "3. モバイルでの操作",
            desc: "スマートフォンなどの小さい画面では、次の曲リストはプレイヤー下部のリストアイコンをタップすることでポップアップ表示されます。"
        },
        {
            title: "4. 設定とカスタマイズ機能",
            desc: "「設定」タイルから、音量の調整や言語設定（日本語 / English）などをいつでも変更できます。"
        }
    ] : [
        {
            title: "1. Create a Playlist",
            desc: "Enter your favorite artist's name in the search bar of the \"Playlist Creator\" tile, set the total duration, and press the \"Play\" button. A playlist of related tracks will be generated automatically."
        },
        {
            title: "2. Infinity Mode",
            desc: "While the infinity icon (∞) on the right side of the player is illuminated, Infinity Mode is active. When the playlist runs out of tracks, new recommended tracks are automatically added so the music never stops."
        },
        {
            title: "3. Mobile Controls",
            desc: "On smaller screens like smartphones, the \"Up Next\" list can be viewed as a popup by tapping the list icon at the bottom of the player."
        },
        {
            title: "4. Settings & Customization",
            desc: "You can adjust the volume or change the language (日本語 / English) at any time from the \"Settings\" tile."
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* バックグラウンドのクリックで閉じる */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            {/* ポップアップタイル本体 (medium violet のボーダー) */}
            <div
                className="glass-tile w-full max-w-2xl max-h-[80vh] flex flex-col p-6 md:p-8 relative z-[100] transition-all duration-300 bg-black/80"
                style={{ borderColor: '#9370db', borderWidth: '2px' }}
            >

                {/* ヘッダーエリア */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white tracking-widest">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* 
                    ▼▼▼ ここから下がチュートリアルの内容 ▼▼▼
                    テキストやスタイルを自由に編集してください。
                */}
                <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar text-white/90">
                    {tutorialContent.map((item, index) => (
                        <section key={index}>
                            <h3 className="text-lg font-semibold text-[#9370db] mb-2 flex items-center gap-2">
                                {item.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-gray-300">
                                {item.desc}
                            </p>
                        </section>
                    ))}
                </div>
                {/* ▲▲▲ チュートリアル内容 ここまで ▲▲▲ */}

                {/* フッターエリア (閉じるボタン) */}
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-full bg-[#9370db] hover:bg-[#9370db]/80 text-white font-medium transition-colors"
                    >
                        {locale === 'ja' ? '閉じる' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
