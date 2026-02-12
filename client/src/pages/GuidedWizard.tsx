import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, ChevronRight, Sparkles, Copy, Check, Download, AlertCircle, RefreshCw, X, Save, FileText, ChevronDown, Type, Image } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import TextOverlayEditor from "@/components/TextOverlayEditor";

interface BatchResultItem {
  index: number;
  caption: string;
  imagePrompt: string;
  imageUrl?: string;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
}

const STYLES = [
  { id: "minimalist", label: "Minimalista", desc: "Limpo e elegante" },
  { id: "creative", label: "Criativo", desc: "Colorido e vibrante" },
  { id: "professional", label: "Profissional", desc: "Corporativo e formal" },
  { id: "casual", label: "Casual", desc: "Descontraído e amigável" },
  { id: "luxury", label: "Luxo", desc: "Premium e sofisticado" },
];

const TONES = [
  { id: "funny", label: "Engraçado", desc: "Humor e leveza" },
  { id: "inspiring", label: "Inspirador", desc: "Motivacional" },
  { id: "urgent", label: "Urgente", desc: "Chamado à ação" },
  { id: "educational", label: "Educativo", desc: "Informativo" },
  { id: "emotional", label: "Emocional", desc: "Conexão pessoal" },
];

const GOALS = [
  { id: "engagement", label: "Engajamento", desc: "Likes e comentários" },
  { id: "sales", label: "Vendas", desc: "Conversão" },
  { id: "awareness", label: "Conscientização", desc: "Alcance" },
  { id: "community", label: "Comunidade", desc: "Conexão" },
  { id: "traffic", label: "Tráfego", desc: "Cliques" },
];

