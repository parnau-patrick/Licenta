import type { CanvasElement } from "../../types/canvas.types";

interface CanvasElementRendererProps {
  el: CanvasElement;
  onTextBlur: (id: string, newText: string) => void;
}

export default function CanvasElementRenderer({ el, onTextBlur }: CanvasElementRendererProps) {
  if (el.type === "text") {
    return (
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onTextBlur(el.id, e.currentTarget.textContent || "")}
        className="w-full h-full outline-none leading-none cursor-text select-text"
        style={{
          color: el.color,
          fontSize: `${el.fontSize}px`,
          fontFamily: el.fontFamily,
          fontWeight: el.fontWeight,
          fontStyle: el.fontStyle,
          textAlign: el.textAlign,
          textShadow: el.dropShadow ? "0px 4px 15px rgba(0,0,0,0.8)" : "none",
          lineHeight: "1.1",
        }}
      >
        {el.text}
      </div>
    );
  }

  if (el.type === "shape") {
    return (
      <div
        className="w-full h-full shadow-lg"
        style={{ backgroundColor: el.backgroundColor, borderRadius: el.borderRadius }}
      />
    );
  }

  if (el.type === "image") {
    return (
      <img
        src={el.url}
        alt="Product Cutout"
        className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
        crossOrigin="anonymous"
      />
    );
  }

  if (el.type === "badge") {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: el.backgroundColor, borderRadius: "50%" }}
      >
        <span
          style={{ color: el.color }}
          className="font-black text-center leading-none px-4 drop-shadow-md"
        >
          {el.text.split(" ").map((word) => (
            <div
              key={word}
              className={`${el.badgeType === "discount" ? "text-2xl" : "text-lg"} uppercase`}
            >
              {word}
            </div>
          ))}
        </span>
      </div>
    );
  }

  return null;
}
