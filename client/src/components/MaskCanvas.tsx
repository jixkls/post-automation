import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Square,
  Pencil,
  Eraser,
  RotateCcw,
  Undo2,
  Download,
} from "lucide-react";

type DrawingTool = "rectangle" | "brush" | "eraser";

interface MaskCanvasProps {
  imageUrl: string;
  onMaskCreated: (maskBase64: string) => void;
  onMaskCleared?: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Rectangle {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

export default function MaskCanvas({
  imageUrl,
  onMaskCreated,
  onMaskCleared,
}: MaskCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [tool, setTool] = useState<DrawingTool>("rectangle");
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Load the image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Initialize canvases when image loads
  useEffect(() => {
    if (!imageLoaded || !imageRef.current) return;

    const img = imageRef.current;
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!imageCanvas || !maskCanvas) return;

    // Set canvas dimensions to match image
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    imageCanvas.width = width;
    imageCanvas.height = height;
    maskCanvas.width = width;
    maskCanvas.height = height;

    setCanvasDimensions({ width, height });

    // Draw image on image canvas
    const imageCtx = imageCanvas.getContext("2d");
    if (imageCtx) {
      imageCtx.drawImage(img, 0, 0);
    }

    // Initialize mask canvas with transparent black
    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx) {
      maskCtx.fillStyle = "rgba(0, 0, 0, 0)";
      maskCtx.fillRect(0, 0, width, height);
      saveToHistory(maskCtx);
    }
  }, [imageLoaded]);

  const saveToHistory = useCallback((ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const drawBrushStroke = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      from: Point,
      to: Point,
      isEraser: boolean
    ) => {
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
    },
    [brushSize]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(e);
      setIsDrawing(true);
      setStartPoint(point);

      if (tool === "brush" || tool === "eraser") {
        const ctx = maskCanvasRef.current?.getContext("2d");
        if (ctx) {
          drawBrushStroke(ctx, point, point, tool === "eraser");
        }
      }
    },
    [tool, getCanvasPoint, drawBrushStroke]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !startPoint) return;

      const point = getCanvasPoint(e);

      if (tool === "rectangle") {
        setCurrentRect({
          startX: Math.min(startPoint.x, point.x),
          startY: Math.min(startPoint.y, point.y),
          width: Math.abs(point.x - startPoint.x),
          height: Math.abs(point.y - startPoint.y),
        });
      } else if (tool === "brush" || tool === "eraser") {
        const ctx = maskCanvasRef.current?.getContext("2d");
        if (ctx) {
          drawBrushStroke(ctx, startPoint, point, tool === "eraser");
          setStartPoint(point);
        }
      }
    },
    [isDrawing, startPoint, tool, getCanvasPoint, drawBrushStroke]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    if (tool === "rectangle" && currentRect) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(
        currentRect.startX,
        currentRect.startY,
        currentRect.width,
        currentRect.height
      );
      setCurrentRect(null);
    }

    saveToHistory(ctx);
    setIsDrawing(false);
    setStartPoint(null);

    // Export mask
    exportMask();
  }, [isDrawing, tool, currentRect, saveToHistory]);

  const exportMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    // Create a new canvas for the mask export
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = maskCanvas.width;
    exportCanvas.height = maskCanvas.height;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Fill with black background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the mask (white areas from our mask canvas)
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    const maskData = maskCtx.getImageData(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height
    );
    const exportData = ctx.getImageData(
      0,
      0,
      exportCanvas.width,
      exportCanvas.height
    );

    // Convert: any pixel with alpha > 0 becomes white
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 0) {
        exportData.data[i] = 255; // R
        exportData.data[i + 1] = 255; // G
        exportData.data[i + 2] = 255; // B
        exportData.data[i + 3] = 255; // A
      }
    }

    ctx.putImageData(exportData, 0, 0);

    // Export as base64
    const dataUrl = exportCanvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    onMaskCreated(base64);
  }, [onMaskCreated]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;

    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
    exportMask();
  }, [historyIndex, history, exportMask]);

  const handleClear = useCallback(() => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    saveToHistory(ctx);
    onMaskCleared?.();
  }, [saveToHistory, onMaskCleared]);

  const downloadMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const link = document.createElement("a");
    link.download = "mask.png";
    link.href = maskCanvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
        <span className="text-sm font-medium text-primary">Ferramentas:</span>
        <div className="flex gap-1">
          <Button
            variant={tool === "rectangle" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("rectangle")}
            className="gap-1"
          >
            <Square className="w-4 h-4" />
            Retangulo
          </Button>
          <Button
            variant={tool === "brush" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("brush")}
            className="gap-1"
          >
            <Pencil className="w-4 h-4" />
            Pincel
          </Button>
          <Button
            variant={tool === "eraser" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("eraser")}
            className="gap-1"
          >
            <Eraser className="w-4 h-4" />
            Borracha
          </Button>
        </div>

        {(tool === "brush" || tool === "eraser") && (
          <div className="flex items-center gap-2 px-2 border-l border-border">
            <span className="text-xs text-muted-foreground">Tamanho:</span>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 h-2 accent-primary"
            />
            <span className="text-xs text-muted-foreground w-8">
              {brushSize}px
            </span>
          </div>
        )}

        <div className="flex gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Desfazer"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            title="Limpar"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadMask}
            title="Baixar mascara"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-border bg-secondary/30"
        style={{ maxWidth: "100%" }}
      >
        {/* Image Canvas (background) */}
        <canvas
          ref={imageCanvasRef}
          className="w-full h-auto"
          style={{ display: imageLoaded ? "block" : "none" }}
        />

        {/* Mask Canvas (overlay) */}
        <canvas
          ref={maskCanvasRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair"
          style={{
            display: imageLoaded ? "block" : "none",
            mixBlendMode: "normal",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Rectangle Preview */}
        {currentRect && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
            style={{
              left: `${(currentRect.startX / canvasDimensions.width) * 100}%`,
              top: `${(currentRect.startY / canvasDimensions.height) * 100}%`,
              width: `${(currentRect.width / canvasDimensions.width) * 100}%`,
              height: `${(currentRect.height / canvasDimensions.height) * 100}%`,
            }}
          />
        )}

        {/* Loading State */}
        {!imageLoaded && (
          <div className="flex items-center justify-center h-64 bg-secondary/50">
            <div className="animate-pulse text-muted-foreground">
              Carregando imagem...
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Retangulo:</strong> Clique e arraste para selecionar area
        </p>
        <p>
          <strong>Pincel:</strong> Desenhe areas de forma livre
        </p>
        <p>
          <strong>Borracha:</strong> Apague partes da selecao
        </p>
        <p className="text-primary/80">
          Areas brancas serao editadas pela IA
        </p>
      </div>
    </div>
  );
}
