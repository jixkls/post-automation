import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Type,
  Package,
  Wand2,
  Upload,
  X,
  Loader2,
  ImageIcon,
} from "lucide-react";

type EditType = "text" | "product" | "generic";

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

interface ElementEditorProps {
  hasMask: boolean;
  isGenerating: boolean;
  onGenerate: (params: GenerateParams) => void;
}

interface GenerateParams {
  editType: EditType;
  text?: string;
  textStyle?: TextStyle;
  productDescription?: string;
  productImage?: string;
  genericPrompt?: string;
}

const EDIT_TYPE_OPTIONS: { id: EditType; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Texto", icon: Type },
  { id: "product", label: "Produto", icon: Package },
  { id: "generic", label: "Generico", icon: Wand2 },
];

const TEXT_STYLE_OPTIONS: { id: TextStyle; label: string }[] = [
  { id: "bold", label: "Bold" },
  { id: "elegant", label: "Elegante" },
  { id: "playful", label: "Divertido" },
  { id: "minimal", label: "Minimal" },
  { id: "neon", label: "Neon" },
  { id: "threed", label: "3D" },
  { id: "gradient", label: "Gradiente" },
  { id: "vintage", label: "Vintage" },
  { id: "graffiti", label: "Graffiti" },
];

export default function ElementEditor({
  hasMask,
  isGenerating,
  onGenerate,
}: ElementEditorProps) {
  const [editType, setEditType] = useState<EditType>("text");
  const [text, setText] = useState("");
  const [textStyle, setTextStyle] = useState<TextStyle>("bold");
  const [productDescription, setProductDescription] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(
    null
  );
  const [genericPrompt, setGenericPrompt] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setProductImagePreview(dataUrl);

      // Extract base64 without data URL prefix
      const base64 = dataUrl.split(",")[1];
      setProductImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const clearProductImage = () => {
    setProductImage(null);
    setProductImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = () => {
    const params: GenerateParams = { editType };

    if (editType === "text") {
      params.text = text;
      params.textStyle = textStyle;
    } else if (editType === "product") {
      params.productDescription = productDescription;
      if (productImage) {
        params.productImage = productImage;
      }
    } else {
      params.genericPrompt = genericPrompt;
    }

    onGenerate(params);
  };

  const canGenerate = () => {
    if (!hasMask) return false;
    if (isGenerating) return false;

    if (editType === "text") {
      return text.trim().length > 0;
    } else if (editType === "product") {
      return productDescription.trim().length > 0;
    } else {
      return genericPrompt.trim().length > 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit Type Selection */}
      <div className="space-y-2">
        <Label>Tipo de Edicao</Label>
        <div className="grid grid-cols-3 gap-2">
          {EDIT_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => setEditType(option.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition ${
                  editType === option.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit Type Specific Fields */}
      {editType === "text" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Novo Texto</Label>
            <Input
              id="text"
              placeholder="Digite o novo texto..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Estilo do Texto</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEXT_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setTextStyle(option.id)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
                    textStyle === option.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {editType === "product" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productDescription">Descricao do Produto</Label>
            <Textarea
              id="productDescription"
              placeholder="Descreva o produto que deve aparecer na area selecionada..."
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem de Referencia (Opcional)</Label>
            {productImagePreview ? (
              <div className="relative">
                <img
                  src={productImagePreview}
                  alt="Produto"
                  className="w-full h-32 object-contain rounded-lg border border-border bg-secondary/30"
                />
                <button
                  onClick={clearProductImage}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Upload de imagem
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProductImageChange}
              className="hidden"
            />
          </div>
        </div>
      )}

      {editType === "generic" && (
        <div className="space-y-2">
          <Label htmlFor="genericPrompt">Prompt</Label>
          <Textarea
            id="genericPrompt"
            placeholder="Descreva o que deve aparecer na area selecionada..."
            value={genericPrompt}
            onChange={(e) => setGenericPrompt(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Descreva em detalhes o que a IA deve gerar na area selecionada.
          </p>
        </div>
      )}

      {/* Status Messages */}
      {!hasMask && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600">
          <ImageIcon className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">
            Selecione uma area na imagem usando as ferramentas de mascara.
          </p>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!canGenerate()}
        className="w-full gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Gerar com IA
          </>
        )}
      </Button>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Texto:</strong> Substitui texto na area selecionada
        </p>
        <p>
          <strong>Produto:</strong> Insere um novo produto na area
        </p>
        <p>
          <strong>Generico:</strong> Gera qualquer elemento descrito
        </p>
      </div>
    </div>
  );
}