const ASPECT_RATIOS = {
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

type WizardStep = "topic" | "product" | "platform" | "aspect" | "style" | "tone" | "goal" | "textApproach" | "batch" | "result";
type TextApproach = "ai" | "canvas" | "none";
type TextStyle = "bold" | "elegant" | "playful" | "minimal" | "neon" | "threed" | "gradient" | "graffiti";

const STEPS: WizardStep[] = ["topic", "product", "platform", "aspect", "style", "tone", "goal", "textApproach", "batch", "result"];

const TEXT_APPROACH_OPTIONS: { id: TextApproach; label: string; desc: string; icon: string }[] = [
  { id: "ai", label: "Texto com IA", desc: "Texto renderizado pela IA na imagem", icon: "sparkles" },
  { id: "canvas", label: "Texto Sobreposto", desc: "Adicione texto apos gerar a imagem", icon: "type" },
  { id: "none", label: "Sem Texto", desc: "Imagem sem texto overlay", icon: "image" },
];

const TEXT_STYLE_OPTIONS: { id: TextStyle; label: string; desc: string }[] = [
  { id: "bold", label: "Bold", desc: "Impactante e moderno" },
  { id: "elegant", label: "Elegante", desc: "Sofisticado e classico" },
  { id: "playful", label: "Divertido", desc: "Criativo e artistico" },
  { id: "minimal", label: "Minimal", desc: "Limpo e sutil" },
  { id: "neon", label: "Neon", desc: "Brilhante e vibrante" },
  { id: "threed", label: "3D", desc: "Profundidade e dimensao" },
  { id: "gradient", label: "Gradiente", desc: "Moderno e colorido" },
  { id: "graffiti", label: "Graffiti", desc: "Urbano e ousado" },
];

export default function GuidedWizard() {
  const [step, setStep] = useState<WizardStep>("topic");
  const [topic, setTopic] = useState("");
  const [productImage, setProductImage] = useState<string>("");
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "twitter" | "linkedin">("instagram");
  const [aspectRatio, setAspectRatio] = useState("");
  const [style, setStyle] = useState("");
  const [tone, setTone] = useState("");
  const [goal, setGoal] = useState("");
  const [caption, setCaption] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch config
  const [batchQuantity, setBatchQuantity] = useState(1);

  // Preserve model toggle (for reference images with people)
  const [preserveModel, setPreserveModel] = useState(false);

  // Batch results
  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchCancelled, setBatchCancelled] = useState(false);

  // Template state
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSavingPost, setIsSavingPost] = useState(false);

  // Text overlay state
  const [textOverlayIndex, setTextOverlayIndex] = useState<number | null>(null);
  const [singleImageTextOverlay, setSingleImageTextOverlay] = useState(false);

  // Text approach state
  const [textApproach, setTextApproach] = useState<TextApproach>("none");
  const [overlayText, setOverlayText] = useState("");
  const [textStyle, setTextStyle] = useState<TextStyle>("bold");
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">("center");

  const generatePostMutation = trpc.gemini.generatePost.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setCaption(data.caption);
        setImagePrompt(data.imagePrompt);
        setGeneratedImageUrl(null);
        setStep("result");
      } else {
        toast.error("Erro ao gerar post");
      }
    },
    onError: () => {
      toast.error("Erro ao gerar post");
    },
  });

  const generateImageMutation = trpc.gemini.generateImageFromPrompt.useMutation({
    onSuccess: (data) => {
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        toast.success("✓ Imagem gerada!");
      } else {
        toast.error("Erro ao gerar imagem");
      }
    },
    onError: () => {
      toast.error("Erro ao gerar imagem");
    },
  });

  const generateBatchPostsMutation = trpc.gemini.generateBatchPosts.useMutation();

  // Template queries and mutations
  const templatesQuery = trpc.templates.list.useQuery(undefined, {
    enabled: true,
  });
  const createTemplateMutation = trpc.templates.create.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Template salvo!");
        setShowSaveTemplateModal(false);
        setTemplateName("");
        setTemplateDescription("");
        templatesQuery.refetch();
      } else {
        toast.error(data.error || "Erro ao salvar template");
      }
    },
    onError: () => {
      toast.error("Erro ao salvar template");
    },
  });
  const incrementUseCountMutation = trpc.templates.incrementUseCount.useMutation();

  // Post mutations
  const savePostMutation = trpc.posts.savePost.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Post salvo!");
      } else {
        toast.error(data.error || "Erro ao salvar post");
      }
      setIsSavingPost(false);
    },
    onError: () => {
      toast.error("Erro ao salvar post");
      setIsSavingPost(false);
    },
  });
  const saveBatchMutation = trpc.posts.saveBatch.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.postIds?.length || 0} posts salvos!`);
      } else {
        toast.error(data.error || "Erro ao salvar posts");
      }
      setIsSavingPost(false);
    },
    onError: () => {
      toast.error("Erro ao salvar posts");
      setIsSavingPost(false);
    },
  });

  const isLoading = generatePostMutation.isPending;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setProductImage(base64String);
      toast.success("✓ Imagem carregada!");
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (step === "topic" && !topic.trim()) {
      toast.error("Digite um tema");
      return;
    }
    // Product step is optional - no validation needed
    if (step === "platform" && !platform) {
      toast.error("Escolha uma rede social");
      return;
    }
    if (step === "aspect" && !aspectRatio) {
      toast.error("Escolha uma proporção");
      return;
    }
    if (step === "style" && !style) {
      toast.error("Escolha um estilo");
      return;
    }
    if (step === "tone" && !tone) {
      toast.error("Escolha um tom");
      return;
    }
    if (step === "goal" && !goal) {
      toast.error("Escolha um objetivo");
      return;
    }
    if (step === "textApproach" && textApproach === "ai" && !overlayText.trim()) {
      toast.error("Digite o texto para a imagem");
      return;
    }

    if (step === "batch") {
      // Start batch generation
      generateBatch();
    } else {
      const currentIndex = STEPS.indexOf(step);
      if (currentIndex < STEPS.length - 1) {
        setStep(STEPS[currentIndex + 1]);
      }
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const generateBatch = async () => {
    setIsBatchGenerating(true);
    setBatchCancelled(false);
    setStep("result");

    try {
      // 1. Get all captions/prompts at once
      const batchData = await generateBatchPostsMutation.mutateAsync({
        topic,
        platform,
        aspectRatio,
        style,
        tone,
        goal,
        productImageUrl: productImage,
        quantity: batchQuantity,
      });

      if (!batchData.success || !batchData.items) {
        toast.error("Erro ao gerar posts");
        setIsBatchGenerating(false);
        return;
      }

      // Initialize batch results with pending status
      const initialResults: BatchResultItem[] = batchData.items.map((item) => ({
        index: item.index,
        caption: item.caption,
        imagePrompt: item.imagePrompt,
        status: "pending" as const,
      }));
      setBatchResults(initialResults);

      // 2. Generate images one by one with 2s delay between
      for (let i = 0; i < batchData.items.length; i++) {
        // Check if cancelled
        if (batchCancelled) {
          break;
        }

        setCurrentBatchIndex(i);

        // Update status to generating
        setBatchResults(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "generating" as const } : item
        ));

        try {
          // Build embedText config if AI text approach is selected
          const embedTextConfig = textApproach === "ai" && overlayText.trim()
            ? {
                text: overlayText,
                position: textPosition,
                style: textStyle,
              }
            : undefined;

          const imageResult = await generateImageMutation.mutateAsync({
            prompt: batchData.items[i].imagePrompt,
            aspectRatio,
            productImageUrl: productImage,
            preserveModel,
            embedText: embedTextConfig,
          });

          if (imageResult.success && imageResult.imageUrl) {
            setBatchResults(prev => prev.map((item, idx) =>
              idx === i ? { ...item, status: "done" as const, imageUrl: imageResult.imageUrl } : item
            ));
          } else {
            setBatchResults(prev => prev.map((item, idx) =>
              idx === i ? { ...item, status: "error" as const, error: "Falha ao gerar imagem" } : item
            ));
          }
        } catch (error) {
          setBatchResults(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: "error" as const, error: error instanceof Error ? error.message : "Erro desconhecido" } : item
          ));
        }

        // Rate limit delay between generations (except for last item)
        if (i < batchData.items.length - 1 && !batchCancelled) {
          await delay(2000);
        }
      }

      toast.success("Geração em lote concluída!");
    } catch (error) {
      toast.error("Erro ao gerar posts em lote");
    }

    setIsBatchGenerating(false);
  };

  const handleCancelBatch = () => {
    setBatchCancelled(true);
    toast.info("Geração cancelada");
  };

  const handleRetryItem = async (index: number) => {
    const item = batchResults[index];
    if (!item) return;

    setBatchResults(prev => prev.map((r, idx) =>
      idx === index ? { ...r, status: "generating" as const } : r
    ));

    try {
      // Build embedText config if AI text approach is selected
      const embedTextConfig = textApproach === "ai" && overlayText.trim()
        ? {
            text: overlayText,
            position: textPosition,
            style: textStyle,
          }
        : undefined;

      const imageResult = await generateImageMutation.mutateAsync({
        prompt: item.imagePrompt,
        aspectRatio,
        productImageUrl: productImage,
        preserveModel,
        embedText: embedTextConfig,
      });

      if (imageResult.success && imageResult.imageUrl) {
        setBatchResults(prev => prev.map((r, idx) =>
          idx === index ? { ...r, status: "done" as const, imageUrl: imageResult.imageUrl, error: undefined } : r
        ));
        toast.success("Imagem regenerada!");
      } else {
        setBatchResults(prev => prev.map((r, idx) =>
          idx === index ? { ...r, status: "error" as const, error: "Falha ao gerar imagem" } : r
        ));
      }
    } catch (error) {
      setBatchResults(prev => prev.map((r, idx) =>
        idx === index ? { ...r, status: "error" as const, error: error instanceof Error ? error.message : "Erro desconhecido" } : r
      ));
    }
  };

  const handleDownloadAll = async () => {
    const successfulItems = batchResults.filter(item => item.status === "done" && item.imageUrl);
    if (successfulItems.length === 0) {
      toast.error("Nenhuma imagem para baixar");
      return;
    }

    toast.info(`Baixando ${successfulItems.length} imagens...`);

    for (let i = 0; i < successfulItems.length; i++) {
      const item = successfulItems[i];
      if (!item.imageUrl) continue;

      try {
        const response = await fetch(item.imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `autopost-${platform}-batch-${item.index + 1}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        await delay(500); // Small delay between downloads
      } catch (error) {
        console.error(`Error downloading image ${i + 1}:`, error);
      }
    }

    toast.success("Download concluído!");
  };

  const handleGenerateImage = () => {
    if (imagePrompt) {
      // Build embedText config if AI text approach is selected
      const embedTextConfig = textApproach === "ai" && overlayText.trim()
        ? {
            text: overlayText,
            position: textPosition,
            style: textStyle,
          }
        : undefined;

      generateImageMutation.mutate({
        prompt: imagePrompt,
        aspectRatio,
        productImageUrl: productImage,
        preserveModel,
        embedText: embedTextConfig,
      });
    }
  };

  const handleReset = () => {
    setStep("topic");
    setTopic("");
    setProductImage("");
    setPlatform("instagram");
    setAspectRatio("");
    setStyle("");
    setTone("");
    setGoal("");
    setCaption("");
    setImagePrompt("");
    setGeneratedImageUrl(null);
    setCopiedCaption(false);
    setCopiedPrompt(false);
    // Reset batch state
    setBatchQuantity(1);
    setPreserveModel(false);
    setBatchResults([]);
    setCurrentBatchIndex(0);
    setIsBatchGenerating(false);
    setBatchCancelled(false);
    // Reset text approach state
    setTextApproach("none");
    setOverlayText("");
    setTextStyle("bold");
    setTextPosition("center");
  };

  const copyToClipboard = (text: string, setSetter: (value: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setSetter(true);
    setTimeout(() => setSetter(false), 2000);
  };

  const handleDownloadImage = async () => {
    if (!generatedImageUrl) return;

    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `autopost-${platform}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Imagem baixada!");
    } catch (error) {
      toast.error("Erro ao baixar imagem");
    }
  };

  const handleLoadTemplate = (template: NonNullable<typeof templatesQuery.data>["templates"][0]) => {
    setPlatform(template.platform);
    setAspectRatio(template.aspectRatio || "");
    setStyle(template.style || "");
    setTone(template.tone || "");
    setGoal(template.goal || "");
    setBatchQuantity(template.defaultBatchQuantity || 1);
    setShowTemplateDropdown(false);
    incrementUseCountMutation.mutate({ id: template.id });
    toast.success(`Template "${template.name}" carregado!`);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }
    createTemplateMutation.mutate({
      name: templateName,
      description: templateDescription || undefined,
      platform,
      aspectRatio: aspectRatio || undefined,
      style: style || undefined,
      tone: tone || undefined,
      goal: goal || undefined,
      defaultBatchQuantity: batchQuantity,
    });
  };

  const handleSavePost = () => {
    setIsSavingPost(true);
    if (batchResults.length > 0) {
      // Save batch
      const items = batchResults
        .filter((r) => r.status === "done" || r.caption)
        .map((r, idx) => ({
          caption: r.caption,
          imagePrompt: r.imagePrompt,
          imageUrl: r.imageUrl,
          batchIndex: idx,
        }));

      saveBatchMutation.mutate({
        topic,
        platform,
        aspectRatio: aspectRatio || undefined,
        style: style || undefined,
        tone: tone || undefined,
        goal: goal || undefined,
        productImageUrl: productImage || undefined,
        items,
      });
    } else {
      // Save single post
      savePostMutation.mutate({
        topic,
        platform,
        aspectRatio: aspectRatio || undefined,
        style: style || undefined,
        tone: tone || undefined,
        goal: goal || undefined,
        caption,
        imagePrompt: imagePrompt || undefined,
        imageUrl: generatedImageUrl || undefined,
        productImageUrl: productImage || undefined,
        status: generatedImageUrl ? "ready" : "draft",
      });
    }
  };

  // Text overlay handlers
  const handleOpenTextOverlay = (index: number) => {
    setTextOverlayIndex(index);
  };

  const handleSaveTextOverlay = (dataUrl: string) => {
    if (textOverlayIndex !== null) {
      // Update batch results with the new image
      setBatchResults(prev => prev.map((item, idx) =>
        idx === textOverlayIndex ? { ...item, imageUrl: dataUrl } : item
      ));
      toast.success("Texto adicionado!");
    }
    setTextOverlayIndex(null);
  };

  const handleOpenSingleTextOverlay = () => {
    setSingleImageTextOverlay(true);
  };

  const handleSaveSingleTextOverlay = (dataUrl: string) => {
    setGeneratedImageUrl(dataUrl);
    setSingleImageTextOverlay(false);
    toast.success("Texto adicionado!");
  };

  const progressPercentage = (STEPS.indexOf(step) + 1) / STEPS.length * 100;

  return (
    <div className="p-4">
      <div className="max-w-2xl mx-auto">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Assistente de Posts</h1>
          <p className="text-muted-foreground">Crie posts perfeitos passo a passo</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Passo {STEPS.indexOf(step) + 1} de {STEPS.length}
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-8 border-border/50 shadow-lg">
          {/* Step 1: Topic */}
          {step === "topic" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Qual é o tema do post?</h2>
                <p className="text-muted-foreground mb-4">Descreva sobre o que você quer falar</p>
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
                placeholder="Ex: Novo produto de café, promoção de verão, dica de produtividade..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition"
              />
            </div>
          )}

          {/* Step 2: Product Image (Optional) */}
          {step === "product" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Imagem do produto (opcional)</h2>
                <p className="text-muted-foreground mb-4">Adicione uma imagem ou pule para continuar</p>
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
              {productImage && (
                <>
                  <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Imagem carregada</p>
                    <img src={productImage} alt="Product" className="max-h-40 mx-auto object-contain" />
                    <button
                      onClick={() => setProductImage("")}
                      className="mt-2 text-xs text-destructive hover:underline"
                    >
                      Remover imagem
                    </button>
                  </div>

                  {/* Preserve Model Toggle */}
                  <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50">
                    <div>
                      <label className="text-sm font-medium">Manter Pessoa</label>
                      <p className="text-xs text-muted-foreground">
                        Preserva a pessoa da imagem de referência
                      </p>
                    </div>
                    <Switch
                      checked={preserveModel}
                      onCheckedChange={setPreserveModel}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Platform */}
          {step === "platform" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Qual rede social?</h2>
                <p className="text-muted-foreground mb-4">Escolha onde você vai publicar</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["instagram", "facebook", "twitter", "linkedin"].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPlatform(p as "instagram" | "facebook" | "twitter" | "linkedin");
                      setAspectRatio("");
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      platform === p ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold capitalize">{p}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p === "instagram" && "Fotos e stories"}
                      {p === "facebook" && "Comunidade e eventos"}
                      {p === "twitter" && "Notícias e trends"}
                      {p === "linkedin" && "Profissional e B2B"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Aspect Ratio */}
          {step === "aspect" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Qual proporção de imagem?</h2>
                <p className="text-muted-foreground mb-4">Escolha o formato ideal para a rede social</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ASPECT_RATIOS[platform as keyof typeof ASPECT_RATIOS]?.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAspectRatio(a.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      aspectRatio === a.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold">{a.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {a.ratio} - {a.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Style */}
          {step === "style" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Qual estilo visual?</h2>
                <p className="text-muted-foreground mb-4">Como você quer que a imagem pareça</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      style === s.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Tone */}
          {step === "tone" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Qual tom de voz?</h2>
                <p className="text-muted-foreground mb-4">Como você quer se comunicar</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      tone === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Goal */}
          {step === "goal" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Qual é o objetivo?</h2>
                <p className="text-muted-foreground mb-4">O que você quer alcançar com este post</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      goal === g.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold">{g.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{g.desc}</div>
                  </button>
                ))}
              </div>

              {/* Save as Template Button */}
              {goal && (
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(true)}
                  className="w-full px-4 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition"
                >
                  <FileText className="w-4 h-4" />
                  Salvar como Template
                </button>
              )}
            </div>
          )}

          {/* Save Template Modal */}
          {showSaveTemplateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-bold mb-4">Salvar Template</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Nome do Template</label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Ex: Posts Instagram Promocionais"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Descrição (opcional)</label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Descreva quando usar este template..."
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition resize-none h-20"
                    />
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-2">Configurações salvas:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>Plataforma: {platform}</li>
                      {aspectRatio && <li>Proporção: {aspectRatio}</li>}
                      {style && <li>Estilo: {STYLES.find(s => s.id === style)?.label}</li>}
                      {tone && <li>Tom: {TONES.find(t => t.id === tone)?.label}</li>}
                      {goal && <li>Objetivo: {GOALS.find(g => g.id === goal)?.label}</li>}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSaveTemplateModal(false);
                      setTemplateName("");
                      setTemplateDescription("");
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={createTemplateMutation.isPending}
                    className="flex-1 gap-2"
                  >
                    {createTemplateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Text Approach */}
          {step === "textApproach" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Texto na Imagem?</h2>
                <p className="text-muted-foreground mb-4">Escolha como adicionar texto ao post</p>
              </div>

              {/* Text Approach Options */}
              <div className="space-y-3">
                {TEXT_APPROACH_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTextApproach(opt.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-start gap-4 ${
                      textApproach === opt.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${textApproach === opt.id ? "bg-primary/20" : "bg-secondary/50"}`}>
                      {opt.icon === "sparkles" && <Sparkles className="w-5 h-5" />}
                      {opt.icon === "type" && <Type className="w-5 h-5" />}
                      {opt.icon === "image" && <Image className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-sm text-muted-foreground">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* AI Text Options */}
              {textApproach === "ai" && (
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Texto para a Imagem</label>
                    <input
                      type="text"
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="Ex: OFERTA ESPECIAL, NOVIDADE, etc."
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition uppercase"
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximo 50 caracteres. Use frases curtas e impactantes.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posicao do Texto</label>
                    <div className="flex gap-2">
                      {[
                        { id: "top", label: "Topo" },
                        { id: "center", label: "Centro" },
                        { id: "bottom", label: "Base" },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          onClick={() => setTextPosition(pos.id as "top" | "center" | "bottom")}
                          className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                            textPosition === pos.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estilo do Texto</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TEXT_STYLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setTextStyle(opt.id)}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition text-left ${
                            textStyle === opt.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                    <p className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>
                        A IA renderizara o texto <strong>"{overlayText || "..."}"</strong> diretamente na imagem.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Canvas Text Info */}
              {textApproach === "canvas" && (
                <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                  <p className="text-sm flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    <span>
                      Apos gerar a imagem, voce podera adicionar texto com o editor de sobreposicao.
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 9: Batch */}
          {step === "batch" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Quantas variações?</h2>
                <p className="text-muted-foreground mb-4">Configure a geração em lote</p>
              </div>

              {/* Quantity Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Quantidade de variações</label>
                  <span className="text-2xl font-bold text-primary">{batchQuantity}</span>
                </div>
                <Slider
                  value={[batchQuantity]}
                  onValueChange={(value) => setBatchQuantity(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <p className="text-sm">
                  <span className="font-medium">Resumo:</span> Serão geradas{" "}
                  <span className="font-bold text-primary">{batchQuantity}</span> variações
                  {preserveModel && productImage && " preservando a pessoa da imagem de referência"}.
                </p>
              </div>
            </div>
          )}

          {/* Step 9: Result */}
          {step === "result" && (
            <div className="space-y-6">
              {/* Initial Loading State - Preparing captions */}
              {isBatchGenerating && batchResults.length === 0 && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Preparando posts...</h2>
                  <p className="text-muted-foreground">Gerando captions e prompts de imagem</p>
                </div>
              )}

              {/* Batch Results */}
              {batchResults.length > 0 ? (
                <>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {isBatchGenerating ? "Gerando imagens..." : "Seus posts estao prontos!"}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      {isBatchGenerating
                        ? `Gerando imagem ${currentBatchIndex + 1} de ${batchResults.length}...`
                        : `${batchResults.filter(r => r.status === "done").length} de ${batchResults.length} imagens geradas`}
                    </p>
                  </div>

                  {/* Progress during generation */}
                  {isBatchGenerating && (
                    <div className="space-y-3">
                      <Progress value={((currentBatchIndex + 1) / batchResults.length) * 100} className="h-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Processando variação {currentBatchIndex + 1}...
                        </span>
                        <Button
                          onClick={handleCancelBatch}
                          variant="outline"
                          size="sm"
                          className="gap-1"
                        >
                          <X className="w-3 h-3" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Status List during generation */}
                  {isBatchGenerating && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {batchResults.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                            item.status === "generating" ? "bg-primary/10" :
                            item.status === "done" ? "bg-green-500/10" :
                            item.status === "error" ? "bg-red-500/10" :
                            "bg-secondary/30"
                          }`}
                        >
                          {item.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />}
                          {item.status === "generating" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                          {item.status === "done" && <Check className="w-4 h-4 text-green-500" />}
                          {item.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                          <span>Variação {idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Results Grid after generation */}
                  {!isBatchGenerating && (
                    <>
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        {batchResults.filter(r => r.status === "done").length > 1 && (
                          <Button
                            onClick={handleDownloadAll}
                            variant="outline"
                            className="flex-1 gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Baixar Todas ({batchResults.filter(r => r.status === "done").length})
                          </Button>
                        )}
                        <Button
                          onClick={handleSavePost}
                          disabled={isSavingPost}
                          className="flex-1 gap-2"
                        >
                          {isSavingPost ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Salvar Posts
                        </Button>
                      </div>

                      {/* Results Cards */}
                      <div className="space-y-6">
                        {batchResults.map((item, idx) => (
                          <div key={idx} className="border border-border/50 rounded-lg overflow-hidden">
                            <div className="bg-secondary/30 px-4 py-2 flex items-center justify-between">
                              <span className="font-medium text-sm">Variação {idx + 1}</span>
                              {item.status === "done" && <Check className="w-4 h-4 text-green-500" />}
                              {item.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                            </div>

                            {/* Image */}
                            {item.status === "done" && item.imageUrl && (
                              <div className="relative aspect-square bg-secondary/10 group">
                                <img
                                  src={item.imageUrl}
                                  alt={`Generated post ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                {/* Add Text Overlay Button */}
                                <button
                                  onClick={() => handleOpenTextOverlay(idx)}
                                  className="absolute top-3 right-3 p-2 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                                  title="Adicionar texto"
                                >
                                  <Type className="w-5 h-5" />
                                </button>
                              </div>
                            )}

                            {/* Error State */}
                            {item.status === "error" && (
                              <div className="p-4 text-center">
                                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-3">{item.error || "Erro ao gerar imagem"}</p>
                                <Button
                                  onClick={() => handleRetryItem(idx)}
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  disabled={generateImageMutation.isPending}
                                >
                                  {generateImageMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  Tentar novamente
                                </Button>
                              </div>
                            )}

                            {/* Caption and Actions */}
                            <div className="p-4 space-y-3">
                              <div className="bg-secondary/50 rounded-lg p-3">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.caption}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.caption);
                                    toast.success("Caption copiada!");
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copiar
                                </Button>
                                {item.status === "done" && item.imageUrl && (
                                  <>
                                    <Button
                                      onClick={() => handleOpenTextOverlay(idx)}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 gap-1"
                                    >
                                      <Type className="w-3 h-3" />
                                      Texto
                                    </Button>
                                    <Button
                                      onClick={async () => {
                                        try {
                                          const response = await fetch(item.imageUrl!);
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement("a");
                                          link.href = url;
                                          link.download = `autopost-${platform}-${idx + 1}-${Date.now()}.png`;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          window.URL.revokeObjectURL(url);
                                          toast.success("Imagem baixada!");
                                        } catch (error) {
                                          toast.error("Erro ao baixar imagem");
                                        }
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 gap-1"
                                    >
                                      <Download className="w-3 h-3" />
                                      Baixar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* Single Result (legacy/fallback) */
                <>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">✨ Seu post está pronto!</h2>
                    <p className="text-muted-foreground mb-4">Copie e use onde quiser</p>
                  </div>

                  {/* Product Image Preview */}
                  {productImage && (
                    <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Imagem do produto</p>
                      <img
                        src={productImage}
                        alt="Product"
                        className="max-h-40 mx-auto object-contain"
                      />
                    </div>
                  )}

                  {/* Caption */}
                  <div className="bg-secondary/50 rounded-lg p-4 border border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm">Caption</h3>
                      <button
                        onClick={() => copyToClipboard(caption, setCopiedCaption)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
                      >
                        {copiedCaption ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
                  </div>

                  {/* Image Prompt */}
                  {imagePrompt && (
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 border border-border/50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm text-slate-200">Prompt para Imagen</h3>
                        <button
                          onClick={() => copyToClipboard(imagePrompt, setCopiedPrompt)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
                        >
                          {copiedPrompt ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed text-green-400 font-mono">{imagePrompt}</p>
                    </div>
                  )}

                  {/* Generated Image */}
                  {generatedImageUrl && (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border border-border/50 group">
                        <img src={generatedImageUrl} alt="Generated post image" className="w-full h-auto" />
                        {/* Add Text Overlay Button */}
                        <button
                          onClick={handleOpenSingleTextOverlay}
                          className="absolute top-3 right-3 p-2 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                          title="Adicionar texto"
                        >
                          <Type className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleOpenSingleTextOverlay}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <Type className="w-4 h-4" />
                          Adicionar Texto
                        </Button>
                        <Button
                          onClick={handleDownloadImage}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Baixar Imagem
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Generate Image Button */}
                  {!generatedImageUrl && imagePrompt && (
                    <Button
                      onClick={handleGenerateImage}
                      disabled={generateImageMutation.isPending}
                      className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      {generateImageMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Gerando imagem...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Gerar Imagem
                        </>
                      )}
                    </Button>
                  )}

                  {/* Regenerate Image Button */}
                  {generatedImageUrl && imagePrompt && (
                    <Button
                      onClick={handleGenerateImage}
                      disabled={generateImageMutation.isPending}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      {generateImageMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Regenerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Gerar Variacao
                        </>
                      )}
                    </Button>
                  )}

                  {/* Save Single Post Button */}
                  {caption && (
                    <Button
                      onClick={handleSavePost}
                      disabled={isSavingPost}
                      className="w-full gap-2"
                    >
                      {isSavingPost ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Salvar Post
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}

              {/* Summary */}
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20 text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">Rede social:</span>
                  <span className="font-semibold ml-2">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Proporcao:</span>
                  <span className="font-semibold ml-2">{ASPECT_RATIOS[platform as keyof typeof ASPECT_RATIOS]?.find((a) => a.id === aspectRatio)?.label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Estilo:</span>
                  <span className="font-semibold ml-2">{STYLES.find((s) => s.id === style)?.label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tom:</span>
                  <span className="font-semibold ml-2">{TONES.find((t) => t.id === tone)?.label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Objetivo:</span>
                  <span className="font-semibold ml-2">{GOALS.find((g) => g.id === goal)?.label}</span>
                </div>
                {textApproach !== "none" && (
                  <div>
                    <span className="text-muted-foreground">Texto:</span>
                    <span className="font-semibold ml-2">
                      {textApproach === "ai" ? `IA (${overlayText})` : "Canvas"}
                    </span>
                  </div>
                )}
                {batchResults.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Variações:</span>
                    <span className="font-semibold ml-2">{batchResults.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step !== "topic" && step !== "result" && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="gap-2"
                disabled={isLoading || isBatchGenerating}
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}

            {step !== "result" && (
              <Button
                onClick={handleNext}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                disabled={isLoading || isBatchGenerating || generateBatchPostsMutation.isPending}
              >
                {step === "batch" ? (
                  <>
                    {generateBatchPostsMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Preparando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Gerar {batchQuantity} {batchQuantity === 1 ? "Post" : "Posts"}
                      </>
                    )}
                  </>
                ) : step === "product" && !productImage ? (
                  <>
                    Pular
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}

            {step === "result" && !isBatchGenerating && (
              <Button
                onClick={handleReset}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
              >
                <Sparkles className="w-4 h-4" />
                Criar Novo Post
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Text Overlay Editor for Batch Images */}
      {textOverlayIndex !== null && batchResults[textOverlayIndex]?.imageUrl && (
        <TextOverlayEditor
          imageUrl={batchResults[textOverlayIndex].imageUrl!}
          caption={batchResults[textOverlayIndex].caption}
          style={style}
          tone={tone}
          imagePrompt={batchResults[textOverlayIndex].imagePrompt}
          productImageUrl={productImage}
          aspectRatio={aspectRatio}
          onSave={handleSaveTextOverlay}
          onCancel={() => setTextOverlayIndex(null)}
        />
      )}

      {/* Text Overlay Editor for Single Image */}
      {singleImageTextOverlay && generatedImageUrl && (
        <TextOverlayEditor
          imageUrl={generatedImageUrl}
          caption={caption}
          style={style}
          tone={tone}
          imagePrompt={imagePrompt}
          productImageUrl={productImage}
          aspectRatio={aspectRatio}
          onSave={handleSaveSingleTextOverlay}
          onCancel={() => setSingleImageTextOverlay(false)}
        />
      )}
    </div>
  );
}
