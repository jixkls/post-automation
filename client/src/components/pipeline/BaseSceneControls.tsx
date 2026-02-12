import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface BaseSceneControlsProps {
  config: {
    topic: string;
    style: string;
    tone: string;
    goal: string;
    platform: string;
    aspectRatio: string;
    hasProductImage: boolean;
  };
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function BaseSceneControls({
  config,
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
}: BaseSceneControlsProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Cena Base</h3>
        <p className="text-sm text-muted-foreground">
          Gere a imagem fotorrealista base para o seu post
        </p>
      </div>

      {/* Config Summary */}
      <div className="bg-secondary/30 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tema:</span>
          <span className="font-medium truncate ml-2 max-w-[200px]">{config.topic}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estilo:</span>
          <span className="font-medium capitalize">{config.style}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tom:</span>
          <span className="font-medium capitalize">{config.tone}</span>
        </div>
        {config.hasProductImage && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Produto:</span>
            <span className="font-medium text-primary">Imagem anexada</span>
          </div>
        )}
      </div>

      {/* Prompt Editor Toggle */}
      <button
        onClick={() => setShowPrompt(!showPrompt)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        {showPrompt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {showPrompt ? "Ocultar prompt" : "Ver/editar prompt"}
      </button>

      {showPrompt && (
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          className="w-full h-32 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono resize-none focus:outline-none focus:border-primary transition"
          placeholder="O prompt de fotografia sera gerado automaticamente..."
        />
      )}

      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando cena base...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Gerar Cena Base
          </>
        )}
      </Button>
    </div>
  );
}
