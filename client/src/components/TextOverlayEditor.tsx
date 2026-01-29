import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Check, RefreshCw, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TextOverlayEditorProps {
  imageUrl: string;
  caption: string;
  style?: string;
  tone?: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

type TextPosition = "top" | "center" | "bottom";

const POSITION_OPTIONS: { id: TextPosition; label: string }[] = [
  { id: "top", label: "Topo" },
  { id: "center", label: "Centro" },
  { id: "bottom", label: "Base" },
];

export default function TextOverlayEditor({
  imageUrl,
  caption,
  style,
  tone,
  onSave,
  onCancel,
}: TextOverlayEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("");
  const [position, setPosition] = useState<TextPosition>("center");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const generateTextOverlayMutation = trpc.gemini.generateTextOverlay.useMutation();

  // Generate AI text overlay on mount
  const generateAIText = useCallback(async () => {
    if (!caption) return;

    setIsGenerating(true);
    try {
      const result = await generateTextOverlayMutation.mutateAsync({
        caption,
        style,
        tone,
      });

      if (result.success && result.text) {
        setText(result.text.toUpperCase());
        setPosition(result.position);
      }
    } catch (error) {
      console.error("Error generating text overlay:", error);
      // Fallback: use first few words of caption
      const words = caption.split(/\s+/).slice(0, 4).join(" ");
      setText(words.toUpperCase());
    }
    setIsGenerating(false);
  }, [caption, style, tone, generateTextOverlayMutation]);

  // Generate AI text on mount
  useEffect(() => {
    generateAIText();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !imageLoaded) return;

    // Set canvas size to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw the image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (!text.trim()) return;

    // Scale factor based on canvas size
    const scale = canvas.width / 400;

    // Configure professional typography
    const fontSize = Math.min(48 * scale, canvas.width * 0.08);
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Apply letter spacing simulation (canvas doesn't support letterSpacing natively)
    const displayText = text.toUpperCase();

    // Measure text
    const textMetrics = ctx.measureText(displayText);
    const textWidth = textMetrics.width * 1.1; // Add 10% for letter spacing effect
    const textHeight = fontSize * 1.4;
    const padding = 24 * scale;

    // Calculate Y position based on position setting
    let baseY: number;
    if (position === "top") {
      baseY = padding * 2 + textHeight / 2;
    } else if (position === "center") {
      baseY = canvas.height / 2;
    } else {
      baseY = canvas.height - padding * 2 - textHeight / 2;
    }

    const boxX = canvas.width / 2 - textWidth / 2 - padding;
    const boxY = baseY - textHeight / 2 - padding / 2;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = textHeight + padding;
    const borderRadius = 12 * scale;

    // Draw glass effect background
    ctx.save();

    // Semi-transparent background (simulating glass effect)
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    ctx.fill();

    // Border for glass effect
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    ctx.restore();

    // Draw accent line above text
    const accentLineWidth = Math.min(60 * scale, textWidth * 0.3);
    const accentLineY = boxY + padding * 0.3;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(
      canvas.width / 2 - accentLineWidth / 2,
      accentLineY,
      accentLineWidth,
      2 * scale
    );

    // Draw text with professional shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 15 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4 * scale;
    ctx.fillStyle = "#FFFFFF";

    // Draw text with simulated letter spacing
    const chars = displayText.split("");
    const charSpacing = fontSize * 0.05;
    let totalWidth = 0;
    chars.forEach((char) => {
      totalWidth += ctx.measureText(char).width + charSpacing;
    });
    totalWidth -= charSpacing; // Remove last spacing

    let currentX = canvas.width / 2 - totalWidth / 2;
    chars.forEach((char) => {
      const charWidth = ctx.measureText(char).width;
      ctx.fillText(char, currentX + charWidth / 2, baseY);
      currentX += charWidth + charSpacing;
    });

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw accent line below text
    const bottomAccentLineY = boxY + boxHeight - padding * 0.3 - 2 * scale;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(
      canvas.width / 2 - accentLineWidth / 2,
      bottomAccentLineY,
      accentLineWidth,
      2 * scale
    );
  }, [text, position, imageLoaded]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas when settings change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  const handleRegenerate = () => {
    generateAIText();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">Adicionar Texto</h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-secondary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Preview
              </h3>
              <div className="relative rounded-lg overflow-hidden border border-border bg-secondary/30">
                <canvas ref={canvasRef} className="w-full h-auto" />
                {(!imageLoaded || isGenerating) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white" />
                      <p className="text-sm text-white">
                        {isGenerating ? "Gerando texto..." : "Carregando..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              {/* AI Generated Text Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Texto Gerado</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="gap-1 text-xs"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Regenerar
                  </Button>
                </div>
                <div className="px-4 py-3 rounded-lg border border-border bg-secondary/30">
                  <p className="text-lg font-bold tracking-wider text-center">
                    {text || (isGenerating ? "..." : "Nenhum texto")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Texto extraido automaticamente da caption
                </p>
              </div>

              {/* Position Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Posicao</label>
                <div className="flex gap-2">
                  {POSITION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPosition(opt.id)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                        position === opt.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Info */}
              <div className="bg-secondary/30 rounded-lg p-4 border border-border/50 space-y-2">
                <h4 className="text-sm font-medium">Estilo Aplicado</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Tipografia moderna (Inter Bold)</li>
                  <li>• Texto em maiusculas com espacamento</li>
                  <li>• Fundo glass com borda suave</li>
                  <li>• Sombra profissional</li>
                  <li>• Linhas decorativas de destaque</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!text.trim() || isGenerating}
            className="flex-1 gap-2"
          >
            <Check className="w-4 h-4" />
            Aplicar Texto
          </Button>
        </div>
      </div>
    </div>
  );
}
