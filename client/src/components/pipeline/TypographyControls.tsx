import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Paintbrush } from "lucide-react";
import { useState } from "react";

type TextApproach = "ai" | "canvas" | "none";
type TextStyle = "bold" | "elegant" | "playful" | "minimal" | "neon" | "threed" | "gradient" | "vintage" | "graffiti";

const TEXT_STYLE_OPTIONS: { id: TextStyle; label: string; desc: string }[] = [
  { id: "bold", label: "Bold", desc: "Impactante" },
  { id: "elegant", label: "Elegante", desc: "Sofisticado" },
  { id: "playful", label: "Divertido", desc: "Criativo" },
  { id: "minimal", label: "Minimal", desc: "Limpo" },
  { id: "neon", label: "Neon", desc: "Vibrante" },
  { id: "threed", label: "3D", desc: "Dimensional" },
  { id: "gradient", label: "Gradiente", desc: "Moderno" },
  { id: "graffiti", label: "Graffiti", desc: "Urbano" },
];

interface TypographyControlsProps {
  text: string;
  position: "top" | "center" | "bottom";
  textStyle: TextStyle;
  approach: TextApproach;
  onTextChange: (value: string) => void;
  onPositionChange: (value: "top" | "center" | "bottom") => void;
  onTextStyleChange: (value: TextStyle) => void;
  onApproachChange: (value: TextApproach) => void;
  onGenerateAI: () => void;
  onOpenCanvas: () => void;
  isGenerating: boolean;
}

export default function TypographyControls({
  text,
  position,
  textStyle,
  approach,
  onTextChange,
  onPositionChange,
  onTextStyleChange,
  onApproachChange,
  onGenerateAI,
  onOpenCanvas,
  isGenerating,
}: TypographyControlsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Tipografia</h3>
        <p className="text-sm text-muted-foreground">
          Adicione texto e branding à imagem
        </p>
      </div>

      {/* Approach Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Metodo</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onApproachChange("ai")}
            className={`px-3 py-2 rounded-lg border-2 text-sm text-center transition ${
              approach === "ai"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Sparkles className="w-4 h-4 mx-auto mb-1" />
            <div className="font-medium">IA</div>
          </button>
          <button
            onClick={() => onApproachChange("canvas")}
            className={`px-3 py-2 rounded-lg border-2 text-sm text-center transition ${
              approach === "canvas"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Paintbrush className="w-4 h-4 mx-auto mb-1" />
            <div className="font-medium">Canvas</div>
          </button>
          <button
            onClick={() => onApproachChange("none")}
            className={`px-3 py-2 rounded-lg border-2 text-sm text-center transition ${
              approach === "none"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="w-4 h-4 mx-auto mb-1 flex items-center justify-center text-xs font-bold">--</div>
            <div className="font-medium">Nenhum</div>
          </button>
        </div>
      </div>

      {approach !== "none" && (
        <>
          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Texto</label>
            <input
              type="text"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Ex: OFERTA ESPECIAL"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary transition uppercase"
              maxLength={50}
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Posicao</label>
            <div className="flex gap-2">
              {(["top", "center", "bottom"] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => onPositionChange(pos)}
                  className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                    position === pos
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {pos === "top" ? "Topo" : pos === "center" ? "Centro" : "Base"}
                </button>
              ))}
            </div>
          </div>

          {/* Text Style (AI mode) */}
          {approach === "ai" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Estilo do Texto</label>
              <div className="grid grid-cols-2 gap-2">
                {TEXT_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onTextStyleChange(opt.id)}
                    className={`px-3 py-1.5 rounded-lg border-2 text-sm transition text-left ${
                      textStyle === opt.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground ml-1">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Action Buttons */}
      {approach === "ai" && (
        <Button
          onClick={onGenerateAI}
          disabled={isGenerating || !text.trim()}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando tipografia com IA...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar com Texto IA
            </>
          )}
        </Button>
      )}

      {approach === "canvas" && (
        <Button
          onClick={onOpenCanvas}
          disabled={!text.trim()}
          className="w-full gap-2"
        >
          <Paintbrush className="w-4 h-4" />
          Abrir Editor Canvas
        </Button>
      )}
    </div>
  );
}
