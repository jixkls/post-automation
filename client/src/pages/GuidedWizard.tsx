import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, Sparkles, Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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

export default function GuidedWizard() {
  const [step, setStep] = useState<"topic" | "product" | "platform" | "aspect" | "style" | "tone" | "goal" | "result">("topic");
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
    if (step === "product" && !productImage) {
      toast.error("Carregue uma imagem");
      return;
    }
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

    if (step === "goal") {
      generatePostMutation.mutate({
        topic,
        platform,
        aspectRatio,
        style,
        tone,
        goal,
        productImageUrl: productImage,
      });
    } else {
      const steps: Array<"topic" | "product" | "platform" | "aspect" | "style" | "tone" | "goal" | "result"> = [
        "topic",
        "product",
        "platform",
        "aspect",
        "style",
        "tone",
        "goal",
        "result",
      ];
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1]);
      }
    }
  };

  const handleBack = () => {
    const steps: Array<"topic" | "product" | "platform" | "aspect" | "style" | "tone" | "goal" | "result"> = [
      "topic",
      "product",
      "platform",
      "aspect",
      "style",
      "tone",
      "goal",
      "result",
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleGenerateImage = () => {
    if (imagePrompt) {
      generateImageMutation.mutate({
        prompt: imagePrompt,
        aspectRatio,
        productImageUrl: productImage,
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

  const progressPercentage = (["topic", "product", "platform", "aspect", "style", "tone", "goal", "result"].indexOf(step) + 1) / 8 * 100;

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
            Passo {["topic", "product", "platform", "aspect", "style", "tone", "goal", "result"].indexOf(step) + 1} de 8
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
              <input
                type="text"
                placeholder="Ex: Novo produto de café, promoção de verão, dica de produtividade..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition"
              />
            </div>
          )}

          {/* Step 2: Product Image */}
          {step === "product" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Carregue a imagem do produto</h2>
                <p className="text-muted-foreground mb-4">PNG ou JPG com fundo transparente (ideal)</p>
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
                <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Imagem carregada</p>
                  <img src={productImage} alt="Product" className="max-h-40 mx-auto object-contain" />
                </div>
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
            </div>
          )}

          {/* Step 8: Result */}
          {step === "result" && (
            <div className="space-y-6">
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
                  <div className="rounded-lg overflow-hidden border border-border/50">
                    <img src={generatedImageUrl} alt="Generated post image" className="w-full h-auto" />
                  </div>
                  <Button
                    onClick={handleDownloadImage}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Imagem
                  </Button>
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
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step !== "topic" && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="gap-2"
                disabled={isLoading}
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}

            {step !== "result" && (
              <Button
                onClick={handleNext}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {step === "goal" ? (
                  <>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Gerar Post
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}

            {step === "result" && (
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
    </div>
  );
}
