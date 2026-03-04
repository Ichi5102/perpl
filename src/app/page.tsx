import { PlayerTile } from "@/components/dashboard/PlayerTile";
import { PlaylistCreatorTile } from "@/components/dashboard/PlaylistCreatorTile";
import { HistoryTile } from "@/components/dashboard/HistoryTile";
import { SettingsTile } from "@/components/dashboard/SettingsTile";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Dynamic Background Effects Placeholder */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-secondary/15 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="w-full relative z-10 flex justify-start items-end pb-4 pt-6 pl-6 md:pl-28 pr-4 md:pr-8">
        <h1 className="text-4xl md:text-7xl tracking-tight text-[#9370db] leading-none flex items-end gap-2" style={{ fontFamily: "var(--font-logo), sans-serif" }}>
          <span className="font-black">Perpl</span>
          <span className="font-extralight text-[0.8em] tracking-normal mb-1 md:mb-0 opacity-100" style={{ fontFamily: "var(--font-logo-sub), sans-serif" }}>Music</span>
        </h1>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:px-8 pb-8 flex flex-col justify-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-auto lg:auto-rows-[360px]">
          {/* 1. Unified Player & Queue Tile */}
          <div className="lg:col-span-3 lg:row-span-2 h-[600px] lg:h-full">
            <ErrorBoundary fallbackName="Player & Queue">
              <PlayerTile />
            </ErrorBoundary>
          </div>

          {/* 2. Playlist Creator Tile */}
          <div className="lg:col-span-1 lg:row-span-2 h-[720px] lg:h-full">
            <ErrorBoundary fallbackName="Playlist Creator">
              <PlaylistCreatorTile />
            </ErrorBoundary>
          </div>

          {/* 3. History Tile */}
          <div className="lg:col-span-2 row-span-1 h-[300px] lg:h-full">
            <ErrorBoundary fallbackName="History">
              <HistoryTile />
            </ErrorBoundary>
          </div>

          {/* 4. Settings Tile */}
          <div className="lg:col-span-2 row-span-1 h-[300px] lg:h-full">
            <ErrorBoundary fallbackName="Settings">
              <SettingsTile />
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full relative z-10 py-6 text-center">
        <span className="text-xs md:text-sm text-gray-500 font-sans tracking-wide opacity-50">
          Developed by Taichi Hirano
        </span>
      </footer>
    </div>
  );
}
