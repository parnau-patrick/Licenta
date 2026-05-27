import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import type { MarketingCopy } from "../lib/api";
import type { CanvasElement } from "../types/canvas.types";
import { useCanvasElements } from "../hooks/useCanvasElements";
import EditorSidebar from "./editor/EditorSidebar";
import CanvasWorkspace from "./editor/CanvasWorkspace";

type ActiveTab = "text" | "shapes" | "badges" | "layers";

interface CanvaEditorModalProps {
  variantId: string;
  variantLabel: string;
  backgroundUrl: string;
  cutoutUrl: string | null;
  copy: MarketingCopy | null;
  onClose: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export default function CanvaEditorModal({ variantId, variantLabel, backgroundUrl, cutoutUrl, copy, onClose }: CanvaEditorModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("text");
  const [bgOpacity, setBgOpacity] = useState(0);

  const { elements, selectedId, selectedEl, setSelectedId, addText, addShape, addBadge, updateElement, deleteElement, changeZIndex } =
    useCanvasElements({ variantId, copy, cutoutUrl });

  // Proxy extern pentru imaginea de fundal pentru a ocoli restricțiile de CORS din canvas-ul editorului
  const proxiedBackgroundUrl = backgroundUrl.startsWith("http") && !backgroundUrl.includes("localhost")
    ? `${API_BASE}/api/images/proxy?url=${encodeURIComponent(backgroundUrl)}`
    : backgroundUrl;

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    setSelectedId(null);
    // Așteptăm re-randarea fără ring de selecție înainte de captură
    setTimeout(async () => {
      if (!canvasRef.current) return;
      const canvas = await html2canvas(canvasRef.current, { useCORS: true, scale: 2, backgroundColor: null });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `ad-studio-${variantId}.png`;
      link.click();
    }, 100);
  };

  const handleElementClick = (el: CanvasElement) => {
    setSelectedId(el.id);
    if (el.type === "text") setActiveTab("text");
    else if (el.type === "shape") setActiveTab("shapes");
    else setActiveTab("badges");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 selection:bg-teal-500/30">
      <div className="flex flex-col md:flex-row w-full max-w-[1100px] h-[85vh] max-h-[800px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <EditorSidebar
          variantLabel={variantLabel}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedEl={selectedEl}
          selectedId={selectedId}
          bgOpacity={bgOpacity}
          onBgOpacityChange={setBgOpacity}
          onAddText={addText}
          onAddShape={addShape}
          onAddBadge={addBadge}
          onUpdateElement={updateElement}
          onDeleteSelected={() => selectedId && deleteElement(selectedId)}
          onChangeZIndex={changeZIndex}
          onDownload={handleDownload}
          onClose={onClose}
        />
        <CanvasWorkspace
          ref={canvasRef}
          backgroundUrl={proxiedBackgroundUrl}
          bgOpacity={bgOpacity}
          elements={elements}
          selectedId={selectedId}
          onCanvasClick={() => setSelectedId(null)}
          onElementClick={handleElementClick}
          onDragStop={(id, x, y) => updateElement(id, { x, y })}
          onResizeStop={(id, width, height, x, y) => updateElement(id, { width, height, x, y })}
          onTextBlur={(id, newText) => updateElement(id, { text: newText })}
        />
      </div>
    </div>
  );
}
