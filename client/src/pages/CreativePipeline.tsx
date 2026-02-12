import { useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  SkipForward,
  RotateCcw,
  Copy,
  Check,
  Download,
  Save,
  FileText,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import PipelineStepIndicator, { type StepStatus } from "@/components/pipeline/PipelineStepIndicator";
import BaseSceneControls from "@/components/pipeline/BaseSceneControls";
import CompositionControls from "@/components/pipeline/CompositionControls";
import ColorGradingControls from "@/components/pipeline/ColorGradingControls";
import TypographyControls from "@/components/pipeline/TypographyControls";
import TextOverlayEditor from "@/components/TextOverlayEditor";

// -- Constants --

const STYLES = [
  { id: "minimalist", label: "Minimalista", desc: "Limpo e elegante" },
  { id: "creative", label: "Criativo", desc: "Colorido e vibrante" },
  { id: "professional", label: "Profissional", desc: "Corporativo e formal" },
  { id: "casual", label: "Casual", desc: "Descontraido e amigavel" },
  { id: "luxury", label: "Luxo", desc: "Premium e sofisticado" },
];

const TONES = [
  { id: "funny", label: "Engracado", desc: "Humor e leveza" },
  { id: "inspiring", label: "Inspirador", desc: "Motivacional" },
  { id: "urgent", label: "Urgente", desc: "Chamado a acao" },
  { id: "educational", label: "Educativo", desc: "Informativo" },
  { id: "emotional", label: "Emocional", desc: "Conexao pessoal" },
];

const GOALS = [
  { id: "engagement", label: "Engajamento", desc: "Likes e comentarios" },
  { id: "sales", label: "Vendas", desc: "Conversao" },
  { id: "awareness", label: "Conscientizacao", desc: "Alcance" },
  { id: "community", label: "Comunidade", desc: "Conexao" },
  { id: "traffic", label: "Trafego", desc: "Cliques" },
];

const ASPECT_RATIOS: Record<string, { id: string; label: string; ratio: string; desc: string }[]> = {
  instagram: [
    { id: "feed", label: "Feed", ratio: "1:1", desc: "1080x1080px" },
    { id: "story", label: "Story", ratio: "9:16", desc: "1080x1920px" },
    { id: "reel", label: "Reel", ratio: "9:16", desc: "1080x1920px" },
  ],
  facebook: [
    { id: "feed", label: "Feed", ratio: "4:5", desc: "1200x1500px" },
    { id: "story", label: "Story", ratio: "9:16", desc: "1080x1920px" },
  ],
  twitter: [
    { id: "post", label: "Post", ratio: "16:9", desc: "1200x675px" },
    { id: "card", label: "Card", ratio: "2:1", desc: "1200x600px" },
  ],
  linkedin: [
    { id: "post", label: "Post", ratio: "1.91:1", desc: "1200x628px" },
    { id: "image", label: "Imagem", ratio: "4:5", desc: "1200x1500px" },
  ],
};

// -- Types --

type ConfigStep = "topic" | "product" | "settings";
type PipelineStep = "baseScene" | "composition" | "colorGrading" | "typography";
type Phase = "config" | "pipeline" | "done";

type TextApproach = "ai" | "canvas" | "none";
type TextStyle = "bold" | "elegant" | "playful" | "minimal" | "neon" | "threed" | "gradient" | "vintage" | "graffiti";

interface StepResult {
  imageUrl: string;
  status: "done" | "skipped";
}

interface State {
  phase: Phase;
  configStep: ConfigStep;
  pipelineStep: PipelineStep;

  // Config
  topic: string;
  productImage: string;
  preserveModel: boolean;
  platform: "instagram" | "facebook" | "twitter" | "linkedin";
  aspectRatio: string;
  style: string;
  tone: string;
  goal: string;

  // Pipeline results per step
  caption: string;
  baseScenePrompt: string;
  stepResults: Partial<Record<PipelineStep, StepResult>>;

  // Composition settings
  compositionBackground: string;
  compositionFraming: string;
  compositionCameraAngle: string;
  compositionDepthOfField: string;

  // Color grading settings
  colorTemperature: string;
  colorContrast: string;
  colorSaturation: string;
  colorMood: string;
  colorFilmStock: string;

  // Typography settings
  typographyText: string;
  typographyPosition: "top" | "center" | "bottom";
  typographyStyle: TextStyle;
  typographyApproach: TextApproach;

  // UI state
  showCanvasEditor: boolean;
}

type Action =
  | { type: "SET_CONFIG"; field: string; value: unknown }
  | { type: "NEXT_CONFIG_STEP" }
  | { type: "PREV_CONFIG_STEP" }
  | { type: "START_PIPELINE"; caption: string }
  | { type: "SET_PROMPT"; prompt: string }
  | { type: "COMPLETE_STEP"; step: PipelineStep; imageUrl: string }
  | { type: "SKIP_STEP"; step: PipelineStep }
  | { type: "GO_TO_STEP"; step: PipelineStep }
  | { type: "FINISH" }
  | { type: "RESET" }
  | { type: "SET_CANVAS_EDITOR"; open: boolean }
  | { type: "CANVAS_SAVE"; imageUrl: string };

const CONFIG_STEPS: ConfigStep[] = ["topic", "product", "settings"];
const PIPELINE_STEPS: PipelineStep[] = ["baseScene", "composition", "colorGrading", "typography"];

const INITIAL_STATE: State = {
  phase: "config",
  configStep: "topic",
  pipelineStep: "baseScene",
  topic: "",
  productImage: "",
  preserveModel: false,
  platform: "instagram",
  aspectRatio: "",
  style: "",
  tone: "",
  goal: "",
  caption: "",
  baseScenePrompt: "",
  stepResults: {},
  compositionBackground: "",
  compositionFraming: "",
  compositionCameraAngle: "",
  compositionDepthOfField: "",
  colorTemperature: "",
  colorContrast: "",
  colorSaturation: "",
  colorMood: "",
  colorFilmStock: "",
  typographyText: "",
  typographyPosition: "center",
  typographyStyle: "bold",
  typographyApproach: "none",
  showCanvasEditor: false,
};

function invalidateFromStep(results: Partial<Record<PipelineStep, StepResult>>, fromStep: PipelineStep) {
  const idx = PIPELINE_STEPS.indexOf(fromStep);
  const newResults = { ...results };
  for (let i = idx; i < PIPELINE_STEPS.length; i++) {
    delete newResults[PIPELINE_STEPS[i]];
  }
  return newResults;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_CONFIG":
      return { ...state, [action.field]: action.value };

    case "NEXT_CONFIG_STEP": {
      const idx = CONFIG_STEPS.indexOf(state.configStep);
      if (idx < CONFIG_STEPS.length - 1) {
        return { ...state, configStep: CONFIG_STEPS[idx + 1] };
      }
      return state;
    }

    case "PREV_CONFIG_STEP": {
      const idx = CONFIG_STEPS.indexOf(state.configStep);
      if (idx > 0) {
        return { ...state, configStep: CONFIG_STEPS[idx - 1] };
      }
      return state;
    }

    case "START_PIPELINE":
      return {
        ...state,
        phase: "pipeline",
        pipelineStep: "baseScene",
        caption: action.caption,
      };

    case "SET_PROMPT":
      return { ...state, baseScenePrompt: action.prompt };

    case "COMPLETE_STEP": {
      const newResults = { ...state.stepResults, [action.step]: { imageUrl: action.imageUrl, status: "done" as const } };
      const idx = PIPELINE_STEPS.indexOf(action.step);
      const nextStep = idx < PIPELINE_STEPS.length - 1 ? PIPELINE_STEPS[idx + 1] : action.step;
      const isLast = idx === PIPELINE_STEPS.length - 1;
      return {
        ...state,
        stepResults: newResults,
        pipelineStep: isLast ? action.step : nextStep,
        phase: isLast ? "done" : state.phase,
      };
    }

    case "SKIP_STEP": {
      const newResults = { ...state.stepResults, [action.step]: { imageUrl: "", status: "skipped" as const } };
      const idx = PIPELINE_STEPS.indexOf(action.step);
      const nextStep = idx < PIPELINE_STEPS.length - 1 ? PIPELINE_STEPS[idx + 1] : action.step;
      const isLast = idx === PIPELINE_STEPS.length - 1;
      return {
        ...state,
        stepResults: newResults,
        pipelineStep: isLast ? action.step : nextStep,
        phase: isLast ? "done" : state.phase,
      };
    }

    case "GO_TO_STEP": {
      // Going back invalidates subsequent steps
      return {
        ...state,
        pipelineStep: action.step,
        stepResults: invalidateFromStep(state.stepResults, action.step),
        phase: "pipeline",
      };
    }

    case "FINISH":
      return { ...state, phase: "done" };

    case "RESET":
      return { ...INITIAL_STATE };

    case "SET_CANVAS_EDITOR":
      return { ...state, showCanvasEditor: action.open };

    case "CANVAS_SAVE": {
      const newResults = { ...state.stepResults, typography: { imageUrl: action.imageUrl, status: "done" as const } };
      return { ...state, stepResults: newResults, showCanvasEditor: false, phase: "done" };
    }

    default:
      return state;
  }
}

