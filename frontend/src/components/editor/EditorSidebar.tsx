import { Type, Square, Layers, Download, Trash, Sparkles, ShieldCheck } from "lucide-react";
import type { CanvasElement } from "../../types/canvas.types";
import TextPanel from "./panels/TextPanel";
import ShapesPanel from "./panels/ShapesPanel";
import BadgesPanel from "./panels/BadgesPanel";
import LayersPanel from "./panels/LayersPanel";

type ActiveTab = "text" | "shapes" | "badges" | "layers";

const TABS = [
  { id: "text" as ActiveTab,   icon: Type,        label: "Text"     },
  { id: "shapes" as ActiveTab, icon: Square,      label: "Forme"    },
  { id: "badges" as ActiveTab, icon: ShieldCheck, label: "Stickere" },
  { id: "layers" as ActiveTab, icon: Layers,      label: "Straturi" },
];

interface EditorSidebarProps {
  variantLabel: string;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedEl: CanvasElement | undefined;
  selectedId: string | null;
  bgOpacity: number;
  onBgOpacityChange: (value: number) => void;
  onAddText: () => void;
  onAddShape: (shapeType: "rectangle" | "circle") => void;
  onAddBadge: (badgeType: "discount" | "guarantee") => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteSelected: () => void;
  onChangeZIndex: (id: string, delta: number) => void;
  onDownload: () => void;
  onClose: () => void;
}

export default function EditorSidebar({
  variantLabel, activeTab, onTabChange, selectedEl, selectedId,
  bgOpacity, onBgOpacityChange, onAddText, onAddShape, onAddBadge,
  onUpdateElement, onDeleteSelected, onChangeZIndex, onDownload, onClose,
}: EditorSidebarProps) {
  return (
    <div className="w-full md:w-[380px] bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">

      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="text-teal-400" size={20} />
            Ad Studio{" "}
            <span className="text-xs font-medium px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full ml-2">PRO</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{variantLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          aria-label="Închide editorul"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Taburi navigare */}
      <div className="flex px-4 pt-4 gap-2 border-b border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 border-b-2 font-semibold text-xs transition duration-200 ${
              activeTab === tab.id
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panelul activ */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {activeTab === "text" && (
          <TextPanel selectedEl={selectedEl} onAddText={onAddText} onUpdateElement={onUpdateElement} />
        )}
        {activeTab === "shapes" && (
          <ShapesPanel selectedEl={selectedEl} onAddShape={onAddShape} onUpdateElement={onUpdateElement} />
        )}
        {activeTab === "badges" && (
          <BadgesPanel onAddBadge={onAddBadge} />
        )}
        {activeTab === "layers" && (
          <LayersPanel
            bgOpacity={bgOpacity}
            onBgOpacityChange={onBgOpacityChange}
            selectedEl={selectedEl}
            onChangeZIndex={onChangeZIndex}
          />
        )}
      </div>

      {/* Acțiuni globale */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
        <button
          onClick={onDeleteSelected}
          disabled={!selectedId}
          className={`p-3 rounded-xl border flex shrink-0 items-center justify-center transition-all ${
            selectedId
              ? "bg-slate-900 border-rose-900/50 hover:bg-rose-900/30 text-rose-500 shadow-sm"
              : "bg-slate-900/50 border-slate-800 text-slate-700 cursor-not-allowed"
          }`}
          aria-label="Șterge elementul selectat"
        >
          <Trash size={18} />
        </button>
        <button
          onClick={onDownload}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-500/10 border border-teal-500/30 w-full py-3 text-sm font-bold text-teal-400 transition hover:bg-teal-500 hover:text-white"
        >
          <Download size={18} />
          Export .PNG (Reclamă H-Res)
        </button>
      </div>
    </div>
  );
}
