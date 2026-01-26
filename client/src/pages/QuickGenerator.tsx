import { useState } from "react";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function QuickGenerator() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [caption, setCaption] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const generatePostMutation = trpc.gemini.generateImagePrompt.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setImagePrompt(data.imagePrompt);
        toast.success("✨ Prompt gerado!");
      }
    },
    onError: () => {
      toast.error("Erro ao gerar");
    },
  });

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Digite um tema");
      return;
    }

    // Generate simple caption
    const simpleCaption = `✨ ${topic}\n\nConfira nosso novo conteúdo! 🚀\n\n#${topic.split(" ")[0].toLowerCase()}`;
    setCaption(simpleCaption);

    // Generate image prompt
    generatePostMutation.mutate({
      topic,
      style: "moderno e profissional",
      platform: platform as any,
      additionalContext: undefined,
    });
  };

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = generatePostMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">AutoPost</h1>
          </div>
          <p className="text-muted-foreground">Gere posts com IA em segundos</p>
        </div>

        {/* Main Card */}
        <Card className="p-6 border-border/50 shadow-lg">
          {/* Input Section */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-semibold mb-2 block">Sobre o que é o post?</label>
              <Textarea
                placeholder="Ex: Novo produto de café, promoção de verão, dica de produtividade..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey && topic.trim()) {
                    handleGenerate();
                  }
                }}
                className="min-h-20 text-base"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Qual rede social?</label>
              <div className="grid grid-cols-4 gap-2">
                {["instagram", "facebook", "twitter", "linkedin"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`py-2 rounded-lg font-medium text-sm transition-all ${
                      platform === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !topic.trim()}
            className="w-full mb-6 h-12 text-base gap-2 bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Post
              </>
            )}
          </Button>

          {/* Results */}
          {caption && (
            <div className="space-y-4">
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

              {/* Info */}
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-primary">
                  ✓ Caption pronto para copiar e colar. ✓ Prompt pronto para usar com Gemini Imagen API.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Footer Info */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by Gemini AI</p>
        </div>
      </div>
    </div>
  );
}
