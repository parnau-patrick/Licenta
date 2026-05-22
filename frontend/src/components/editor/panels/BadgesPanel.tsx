import { ShieldCheck } from "lucide-react";

interface BadgesPanelProps {
  onAddBadge: (badgeType: "discount" | "guarantee") => void;
}

export default function BadgesPanel({ onAddBadge }: BadgesPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onAddBadge("discount")}
          className="flex flex-col items-center justify-center gap-2 bg-slate-900 border border-rose-900/50 hover:bg-slate-800 text-white py-4 rounded-xl transition"
        >
          <div className="bg-rose-500 w-12 h-12 flex items-center justify-center rounded-full font-black text-xs transform -rotate-12 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
            -50%
          </div>
          <span className="text-xs mt-2 text-slate-400">Bulina Oferta</span>
        </button>

        <button
          onClick={() => onAddBadge("guarantee")}
          className="flex flex-col items-center justify-center gap-2 bg-slate-900 border border-emerald-900/50 hover:bg-slate-800 text-white py-4 rounded-xl transition"
        >
          <ShieldCheck size={40} className="text-emerald-500 mt-1 shadow-sm" />
          <span className="text-xs mt-2 text-slate-400">Garanție</span>
        </button>
      </div>
    </div>
  );
}
