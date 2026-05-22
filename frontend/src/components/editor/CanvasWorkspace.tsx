import React, { forwardRef } from "react";
import { Rnd } from "react-rnd";
import type { CanvasElement } from "../../types/canvas.types";
import CanvasElementRenderer from "./CanvasElementRenderer";

interface CanvasWorkspaceProps {
  backgroundUrl: string;
  bgOpacity: number;
  elements: CanvasElement[];
  selectedId: string | null;
  onCanvasClick: () => void;
  onElementClick: (el: CanvasElement) => void;
  onDragStop: (id: string, x: number, y: number) => void;
  onResizeStop: (id: string, width: number, height: number | "auto", x: number, y: number) => void;
  onTextBlur: (id: string, newText: string) => void;
}

// forwardRef expune ref-ul div-ului intern pentru captura html2canvas la export
const CanvasWorkspace = forwardRef<HTMLDivElement, CanvasWorkspaceProps>(
  function CanvasWorkspace({ backgroundUrl, bgOpacity, elements, selectedId, onCanvasClick, onElementClick, onDragStop, onResizeStop, onTextBlur }, ref) {
    return (
      <div 
        className="flex items-center justify-center max-w-full max-h-full shrink-0"
        onClick={onCanvasClick}
      >
            <div
              ref={ref}
              className="relative bg-white shadow-2xl overflow-hidden shrink-0 border border-slate-800"
              style={{ width: 600, height: 600, transform: 'scale(min(1, min(calc(100vw - 32px) / 600, calc(100vh - 150px) / 600)))', transformOrigin: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Stratul 1: Imaginea de fundal AI */}
              <img
                src={backgroundUrl}
                alt="AI Background"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                crossOrigin="anonymous"
              />

              {/* Stratul 2: Overlay de întunecire opțional */}
              {bgOpacity > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-multiply"
                  style={{ backgroundColor: `rgba(0,0,0,${bgOpacity / 100})` }}
                />
              )}

              {/* Stratul 3: Elementele drag & resize */}
              {elements.map((el) => (
                <Rnd
                  key={el.id}
                  bounds="parent"
                  default={{
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: typeof el.height === "number" ? el.height : 50,
                  }}
                  style={{ zIndex: el.zIndex }}
                  className={`group ${selectedId === el.id
                      ? "ring-2 ring-teal-400 ring-offset-1 ring-offset-transparent"
                      : "hover:ring-1 hover:ring-slate-500/50"
                    } transition-[box-shadow]`}
                  onDragStop={(_e, d) => onDragStop(el.id, d.x, d.y)}
                  onResizeStop={(_e, _dir, ref, _delta, pos) => {
                    onResizeStop(
                      el.id,
                      parseInt(ref.style.width, 10),
                      el.type === "shape" ? parseInt(ref.style.height, 10) : "auto",
                      pos.x,
                      pos.y
                    );
                  }}
                  enableResizing={{ right: true, bottom: true, bottomRight: true, left: true }}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onElementClick(el);
                  }}
                >
                  <CanvasElementRenderer el={el} onTextBlur={onTextBlur} />
                </Rnd>
              ))}
            </div>
          </div>
    );
  }
);

export default CanvasWorkspace;
