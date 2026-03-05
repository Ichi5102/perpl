"use client";

import { useState } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { TutorialTile } from "./TutorialTile";

export function TutorialWrapper() {
    const [isOpen, setIsOpen] = useState(false);
    const { locale } = useSettingsStore();

    // 言語設定によるリンクテキストの判定
    const linkText = locale === 'ja' ? '初めての方' : 'Tutorial';

    return (
        <div className="flex items-center">
            {/* ヘッダー右上のリンクテキスト */}
            <button
                onClick={() => setIsOpen(true)}
                className="text-sm md:text-base font-medium tracking-wider transition-all duration-300 hover:scale-105 hover:brightness-125 border-b border-transparent hover:border-[#9370db] pb-0.5"
                style={{ color: "#9370db" }}
            >
                {linkText}
            </button>

            {/* チュートリアルポップアップ本体 */}
            <TutorialTile isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
    );
}
