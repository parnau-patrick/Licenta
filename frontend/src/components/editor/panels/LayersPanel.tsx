import { MoveUp, MoveDown } from "lucide-react";
import type { CanvasElement } from "../../../types/canvas.types";

interface LayersPanelProps {
  bgOpacity: number;
  onBgOpacityChange: (value: number) => void;
  selectedEl: CanvasElement | undefined;
  onChangeZIndex: (id: string, delta: number) => void;
}

export default function LayersPanel({ bgOpacity, onBgOpacityChange, selectedEl, onChangeZIndex }: LayersPanelProps) {
  return (
    <div className="space-y-6">
      <div className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
        <h3 className="text-sm font-bold text-white mb-4">Background Settings</h3>
        <label className="text-xs text-slate-400 block mb-2 flex justify-between">
          <span>Întunecare Fundal (Overlay)</span>
          <span className="text-teal-400">{bgOpacity}%</span>
        </label>
        <input
          type="range" min="0" max="100"
          value={bgOpacity}
          onChange={(e) => onBgOpacityChange(Number(e.target.value))}
          className="w-full accent-teal-500 h-2 bg-slate-900 rounded-lg"
        />
      </div>

      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-2">Z-Index (Adâncime)</h3>
        {selectedEl ? (
          <div className="space-y-4">
            <p className="text-xs font-mono text-slate-400 bg-slate-950 p-2 rounded text-center mb-2">
              {selectedEl.id} [Z: {selectedEl.zIndex}]
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeZIndex(selectedEl.id, 1)}
                className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
              >
                <MoveUp size={14} /> Adu-l Mai în Față
              </button>
              <button
                onClick={() => onChangeZIndex(selectedEl.id, -1)}
                className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
              >
                <MoveDown size={14} /> Trimite în Spate
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center">
            Selectează un element pe imagine pentru a-i modifica straturile.
          </p>
        )}
      </div>
    </div>
  );
}
