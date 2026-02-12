import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

const TEMPERATURE_OPTIONS = [
  { id: "cool", label: "Frio" },
  { id: "neutral", label: "Neutro" },
  { id: "warm", label: "Quente" },
  { id: "golden", label: "Dourado" },
];

const CONTRAST_OPTIONS = [
  { id: "low", label: "Baixo" },
  { id: "medium", label: "Medio" },
  { id: "high", label: "Alto" },
  { id: "cinematic", label: "Cinematico" },
];

const SATURATION_OPTIONS = [
  { id: "desaturated", label: "Dessaturado" },
  { id: "natural", label: "Natural" },
  { id: "vibrant", label: "Vibrante" },
  { id: "hyper", label: "Hiper-saturado" },
];

const MOOD_PRESETS = [
  { id: "golden-hour", label: "Golden Hour", desc: "Tons quentes de por do sol" },
  { id: "blue-hour", label: "Blue Hour", desc: "Tons azuis crepusculares" },
  { id: "moody-dark", label: "Sombrio", desc: "Escuro e dramatico" },
  { id: "bright-airy", label: "Luminoso", desc: "Claro e aereo" },
  { id: "vintage-warm", label: "Vintage", desc: "Nostalgico e envelhecido" },
  { id: "neon-night", label: "Neon", desc: "Noturno com luzes neon" },
];

const FILM_STOCKS = [
  { id: "kodak-portra-400", label: "Kodak Portra 400" },
  { id: "fuji-velvia-50", label: "Fuji Velvia 50" },
  { id: "ilford-hp5", label: "Ilford HP5 (P&B)" },
  { id: "cinestill-800t", label: "CineStill 800T" },
];

interface ColorGradingControlsProps {
  temperature: string;
  contrast: string;
  saturation: string;
  mood: string;
  filmStock: string;
  onTemperatureChange: (value: string) => void;
  onContrastChange: (value: string) => void;
  onSaturationChange: (value: string) => void;
  onMoodChange: (value: string) => void;
  onFilmStockChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function ColorGradingControls({
  temperature,
  contrast,
  saturation,
  mood,
  filmStock,
  onTemperatureChange,
  onContrastChange,
  onSaturationChange,
  onMoodChange,
  onFilmStockChange,
  onGenerate,
  isGenerating,
}: ColorGradingControlsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Cor e Atmosfera</h3>
        <p className="text-sm text-muted-foreground">
          Aplique color grading e defina a atmosfera
        </p>
      </div>

      {/* Mood Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Atmosfera</label>
        <div className="grid grid-cols-2 gap-2">
          {MOOD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onMoodChange(preset.id === mood ? "" : preset.id)}
              className={`px-3 py-2 rounded-lg border-2 text-sm text-left transition ${
                mood === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium">{preset.label}</div>
              <div className="text-xs text-muted-foreground">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Temperatura</label>
        <div className="flex gap-2">
          {TEMPERATURE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onTemperatureChange(opt.id === temperature ? "" : opt.id)}
              className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                temperature === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contrast */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Contraste</label>
        <div className="flex gap-2">
          {CONTRAST_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onContrastChange(opt.id === contrast ? "" : opt.id)}
              className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                contrast === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saturation */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Saturacao</label>
        <div className="flex gap-2">
          {SATURATION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSaturationChange(opt.id === saturation ? "" : opt.id)}
              className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                saturation === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Film Stock */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Emulacao de Filme</label>
        <div className="flex gap-2 flex-wrap">
          {FILM_STOCKS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onFilmStockChange(opt.id === filmStock ? "" : opt.id)}
              className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                filmStock === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Aplicando color grading...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Aplicar Color Grading
          </>
        )}
      </Button>
    </div>
  );
}
