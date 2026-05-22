import { useState, useEffect } from "react";
import type {
  CanvasElement,
  TextElement,
  ShapeElement,
  BadgeElement,
} from "../types/canvas.types";
import type { MarketingCopy } from "../lib/api";

interface UseCanvasElementsParams {
  variantId: string;
  copy: MarketingCopy | null;
  cutoutUrl: string | null;
}

interface UseCanvasElementsReturn {
  elements: CanvasElement[];
  selectedId: string | null;
  selectedEl: CanvasElement | undefined;
  setSelectedId: (id: string | null) => void;
  addText: () => void;
  addShape: (shapeType: "rectangle" | "circle") => void;
  addBadge: (badgeType: "discount" | "guarantee") => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  changeZIndex: (id: string, delta: number) => void;
}

function createTextElement(
  id: string,
  text: string,
  x: number,
  y: number,
  color: string,
  size: number,
  weight: "bold" | "normal" = "bold"
): TextElement {
  return {
    id, type: "text", text, x, y,
    width: 300, height: "auto", zIndex: 10,
    color, fontSize: size, fontFamily: "Inter",
    fontWeight: weight, fontStyle: "normal",
    textAlign: "left", dropShadow: true,
  };
}

export function useCanvasElements({ variantId, copy, cutoutUrl }: UseCanvasElementsParams): UseCanvasElementsReturn {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Inițializare elemente canvas în funcție de varianta AI selectată
  useEffect(() => {
    if (!copy) return;
    const initial: CanvasElement[] = [];

    if (variantId === "var-1") {
      initial.push(createTextElement("v1", copy.title, 40, 40, "#ffffff", 28));
      copy.benefits.forEach((benefit, index) => {
        initial.push(createTextElement(`b${index}`, `✔️ ${benefit}`, 40, 100 + index * 35, "#4ade80", 18, "normal"));
      });
      initial.push({
        id: "bg-shape", type: "shape", shapeType: "rectangle",
        x: 20, y: 20, width: 340, height: 280, zIndex: 5,
        backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 16,
      });
    } else if (variantId === "var-4") {
      initial.push(createTextElement("v4-t", `"${copy.review.text}"`, 30, 320, "#ffffff", 22));
      initial.push(createTextElement("v4-n", `— ${copy.review.name}`, 30, 400, "#94a3b8", 16, "normal"));
      initial.push({
        id: "badge-stars", type: "badge", badgeType: "stars",
        text: "⭐⭐⭐⭐⭐", x: 30, y: 280, width: 150, height: 30,
        zIndex: 10, backgroundColor: "transparent", color: "#fbbf24",
      });
    } else {
      initial.push(createTextElement("v-default", "Editează Design-ul...", 50, 50, "#ffffff", 24));
    }

    setElements(initial);
  }, [variantId, copy, cutoutUrl]);

  const addText = () => {
    const newEl: TextElement = {
      id: `text-${Date.now()}`, type: "text", text: "Text Nou...",
      x: 150, y: 150, width: 250, height: "auto", zIndex: elements.length + 10,
      color: "#ffffff", fontSize: 28, fontFamily: "Inter",
      fontWeight: "bold", fontStyle: "normal", textAlign: "center", dropShadow: true,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const addShape = (shapeType: "rectangle" | "circle") => {
    const newEl: ShapeElement = {
      id: `shape-${Date.now()}`, type: "shape", shapeType,
      x: 100, y: 100, width: 150, height: 150, zIndex: elements.length + 5,
      backgroundColor: "#ec4899",
      borderRadius: shapeType === "circle" ? "50%" : 12,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const addBadge = (badgeType: "discount" | "guarantee") => {
    const newEl: BadgeElement = {
      id: `badge-${Date.now()}`, type: "badge", badgeType,
      text: badgeType === "discount" ? "-50% REDUCERE" : "100% GARANȚIE",
      x: 300, y: 30,
      width: badgeType === "discount" ? 180 : 150,
      height: 150, zIndex: elements.length + 15,
      backgroundColor: badgeType === "discount" ? "#ef4444" : "#10b981",
      color: "#ffffff",
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? ({ ...el, ...updates } as CanvasElement) : el))
    );
  };

  const deleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const changeZIndex = (id: string, delta: number) => {
    setElements((prev) =>
      prev.map((el) => el.id === id ? { ...el, zIndex: Math.max(0, el.zIndex + delta) } : el)
    );
  };

  return {
    elements,
    selectedId,
    selectedEl: elements.find((el) => el.id === selectedId),
    setSelectedId,
    addText,
    addShape,
    addBadge,
    updateElement,
    deleteElement,
    changeZIndex,
  };
}
