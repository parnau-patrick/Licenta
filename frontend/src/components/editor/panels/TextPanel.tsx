import { Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, PlusCircle } from "lucide-react";
import type { CanvasElement } from "../../../types/canvas.types";
import { FONTS } from "../../../types/canvas.types";

interface TextPanelProps {
  selectedEl: CanvasElement | undefined;
  onAddText: () => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export default function TextPanel({ selectedEl, onAddText, onUpdateElement }: TextPanelProps) {
  return (
    <div className="space-y-6">
      <button
        onClick={onAddText}
        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-3 px-4 rounded-xl transition"
      >
        <PlusCircle size={18} className="text-teal-400" />
        Adaugă Titlu Text
      </button>

      {selectedEl?.type === "text" && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-5 shadow-inner">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Type size={12} className="inline mr-1" />
            Text Selectat
          </p>

          <textarea
            value={selectedEl.text}
            onChange={(e) => onUpdateElement(selectedEl.id, { text: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-teal-500 focus:outline-none resize-none"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Font Family</label>
              <select
                value={selectedEl.fontFamily}
                onChange={(e) => onUpdateElement(selectedEl.id, { fontFamily: e.target.value })}
                className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none font-bold"
              >
                {FONTS.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Size ({selectedEl.fontSize}px)
              </label>
              <input
                type="range" min="12" max="120"
                value={selectedEl.fontSize}
                onChange={(e) => onUpdateElement(selectedEl.id, { fontSize: parseInt(e.target.value) })}
                className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mt-2"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {/* Color picker stilizat */}
            <div className="relative flex-1">
              <input
                type="color"
                value={selectedEl.color}
                onChange={(e) => onUpdateElement(selectedEl.id, { color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: selectedEl.color }} />
                <span className="text-xs text-slate-300 font-mono uppercase">{selectedEl.color}</span>
              </div>
            </div>

            <button
              onClick={() => onUpdateElement(selectedEl.id, { fontWeight: selectedEl.fontWeight === "bold" ? "normal" : "bold" })}
              className={`p-2 border rounded-lg transition ${selectedEl.fontWeight === "bold" ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-900 border-slate-800 text-slate-400"}`}
            >
              <Bold size={16} />
            </button>

            <button
              onClick={() => onUpdateElement(selectedEl.id, { fontStyle: selectedEl.fontStyle === "italic" ? "normal" : "italic" })}
              className={`p-2 border rounded-lg transition ${selectedEl.fontStyle === "italic" ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-900 border-slate-800 text-slate-400"}`}
            >
              <Italic size={16} />
            </button>
          </div>

          <div className="flex justify-between bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button onClick={() => onUpdateElement(selectedEl.id, { textAlign: "left" })} className={`flex-1 py-1.5 flex justify-center rounded-md transition ${selectedEl.textAlign === "left" ? "bg-slate-800 text-white" : "text-slate-500"}`}>
              <AlignLeft size={16} />
            </button>
            <button onClick={() => onUpdateElement(selectedEl.id, { textAlign: "center" })} className={`flex-1 py-1.5 flex justify-center rounded-md transition ${selectedEl.textAlign === "center" ? "bg-slate-800 text-white" : "text-slate-500"}`}>
              <AlignCenter size={16} />
            </button>
            <button onClick={() => onUpdateElement(selectedEl.id, { textAlign: "right" })} className={`flex-1 py-1.5 flex justify-center rounded-md transition ${selectedEl.textAlign === "right" ? "bg-slate-800 text-white" : "text-slate-500"}`}>
              <AlignRight size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
            <label className="text-xs text-slate-300">Umbră Text (Glow)</label>
            <input
              type="checkbox"
              checked={selectedEl.dropShadow}
              onChange={(e) => onUpdateElement(selectedEl.id, { dropShadow: e.target.checked })}
              className="accent-teal-500 w-4 h-4 rounded-md cursor-pointer"
            />
          </div>
        </div>
      )}

      {selectedEl && selectedEl.type !== "text" && (
        <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-900 rounded-xl border border-slate-800">
          Un element de alt tip este selectat. Mergi la tab-ul Forme/Straturi.
        </p>
      )}
    </div>
  );
}
