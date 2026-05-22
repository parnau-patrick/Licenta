export type ElementType = "text" | "shape" | "badge" | "image";

export interface CanvasElementBase {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number | "auto";
  zIndex: number;
}

export interface TextElement extends CanvasElementBase {
  type: "text";
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold" | "800";
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  dropShadow: boolean;
}

export interface ShapeElement extends CanvasElementBase {
  type: "shape";
  shapeType: "rectangle" | "circle";
  backgroundColor: string;
  borderRadius?: number | string;
}

export interface BadgeElement extends CanvasElementBase {
  type: "badge";
  badgeType: "discount" | "guarantee" | "stars";
  text: string;
  backgroundColor: string;
  color: string;
}

export interface ImageElement extends CanvasElementBase {
  type: "image";
  url: string;
}

// Union type pentru orice element valid de pe canvas
export type CanvasElement = TextElement | ShapeElement | BadgeElement | ImageElement;

export const FONTS: string[] = [
  "Inter", "Arial", "Impact", "Georgia",
  "Courier New", "Trebuchet MS", "Times New Roman",
];