function getPreviousStepImage(state: State): string | null {
  const currentIdx = PIPELINE_STEPS.indexOf(state.pipelineStep);
  for (let i = currentIdx - 1; i >= 0; i--) {
    const result = state.stepResults[PIPELINE_STEPS[i]];
    if (result?.status === "done" && result.imageUrl) {
      return result.imageUrl;
    }
  }
  return null;
}

function getLatestImage(state: State): string | null {
  for (let i = PIPELINE_STEPS.length - 1; i >= 0; i--) {
    const result = state.stepResults[PIPELINE_STEPS[i]];
    if (result?.status === "done" && result.imageUrl) {
      return result.imageUrl;
    }
  }
  return null;
}

// -- Component --

export default function CreativePipeline() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations
  const generateCaptionMutation = trpc.creativePipeline.generateCaption.useMutation();
  const generateBaseSceneMutation = trpc.creativePipeline.generateBaseScene.useMutation();
  const refineCompositionMutation = trpc.creativePipeline.refineComposition.useMutation();
  const applyColorGradingMutation = trpc.creativePipeline.applyColorGrading.useMutation();
  const applyTypographyMutation = trpc.creativePipeline.applyTypography.useMutation();

  const templatesQuery = trpc.templates.list.useQuery(undefined, { enabled: true });
  const incrementUseCountMutation = trpc.templates.incrementUseCount.useMutation();
  const savePostMutation = trpc.posts.savePost.useMutation();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (max 5MB)"); return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      dispatch({ type: "SET_CONFIG", field: "productImage", value: event.target?.result as string });
      toast.success("Imagem carregada!");
    };
    reader.readAsDataURL(file);
  };

  const handleLoadTemplate = (template: NonNullable<typeof templatesQuery.data>["templates"][0]) => {
    dispatch({ type: "SET_CONFIG", field: "platform", value: template.platform });
    if (template.aspectRatio) dispatch({ type: "SET_CONFIG", field: "aspectRatio", value: template.aspectRatio });
    if (template.style) dispatch({ type: "SET_CONFIG", field: "style", value: template.style });
    if (template.tone) dispatch({ type: "SET_CONFIG", field: "tone", value: template.tone });
    if (template.goal) dispatch({ type: "SET_CONFIG", field: "goal", value: template.goal });
    setShowTemplateDropdown(false);
    incrementUseCountMutation.mutate({ id: template.id });
    toast.success(`Template "${template.name}" carregado!`);
  };

  // -- Config navigation --

  const handleConfigNext = async () => {
    if (state.configStep === "topic" && !state.topic.trim()) {
      toast.error("Digite um tema");
      return;
    }

    if (state.configStep === "settings") {
      if (!state.style || !state.tone || !state.goal) {
        toast.error("Preencha estilo, tom e objetivo");
        return;
      }
      // Generate caption and start pipeline
      setIsGenerating(true);
      try {
        const result = await generateCaptionMutation.mutateAsync({
          topic: state.topic,
          style: state.style,
          tone: state.tone,
          goal: state.goal,
          platform: state.platform,
        });
        dispatch({ type: "START_PIPELINE", caption: result.caption || "" });
      } catch {
        toast.error("Erro ao gerar caption");
      }
      setIsGenerating(false);
      return;
    }

    dispatch({ type: "NEXT_CONFIG_STEP" });
  };

  const handleConfigBack = () => {
    dispatch({ type: "PREV_CONFIG_STEP" });
  };

  // -- Pipeline actions --

  const handleGenerateBaseScene = async () => {
    setIsGenerating(true);
    try {
      const result = await generateBaseSceneMutation.mutateAsync({
        topic: state.topic,
        style: state.style,
        tone: state.tone,
        goal: state.goal,
        platform: state.platform,
        aspectRatio: state.aspectRatio || undefined,
        productImageUrl: state.productImage || undefined,
        preserveModel: state.preserveModel,
        promptOverride: state.baseScenePrompt || undefined,
      });

      if (result.success && result.imageUrl) {
        dispatch({ type: "COMPLETE_STEP", step: "baseScene", imageUrl: result.imageUrl });
        if (result.prompt) dispatch({ type: "SET_PROMPT", prompt: result.prompt });
        toast.success("Cena base gerada!");
      } else {
        toast.error(result.error || "Erro ao gerar cena base");
      }
    } catch {
      toast.error("Erro ao gerar cena base");
    }
    setIsGenerating(false);
  };

  const handleRefineComposition = async () => {
    const previousImage = getPreviousStepImage({ ...state, pipelineStep: "composition" });
    if (!previousImage) { toast.error("Nenhuma imagem anterior"); return; }

    setIsGenerating(true);
    try {
      const result = await refineCompositionMutation.mutateAsync({
        previousImageUrl: previousImage,
        background: state.compositionBackground || undefined,
        framing: state.compositionFraming || undefined,
        cameraAngle: state.compositionCameraAngle || undefined,
        depthOfField: state.compositionDepthOfField || undefined,
      });

      if (result.success && result.imageUrl) {
        dispatch({ type: "COMPLETE_STEP", step: "composition", imageUrl: result.imageUrl });
        toast.success("Composicao refinada!");
      } else {
        toast.error(result.error || "Erro ao refinar composicao");
      }
    } catch {
      toast.error("Erro ao refinar composicao");
    }
    setIsGenerating(false);
  };

  const handleApplyColorGrading = async () => {
    const previousImage = getPreviousStepImage({ ...state, pipelineStep: "colorGrading" });
    if (!previousImage) { toast.error("Nenhuma imagem anterior"); return; }

    setIsGenerating(true);
    try {
      const result = await applyColorGradingMutation.mutateAsync({
        previousImageUrl: previousImage,
        temperature: state.colorTemperature || undefined,
        contrast: state.colorContrast || undefined,
        saturation: state.colorSaturation || undefined,
        mood: state.colorMood || undefined,
        filmStock: state.colorFilmStock || undefined,
      });

      if (result.success && result.imageUrl) {
        dispatch({ type: "COMPLETE_STEP", step: "colorGrading", imageUrl: result.imageUrl });
        toast.success("Color grading aplicado!");
      } else {
        toast.error(result.error || "Erro ao aplicar color grading");
      }
    } catch {
      toast.error("Erro ao aplicar color grading");
    }
    setIsGenerating(false);
  };

  const handleApplyTypographyAI = async () => {
    const previousImage = getPreviousStepImage({ ...state, pipelineStep: "typography" });
    if (!previousImage) { toast.error("Nenhuma imagem anterior"); return; }

    setIsGenerating(true);
    try {
      const result = await applyTypographyMutation.mutateAsync({
        previousImageUrl: previousImage,
        text: state.typographyText,
        position: state.typographyPosition,
        textStyle: state.typographyStyle,
      });

      if (result.success && result.imageUrl) {
        dispatch({ type: "COMPLETE_STEP", step: "typography", imageUrl: result.imageUrl });
        toast.success("Tipografia aplicada!");
      } else {
        toast.error(result.error || "Erro ao aplicar tipografia");
      }
    } catch {
      toast.error("Erro ao aplicar tipografia");
    }
    setIsGenerating(false);
  };

  const handleSkipStep = () => {
    dispatch({ type: "SKIP_STEP", step: state.pipelineStep });
  };

  const handleStepClick = (stepId: string) => {
    dispatch({ type: "GO_TO_STEP", step: stepId as PipelineStep });
  };

  const handleSavePost = () => {
    const finalImage = getLatestImage(state);
    savePostMutation.mutate({
      topic: state.topic,
      platform: state.platform,
      aspectRatio: state.aspectRatio || undefined,
      style: state.style || undefined,
      tone: state.tone || undefined,
      goal: state.goal || undefined,
      caption: state.caption,
      imagePrompt: state.baseScenePrompt || undefined,
      imageUrl: finalImage || undefined,
      productImageUrl: state.productImage || undefined,
      status: finalImage ? "ready" : "draft",
    }, {
      onSuccess: (data) => {
        if (data.success) toast.success("Post salvo!");
        else toast.error(data.error || "Erro ao salvar");
      },
      onError: () => toast.error("Erro ao salvar post"),
    });
  };

  const handleDownloadImage = async () => {
    const finalImage = getLatestImage(state);
    if (!finalImage) return;
    try {
      const response = await fetch(finalImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pipeline-${state.platform}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Imagem baixada!");
    } catch {
      toast.error("Erro ao baixar imagem");
    }
  };

  // Derive step statuses for indicator
  const pipelineStepStatuses = PIPELINE_STEPS.map((step): { id: string; label: string; status: StepStatus } => {
    const labels: Record<PipelineStep, string> = {
      baseScene: "Cena Base",
      composition: "Composicao",
      colorGrading: "Cor",
      typography: "Tipografia",
    };
    const result = state.stepResults[step];
    let status: StepStatus = "pending";
    if (step === state.pipelineStep && state.phase === "pipeline") status = "active";
    else if (result?.status === "done") status = "done";
    else if (result?.status === "skipped") status = "skipped";

    return { id: step, label: labels[step], status };
  });

  const currentPreviewImage = getPreviousStepImage(state) || getLatestImage(state);
  const configProgress = (CONFIG_STEPS.indexOf(state.configStep) + 1) / CONFIG_STEPS.length * 100;

  return (
    <div className="p-4">
      <div className={`mx-auto ${state.phase === "pipeline" || state.phase === "done" ? "max-w-5xl" : "max-w-2xl"}`}>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1">Pipeline Criativo</h1>
          <p className="text-sm text-muted-foreground">
            {state.phase === "config" ? "Configure seu post" : state.phase === "pipeline" ? "Refine sua imagem passo a passo" : "Seu post esta pronto!"}
          </p>
        </div>

        {/* ---- PHASE 1: CONFIG ---- */}
        {state.phase === "config" && (
          <>
            {/* Progress */}
            <div className="mb-6">
              <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${configProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Passo {CONFIG_STEPS.indexOf(state.configStep) + 1} de {CONFIG_STEPS.length}
              </p>
            </div>

            <Card className="p-8 border-border/50 shadow-lg">
              {/* Step 1: Topic + Template */}
              {state.configStep === "topic" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Qual e o tema do post?</h2>
                    <p className="text-muted-foreground mb-4">Descreva sobre o que voce quer falar</p>
                  </div>

                  {/* Template Dropdown */}
                  {templatesQuery.data?.templates && templatesQuery.data.templates.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          Carregar Template
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showTemplateDropdown ? "rotate-180" : ""}`} />
                      </button>
                      {showTemplateDropdown && (
                        <div className="absolute z-10 w-full mt-2 py-2 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {templatesQuery.data.templates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleLoadTemplate(template)}
                              className="w-full px-4 py-2 text-left hover:bg-secondary/50 transition"
                            >
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {template.platform} - {template.style} - {template.tone}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Ex: Novo produto de cafe, promocao de verao, dica de produtividade..."
                    value={state.topic}
                    onChange={(e) => dispatch({ type: "SET_CONFIG", field: "topic", value: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition"
                  />
                </div>
              )}

              {/* Step 2: Product (optional) */}
              {state.configStep === "product" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Imagem do produto (opcional)</h2>
                    <p className="text-muted-foreground mb-4">Adicione uma imagem de referencia ou pule</p>
                  </div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <p className="text-muted-foreground">Clique ou arraste uma imagem aqui</p>
                  </div>
                  {state.productImage && (
                    <>
                      <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">Imagem carregada</p>
                        <img src={state.productImage} alt="Product" className="max-h-40 mx-auto object-contain" />
                        <button
                          onClick={() => dispatch({ type: "SET_CONFIG", field: "productImage", value: "" })}
                          className="mt-2 text-xs text-destructive hover:underline"
                        >
                          Remover imagem
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50">
                        <div>
                          <label className="text-sm font-medium">Manter Pessoa</label>
                          <p className="text-xs text-muted-foreground">Preserva a pessoa da imagem de referencia</p>
                        </div>
                        <Switch
                          checked={state.preserveModel}
                          onCheckedChange={(val) => dispatch({ type: "SET_CONFIG", field: "preserveModel", value: val })}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Settings (compact) */}
              {state.configStep === "settings" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Configuracoes</h2>
                    <p className="text-muted-foreground mb-4">Plataforma, estilo, tom e objetivo</p>
                  </div>

                  {/* Platform */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rede Social</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["instagram", "facebook", "twitter", "linkedin"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            dispatch({ type: "SET_CONFIG", field: "platform", value: p });
                            dispatch({ type: "SET_CONFIG", field: "aspectRatio", value: "" });
                          }}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium capitalize transition ${
                            state.platform === p
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Proporcao</label>
                    <div className="flex gap-2 flex-wrap">
                      {ASPECT_RATIOS[state.platform]?.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => dispatch({ type: "SET_CONFIG", field: "aspectRatio", value: a.id })}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition ${
                            state.aspectRatio === a.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="font-medium">{a.label}</span>
                          <span className="text-xs text-muted-foreground ml-1">{a.ratio}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estilo Visual</label>
                    <div className="grid grid-cols-3 gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => dispatch({ type: "SET_CONFIG", field: "style", value: s.id })}
                          className={`px-3 py-2 rounded-lg border-2 text-sm text-left transition ${
                            state.style === s.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium">{s.label}</div>
                          <div className="text-xs text-muted-foreground">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tom de Voz</label>
                    <div className="grid grid-cols-3 gap-2">
                      {TONES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => dispatch({ type: "SET_CONFIG", field: "tone", value: t.id })}
                          className={`px-3 py-2 rounded-lg border-2 text-sm text-left transition ${
                            state.tone === t.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Goal */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Objetivo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {GOALS.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => dispatch({ type: "SET_CONFIG", field: "goal", value: g.id })}
                          className={`px-3 py-2 rounded-lg border-2 text-sm text-left transition ${
                            state.goal === g.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium">{g.label}</div>
                          <div className="text-xs text-muted-foreground">{g.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Config Navigation */}
              <div className="flex gap-3 mt-8">
                {state.configStep !== "topic" && (
                  <Button onClick={handleConfigBack} variant="outline" className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </Button>
                )}
                <Button
                  onClick={handleConfigNext}
                  disabled={isGenerating}
                  className="flex-1 gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparando pipeline...
                    </>
                  ) : state.configStep === "settings" ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Iniciar Pipeline Criativo
                    </>
                  ) : state.configStep === "product" && !state.productImage ? (
                    <>
                      Pular
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Proximo
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* ---- PHASE 2: PIPELINE ---- */}
        {state.phase === "pipeline" && (
          <>
            {/* Step Indicator */}
            <div className="mb-6">
              <PipelineStepIndicator steps={pipelineStepStatuses} onStepClick={handleStepClick} />
            </div>

            <div className="grid md:grid-cols-5 gap-6">
              {/* Left: Image Preview */}
              <div className="md:col-span-3">
                <Card className="p-4 border-border/50">
                  {currentPreviewImage ? (
                    <div className="rounded-lg overflow-hidden bg-secondary/10">
                      <img
                        src={currentPreviewImage}
                        alt="Pipeline preview"
                        className="w-full h-auto"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-lg bg-secondary/20 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Gere a cena base para comecar</p>
                      </div>
                    </div>
                  )}

                  {/* Caption */}
                  {state.caption && (
                    <div className="mt-4 bg-secondary/30 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Caption</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(state.caption);
                            setCopiedCaption(true);
                            setTimeout(() => setCopiedCaption(false), 2000);
                          }}
                          className="text-xs text-muted-foreground hover:text-primary transition flex items-center gap-1"
                        >
                          {copiedCaption ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedCaption ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{state.caption}</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Right: Step Controls */}
              <div className="md:col-span-2">
                <Card className="p-5 border-border/50">
                  {/* Base Scene */}
                  {state.pipelineStep === "baseScene" && (
                    <BaseSceneControls
                      config={{
                        topic: state.topic,
                        style: state.style,
                        tone: state.tone,
                        goal: state.goal,
                        platform: state.platform,
                        aspectRatio: state.aspectRatio,
                        hasProductImage: !!state.productImage,
                      }}
                      prompt={state.baseScenePrompt}
                      onPromptChange={(p) => dispatch({ type: "SET_PROMPT", prompt: p })}
                      onGenerate={handleGenerateBaseScene}
                      isGenerating={isGenerating}
                    />
                  )}

                  {/* Composition */}
                  {state.pipelineStep === "composition" && (
                    <CompositionControls
                      background={state.compositionBackground}
                      framing={state.compositionFraming}
                      cameraAngle={state.compositionCameraAngle}
                      depthOfField={state.compositionDepthOfField}
                      onBackgroundChange={(v) => dispatch({ type: "SET_CONFIG", field: "compositionBackground", value: v })}
                      onFramingChange={(v) => dispatch({ type: "SET_CONFIG", field: "compositionFraming", value: v })}
                      onCameraAngleChange={(v) => dispatch({ type: "SET_CONFIG", field: "compositionCameraAngle", value: v })}
                      onDepthOfFieldChange={(v) => dispatch({ type: "SET_CONFIG", field: "compositionDepthOfField", value: v })}
                      onGenerate={handleRefineComposition}
                      isGenerating={isGenerating}
                    />
                  )}

                  {/* Color Grading */}
                  {state.pipelineStep === "colorGrading" && (
                    <ColorGradingControls
                      temperature={state.colorTemperature}
                      contrast={state.colorContrast}
                      saturation={state.colorSaturation}
                      mood={state.colorMood}
                      filmStock={state.colorFilmStock}
                      onTemperatureChange={(v) => dispatch({ type: "SET_CONFIG", field: "colorTemperature", value: v })}
                      onContrastChange={(v) => dispatch({ type: "SET_CONFIG", field: "colorContrast", value: v })}
                      onSaturationChange={(v) => dispatch({ type: "SET_CONFIG", field: "colorSaturation", value: v })}
                      onMoodChange={(v) => dispatch({ type: "SET_CONFIG", field: "colorMood", value: v })}
                      onFilmStockChange={(v) => dispatch({ type: "SET_CONFIG", field: "colorFilmStock", value: v })}
                      onGenerate={handleApplyColorGrading}
                      isGenerating={isGenerating}
                    />
                  )}

                  {/* Typography */}
                  {state.pipelineStep === "typography" && (
                    <TypographyControls
                      text={state.typographyText}
                      position={state.typographyPosition}
                      textStyle={state.typographyStyle}
                      approach={state.typographyApproach}
                      onTextChange={(v) => dispatch({ type: "SET_CONFIG", field: "typographyText", value: v })}
                      onPositionChange={(v) => dispatch({ type: "SET_CONFIG", field: "typographyPosition", value: v })}
                      onTextStyleChange={(v) => dispatch({ type: "SET_CONFIG", field: "typographyStyle", value: v })}
                      onApproachChange={(v) => dispatch({ type: "SET_CONFIG", field: "typographyApproach", value: v })}
                      onGenerateAI={handleApplyTypographyAI}
                      onOpenCanvas={() => dispatch({ type: "SET_CANVAS_EDITOR", open: true })}
                      isGenerating={isGenerating}
                    />
                  )}

                  {/* Skip / Redo buttons for non-baseScene steps */}
                  {state.pipelineStep !== "baseScene" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                      <Button
                        onClick={handleSkipStep}
                        variant="outline"
                        disabled={isGenerating}
                        className="flex-1 gap-2"
                      >
                        <SkipForward className="w-4 h-4" />
                        Pular
                      </Button>
                      {state.stepResults[state.pipelineStep]?.status === "done" && (
                        <Button
                          onClick={() => handleStepClick(state.pipelineStep)}
                          variant="outline"
                          disabled={isGenerating}
                          className="flex-1 gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Refazer
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Finish early */}
                  {state.pipelineStep !== "baseScene" && (
                    <Button
                      onClick={() => dispatch({ type: "FINISH" })}
                      variant="ghost"
                      disabled={isGenerating}
                      className="w-full mt-2 text-muted-foreground"
                    >
                      Finalizar agora
                    </Button>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}

        {/* ---- PHASE 3: DONE ---- */}
        {state.phase === "done" && (
          <>
            <Card className="p-8 border-border/50 shadow-lg">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Seu post esta pronto!</h2>
                <p className="text-muted-foreground">Resultado final do pipeline criativo</p>
              </div>

              {/* Final Image */}
              {getLatestImage(state) && (
                <div className="rounded-lg overflow-hidden border border-border/50 mb-6">
                  <img src={getLatestImage(state)!} alt="Final result" className="w-full h-auto" />
                </div>
              )}

              {/* Caption */}
              {state.caption && (
                <div className="bg-secondary/50 rounded-lg p-4 border border-border/50 mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm">Caption</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(state.caption);
                        setCopiedCaption(true);
                        setTimeout(() => setCopiedCaption(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
                    >
                      {copiedCaption ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedCaption ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{state.caption}</p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20 text-sm space-y-1 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plataforma:</span>
                  <span className="font-medium capitalize">{state.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estilo:</span>
                  <span className="font-medium">{STYLES.find(s => s.id === state.style)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tom:</span>
                  <span className="font-medium">{TONES.find(t => t.id === state.tone)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Etapas concluidas:</span>
                  <span className="font-medium">
                    {Object.values(state.stepResults).filter(r => r?.status === "done").length} de {PIPELINE_STEPS.length}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleDownloadImage} variant="outline" className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Baixar
                </Button>
                <Button
                  onClick={handleSavePost}
                  disabled={savePostMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {savePostMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Post
                </Button>
              </div>

              <Button
                onClick={() => dispatch({ type: "RESET" })}
                className="w-full mt-3 gap-2"
                variant="outline"
              >
                <Sparkles className="w-4 h-4" />
                Criar Novo Post
              </Button>
            </Card>
          </>
        )}
      </div>

      {/* Canvas Text Overlay Editor */}
      {state.showCanvasEditor && (() => {
        const previousImage = getPreviousStepImage({ ...state, pipelineStep: "typography" });
        return previousImage ? (
          <TextOverlayEditor
            imageUrl={previousImage}
            caption={state.caption}
            style={state.style}
            tone={state.tone}
            imagePrompt={state.baseScenePrompt}
            productImageUrl={state.productImage}
            aspectRatio={state.aspectRatio}
            onSave={(dataUrl) => dispatch({ type: "CANVAS_SAVE", imageUrl: dataUrl })}
            onCancel={() => dispatch({ type: "SET_CANVAS_EDITOR", open: false })}
          />
        ) : null;
      })()}
    </div>
  );
}
