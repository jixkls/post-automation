import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { X, Check } from "lucide-react";

interface TextOverlayEditorProps {
  imageUrl: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

type TextPosition = "top" | "center" | "bottom";

const POSITION_OPTIONS: { id: TextPosition; label: string }[] = [
  { id: "top", label: "Topo" },
  { id: "center", label: "Centro" },
  { id: "bottom", label: "Base" },
];

const COLOR_PRESETS = [
  "#FFFFFF",
  "#000000",
  "#FF5733",
  "#FFC300",
  "#36D7B7",
  "#3498DB",
  "#9B59B6",
  "#E91E63",
];

export default function TextOverlayEditor({
  imageUrl,
  onSave,
  onCancel,
}: TextOverlayEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("");
  const [position, setPosition] = useState<TextPosition>("bottom");
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [showBackground, setShowBackground] = useState(true);
  const [bgOpacity, setBgOpacity] = useState(70);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

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

    // Configure text
    ctx.font = `bold ${fontSize * (canvas.width / 400)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Measure text
    const lines = text.split("\n");
    const lineHeight = fontSize * (canvas.width / 400) * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    const padding = 20 * (canvas.width / 400);

    // Calculate Y position based on position setting
    let baseY: number;
    if (position === "top") {
      baseY = padding + totalTextHeight / 2;
    } else if (position === "center") {
      baseY = canvas.height / 2;
    } else {
      baseY = canvas.height - padding - totalTextHeight / 2;
    }

    // Draw background if enabled
    if (showBackground) {
      const maxWidth = Math.max(
        ...lines.map((line) => ctx.measureText(line).width)
      );
      const bgPadding = padding;

      ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity / 100})`;
      ctx.beginPath();
      ctx.roundRect(
        canvas.width / 2 - maxWidth / 2 - bgPadding,
        baseY - totalTextHeight / 2 - bgPadding / 2,
        maxWidth + bgPadding * 2,
        totalTextHeight + bgPadding,
        10 * (canvas.width / 400)
      );
      ctx.fill();
    }

    // Draw text with shadow for better visibility
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4 * (canvas.width / 400);
    ctx.shadowOffsetX = 2 * (canvas.width / 400);
    ctx.shadowOffsetY = 2 * (canvas.width / 400);
    ctx.fillStyle = textColor;

    lines.forEach((line, index) => {
      const y = baseY - (totalTextHeight / 2) + (index + 0.5) * lineHeight;
      ctx.fillText(line, canvas.width / 2, y);
    });

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }, [text, position, fontSize, textColor, showBackground, bgOpacity, imageLoaded]);

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
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto"
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              {/* Text Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Texto</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Digite seu texto aqui..."
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition resize-none h-24"
                />
                <p className="text-xs text-muted-foreground">
                  Use Enter para criar novas linhas
                </p>
              </div>

              {/* Position */}
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

              {/* Font Size */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Tamanho da Fonte</label>
                  <span className="text-sm text-muted-foreground">{fontSize}px</span>
                </div>
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  min={16}
                  max={72}
                  step={2}
                  className="w-full"
                />
              </div>

              {/* Text Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cor do Texto</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        textColor === color
                          ? "border-primary scale-110"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-2 border-border"
                  />
                </div>
              </div>

              {/* Background Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Fundo do Texto</label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Adiciona uma caixa de fundo atras do texto
                    </p>
                  </div>
                  <Switch
                    checked={showBackground}
                    onCheckedChange={setShowBackground}
                  />
                </div>

                {/* Background Opacity */}
                {showBackground && (
                  <div className="space-y-3 pl-4 border-l-2 border-border">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Opacidade do Fundo</label>
                      <span className="text-sm text-muted-foreground">{bgOpacity}%</span>
                    </div>
                    <Slider
                      value={[bgOpacity]}
                      onValueChange={(value) => setBgOpacity(value[0])}
                      min={20}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                )}
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
            disabled={!text.trim()}
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
