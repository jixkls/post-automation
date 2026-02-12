import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Download,
  RotateCcw,
  ArrowLeft,
  ImageIcon,
  Loader2,
  Check,
  X,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import MaskCanvas from "@/components/MaskCanvas";
import ElementEditor from "@/components/ElementEditor";
import { toast } from "sonner";

type TextStyle =
  | "bold"
  | "elegant"
  | "playful"
  | "minimal"
  | "neon"
  | "threed"
  | "gradient"
  | "vintage"
  | "graffiti";

interface GenerateParams {
  editType: "text" | "product" | "generic";
  text?: string;
  textStyle?: TextStyle;
  productDescription?: string;
  productImage?: string;
  genericPrompt?: string;
}

export default function CreativeEditor() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image states
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageBase64, setOriginalImageBase64] = useState<string | null>(
    null
  );
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [mask, setMask] = useState<string | null>(null);

  // UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // tRPC mutations
  const replaceTextMutation = trpc.creativeEditor.replaceText.useMutation();
  const replaceProductMutation =
    trpc.creativeEditor.replaceProduct.useMutation();
  const replaceElementMutation =
    trpc.creativeEditor.replaceElement.useMutation();

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem valida.");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("A imagem deve ter no maximo 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setOriginalImage(dataUrl);
        setOriginalImageBase64(dataUrl.split(",")[1]);
        setResultImage(null);
        setMask(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleMaskCreated = useCallback((maskBase64: string) => {
    setMask(maskBase64);
  }, []);

  const handleMaskCleared = useCallback(() => {
    setMask(null);
  }, []);

  const handleGenerate = useCallback(
    async (params: GenerateParams) => {
      if (!originalImageBase64 || !mask) {
        toast.error("Selecione uma area na imagem primeiro.");
        return;
      }

      setIsGenerating(true);

      try {
        let result;

        if (params.editType === "text" && params.text) {
          result = await replaceTextMutation.mutateAsync({
            image: originalImageBase64,
            mask: mask,
            newText: params.text,
            style: params.textStyle || "bold",
          });
        } else if (params.editType === "product" && params.productDescription) {
          result = await replaceProductMutation.mutateAsync({
            image: originalImageBase64,
            mask: mask,
            productDescription: params.productDescription,
          });
        } else if (params.editType === "generic" && params.genericPrompt) {
          result = await replaceElementMutation.mutateAsync({
            image: originalImageBase64,
            mask: mask,
            prompt: params.genericPrompt,
          });
        }

        if (result?.success && result.url) {
          setResultImage(result.url);
          toast.success("Imagem gerada com sucesso!");
        } else {
          toast.error(result?.error || "Erro ao gerar imagem.");
        }
      } catch (error) {
        console.error("Error generating image:", error);
        toast.error("Erro ao gerar imagem. Tente novamente.");
      }

      setIsGenerating(false);
    },
    [
      originalImageBase64,
      mask,
      replaceTextMutation,
      replaceProductMutation,
      replaceElementMutation,
    ]
  );

  const handleDownload = useCallback(() => {
    if (!resultImage) return;

    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `creative-${Date.now()}.png`;
    link.click();
  }, [resultImage]);

  const handleReset = useCallback(() => {
    setResultImage(null);
    setMask(null);
  }, []);

  const handleNewImage = useCallback(() => {
    setOriginalImage(null);
    setOriginalImageBase64(null);
    setResultImage(null);
    setMask(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleUseResult = useCallback(() => {
    if (!resultImage) return;

    // Convert result URL to base64 for further editing
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL("image/png");
      setOriginalImage(dataUrl);
      setOriginalImageBase64(dataUrl.split(",")[1]);
      setResultImage(null);
      setMask(null);
    };
    img.src = resultImage;
  }, [resultImage]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex items-center gap-4 h-14 px-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Editor de Criativos</h1>
          </div>
          {originalImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewImage}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Nova Imagem
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        {!originalImage ? (
          /* Upload Section */
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  Upload do Criativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-4 transition bg-secondary/30"
                >
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-lg font-medium">
                      Arraste ou clique para fazer upload
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, PNG ou WebP (max 10MB)
                    </p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border">
                  <h3 className="font-medium mb-2">Como usar:</h3>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li>1. Faca upload de um criativo existente</li>
                    <li>2. Selecione a area que deseja editar (texto ou produto)</li>
                    <li>3. Escolha o tipo de edicao e configure</li>
                    <li>4. Clique em "Gerar com IA" e aguarde o resultado</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Editor Section */
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Canvas Area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Result Comparison */}
              {resultImage && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Resultado</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCompareMode(!compareMode)}
                          className="gap-2"
                        >
                          <Maximize2 className="w-4 h-4" />
                          {compareMode ? "Normal" : "Comparar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUseResult}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Editar Resultado
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownload}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {compareMode ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground text-center">
                            Original
                          </p>
                          <img
                            src={originalImage}
                            alt="Original"
                            className="w-full rounded-lg border border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground text-center">
                            Editado
                          </p>
                          <img
                            src={resultImage}
                            alt="Resultado"
                            className="w-full rounded-lg border border-border"
                          />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={resultImage}
                        alt="Resultado"
                        className="w-full rounded-lg border border-border"
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Mask Canvas */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {resultImage ? "Imagem Original" : "Selecione a Area"}
                    </CardTitle>
                    {mask && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Check className="w-4 h-4" />
                        Area selecionada
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {originalImage && (
                    <MaskCanvas
                      imageUrl={originalImage}
                      onMaskCreated={handleMaskCreated}
                      onMaskCleared={handleMaskCleared}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Editor Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Edicao</CardTitle>
                </CardHeader>
                <CardContent>
                  <ElementEditor
                    hasMask={!!mask}
                    isGenerating={isGenerating}
                    onGenerate={handleGenerate}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              {resultImage && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Acoes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleReset}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Nova Edicao
                    </Button>
                    <Button
                      variant="default"
                      className="w-full gap-2"
                      onClick={handleDownload}
                    >
                      <Download className="w-4 h-4" />
                      Baixar Resultado
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Tips */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Dicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      Selecione areas precisas para melhores resultados
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      Para texto, inclua margens ao redor das letras
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      Use descricoes detalhadas para produtos
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      Revise o resultado antes de finalizar
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-8 flex flex-col items-center gap-4 shadow-lg">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Gerando imagem com IA...</p>
            <p className="text-sm text-muted-foreground">
              Isso pode levar alguns segundos
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
