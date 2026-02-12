import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

const BACKGROUND_PRESETS = [
  { id: "studio", label: "Estudio", desc: "Fundo limpo de estudio" },
  { id: "outdoor", label: "Externo", desc: "Cenario ao ar livre" },
  { id: "urban", label: "Urbano", desc: "Ambiente da cidade" },
  { id: "nature", label: "Natureza", desc: "Ambiente natural" },
  { id: "abstract", label: "Abstrato", desc: "Fundo gradiente/textura" },
];

const FRAMING_OPTIONS = [
  { id: "closeup", label: "Close-up" },
  { id: "medium", label: "Medio" },
  { id: "wide", label: "Amplo" },
  { id: "full", label: "Corpo inteiro" },
];

const CAMERA_ANGLES = [
  { id: "eye-level", label: "Nivel dos olhos" },
  { id: "high-angle", label: "Plongee" },
  { id: "low-angle", label: "Contra-plongee" },
  { id: "dutch-angle", label: "Holandês" },
];

const DOF_OPTIONS = [
  { id: "shallow", label: "Raso (bokeh)" },
  { id: "medium", label: "Medio" },
  { id: "deep", label: "Profundo (tudo nitido)" },
];

interface CompositionControlsProps {
  background: string;
  framing: string;
  cameraAngle: string;
  depthOfField: string;
  onBackgroundChange: (value: string) => void;
  onFramingChange: (value: string) => void;
  onCameraAngleChange: (value: string) => void;
  onDepthOfFieldChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function CompositionControls({
  background,
  framing,
  cameraAngle,
  depthOfField,
  onBackgroundChange,
  onFramingChange,
  onCameraAngleChange,
  onDepthOfFieldChange,
  onGenerate,
  isGenerating,
}: CompositionControlsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Composicao</h3>
        <p className="text-sm text-muted-foreground">
          Ajuste fundo, enquadramento e perspectiva
        </p>
      </div>

      {/* Background */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fundo</label>
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onBackgroundChange(preset.id === background ? "" : preset.id)}
              className={`px-3 py-2 rounded-lg border-2 text-sm text-left transition ${
                background === preset.id
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

      {/* Framing */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Enquadramento</label>
        <div className="flex gap-2 flex-wrap">
          {FRAMING_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onFramingChange(opt.id === framing ? "" : opt.id)}
              className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                framing === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Angle */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Angulo da Camera</label>
        <div className="flex gap-2 flex-wrap">
          {CAMERA_ANGLES.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onCameraAngleChange(opt.id === cameraAngle ? "" : opt.id)}
              className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                cameraAngle === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Depth of Field */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Profundidade de Campo</label>
        <div className="flex gap-2 flex-wrap">
          {DOF_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onDepthOfFieldChange(opt.id === depthOfField ? "" : opt.id)}
              className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                depthOfField === opt.id
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
            Refinando composicao...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Refinar Composicao
          </>
        )}
      </Button>
    </div>
  );
}
