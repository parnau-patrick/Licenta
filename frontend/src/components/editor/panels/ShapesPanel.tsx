import { Square, Circle } from "lucide-react";
import type { CanvasElement } from "../../../types/canvas.types";

interface ShapesPanelProps {
  selectedEl: CanvasElement | undefined;
  onAddShape: (shapeType: "rectangle" | "circle") => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export default function ShapesPanel({ selectedEl, onAddShape, onUpdateElement }: ShapesPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onAddShape("rectangle")}
          className="flex flex-col items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 text-white py-6 rounded-2xl transition group"
        >
          <Square size={28} className="text-teal-500 group-hover:scale-110 transition" fill="currentColor" fillOpacity={0.2} />
          <span className="text-xs font-semibold">Dreptunghi</span>
        </button>

        <button
          onClick={() => onAddShape("circle")}
          className="flex flex-col items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 text-white py-6 rounded-2xl transition group"
        >
          <Circle size={28} className="text-rose-500 group-hover:scale-110 transition" fill="currentColor" fillOpacity={0.2} />
          <span className="text-xs font-semibold">Cerc</span>
        </button>
      </div>

      {selectedEl?.type === "shape" && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Square size={12} className="inline mr-1" />
            Formă Selectată
          </p>
          <div>
            <label className="text-xs text-slate-400 block mb-2">Culoare Fundal (Rgba / Hex)</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={selectedEl.backgroundColor.startsWith("#") ? selectedEl.backgroundColor.slice(0, 7) : "#000000"}
                onChange={(e) => onUpdateElement(selectedEl.id, { backgroundColor: e.target.value })}
                className="w-8 h-8 rounded shrink-0 cursor-pointer overflow-hidden border-0 p-0"
              />
              <input
                type="text"
                value={selectedEl.backgroundColor}
                onChange={(e) => onUpdateElement(selectedEl.id, { backgroundColor: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white uppercase focus:border-teal-500 font-mono"
                placeholder="rgba(0,0,0,0.5)"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Scrie "rgba(0,0,0, 0.5)" manual pt transparență!</p>
          </div>
        </div>
      )}
    </div>
  );
}
