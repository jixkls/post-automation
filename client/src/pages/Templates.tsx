import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Pencil, Trash2, X, Save, FileText, Hash } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

const STYLES = [
  { id: "minimalist", label: "Minimalista" },
  { id: "creative", label: "Criativo" },
  { id: "professional", label: "Profissional" },
  { id: "casual", label: "Casual" },
  { id: "luxury", label: "Luxo" },
];

const TONES = [
  { id: "funny", label: "Engraçado" },
  { id: "inspiring", label: "Inspirador" },
  { id: "urgent", label: "Urgente" },
  { id: "educational", label: "Educativo" },
  { id: "emotional", label: "Emocional" },
];

const GOALS = [
  { id: "engagement", label: "Engajamento" },
  { id: "sales", label: "Vendas" },
  { id: "awareness", label: "Conscientização" },
  { id: "community", label: "Comunidade" },
  { id: "traffic", label: "Tráfego" },
];

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "Twitter" },
  { id: "linkedin", label: "LinkedIn" },
];

type Platform = "instagram" | "facebook" | "twitter" | "linkedin";

interface EditingTemplate {
  id: number;
  name: string;
  description: string;
  platform: Platform;
  aspectRatio: string;
  style: string;
  tone: string;
  goal: string;
  defaultBatchQuantity: number;
  useSameModel: boolean;
  modelDescription: string;
}

export default function Templates() {
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);

  const templatesQuery = trpc.templates.list.useQuery();

  const updateTemplateMutation = trpc.templates.update.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Template atualizado!");
        setEditingTemplate(null);
        templatesQuery.refetch();
      } else {
        toast.error(data.error || "Erro ao atualizar template");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar template");
    },
  });

  const deleteTemplateMutation = trpc.templates.delete.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Template excluído!");
        templatesQuery.refetch();
      } else {
        toast.error(data.error || "Erro ao excluir template");
      }
    },
    onError: () => {
      toast.error("Erro ao excluir template");
    },
  });

  const handleEditTemplate = (template: NonNullable<typeof templatesQuery.data>["templates"][0]) => {
    setEditingTemplate({
      id: template.id,
      name: template.name,
      description: template.description || "",
      platform: template.platform,
      aspectRatio: template.aspectRatio || "",
      style: template.style || "",
      tone: template.tone || "",
      goal: template.goal || "",
      defaultBatchQuantity: template.defaultBatchQuantity || 1,
      useSameModel: template.useSameModel || false,
      modelDescription: template.modelDescription || "",
    });
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      name: editingTemplate.name,
      description: editingTemplate.description || undefined,
      platform: editingTemplate.platform,
      aspectRatio: editingTemplate.aspectRatio || undefined,
      style: editingTemplate.style || undefined,
      tone: editingTemplate.tone || undefined,
      goal: editingTemplate.goal || undefined,
      defaultBatchQuantity: editingTemplate.defaultBatchQuantity,
      useSameModel: editingTemplate.useSameModel,
      modelDescription: editingTemplate.modelDescription || undefined,
    });
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteTemplateMutation.mutate({ id });
    }
  };

  const getLabel = (list: { id: string; label: string }[], id: string | null) => {
    return list.find((item) => item.id === id)?.label || id || "-";
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Templates</h1>
          <p className="text-muted-foreground">Gerencie suas configurações salvas</p>
        </div>

        {/* Loading State */}
        {templatesQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!templatesQuery.isLoading && templatesQuery.data?.templates.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-2">Nenhum template criado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Crie templates a partir do Wizard para reutilizar suas configurações
            </p>
            <Link href="/">
              <Button>Ir para o Wizard</Button>
            </Link>
          </Card>
        )}

        {/* Templates List */}
        {!templatesQuery.isLoading && templatesQuery.data?.templates && templatesQuery.data.templates.length > 0 && (
          <div className="space-y-4">
            {templatesQuery.data.templates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{template.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded-full capitalize">
                        {template.platform}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    )}

                    {/* Template Details */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {template.style && (
                        <span className="px-2 py-1 bg-secondary/50 rounded">
                          Estilo: {getLabel(STYLES, template.style)}
                        </span>
                      )}
                      {template.tone && (
                        <span className="px-2 py-1 bg-secondary/50 rounded">
                          Tom: {getLabel(TONES, template.tone)}
                        </span>
                      )}
                      {template.goal && (
                        <span className="px-2 py-1 bg-secondary/50 rounded">
                          Objetivo: {getLabel(GOALS, template.goal)}
                        </span>
                      )}
                      {template.aspectRatio && (
                        <span className="px-2 py-1 bg-secondary/50 rounded">
                          Proporção: {template.aspectRatio}
                        </span>
                      )}
                    </div>

                    {/* Usage Stats */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        Usado {template.useCount}x
                      </span>
                      <span>
                        Criado em {new Date(template.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Template Modal */}
        {editingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Editar Template</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTemplate(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nome</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Descrição</label>
                  <textarea
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition resize-none h-20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Plataforma</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setEditingTemplate({ ...editingTemplate, platform: p.id as Platform })}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                          editingTemplate.platform === p.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Estilo</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setEditingTemplate({ ...editingTemplate, style: s.id })}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                          editingTemplate.style === s.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tom</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setEditingTemplate({ ...editingTemplate, tone: t.id })}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                          editingTemplate.tone === t.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Objetivo</label>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setEditingTemplate({ ...editingTemplate, goal: g.id })}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                          editingTemplate.goal === g.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Quantidade padrão de posts</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingTemplate.defaultBatchQuantity}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      defaultBatchQuantity: Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                    })}
                    className="w-24 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={updateTemplateMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {updateTemplateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
