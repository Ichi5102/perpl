import { ListMusic, MoreVertical } from "lucide-react";

export function QueueTile() {
    return (
        <div className="glass-tile w-full h-full md:col-span-1 lg:col-span-1 md:row-span-2 p-6 flex flex-col relative group hover:border-[rgba(70,130,180,0.5)] transition-colors duration-300">
            <h2 className="text-xl font-bold text-accent-foreground mb-6 flex items-center justify-between">
                <span>Up Next</span>
                <ListMusic className="w-5 h-5 text-accent opacity-70" />
            </h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--accent) transparent" }}>
                {/* Dummy Queue Items */}
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group/item cursor-pointer">
                        <div className="w-12 h-12 bg-black/40 rounded-md shrink-0 flex items-center justify-center relative overflow-hidden">
                            <span className="text-[10px] text-white/30 font-mono text-center">Thumb</span>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-semibold text-white truncate group-hover/item:text-accent transition-colors">Song Title {i}</span>
                            <div className="flex items-center text-xs text-gray-400 gap-2 mt-0.5">
                                <span className="truncate">Artist Name</span>
                                <span className="text-gray-600">•</span>
                                <span className="shrink-0 text-gray-500">2023</span>
                            </div>
                        </div>
                        <button className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-white transition-opacity p-1">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
