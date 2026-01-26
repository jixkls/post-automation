import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, Download, Trash2, ChevronLeft, ChevronRight, Filter, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "Twitter" },
  { id: "linkedin", label: "LinkedIn" },
];

const STATUSES = [
  { id: "draft", label: "Rascunho" },
  { id: "ready", label: "Pronto" },
  { id: "published", label: "Publicado" },
  { id: "failed", label: "Falhou" },
];

type Platform = "instagram" | "facebook" | "twitter" | "linkedin";
type Status = "draft" | "ready" | "published" | "failed";

export default function PostHistory() {
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState<Platform | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Status | undefined>(undefined);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const postsQuery = trpc.posts.listPosts.useQuery({
    page,
    limit: 12,
    platform: platformFilter,
    status: statusFilter,
  });

  const deletePostMutation = trpc.posts.deletePost.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Post excluído!");
        postsQuery.refetch();
      } else {
        toast.error(data.error || "Erro ao excluir post");
      }
    },
    onError: () => {
      toast.error("Erro ao excluir post");
    },
  });

  const updatePostMutation = trpc.posts.updatePost.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Post atualizado!");
        postsQuery.refetch();
      } else {
        toast.error(data.error || "Erro ao atualizar post");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar post");
    },
  });

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    toast.success("Caption copiada!");
  };

  const handleDownloadImage = async (imageUrl: string, platform: string) => {
    try {
      const response = await fetch(imageUrl);
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

  const handleDeletePost = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este post?")) {
      deletePostMutation.mutate({ id });
    }
  };

  const handleMarkAsPublished = (id: number) => {
    updatePostMutation.mutate({ id, status: "published" });
  };

  const clearFilters = () => {
    setPlatformFilter(undefined);
    setStatusFilter(undefined);
    setPage(1);
  };

  const hasActiveFilters = platformFilter || statusFilter;
  const totalPages = Math.ceil((postsQuery.data?.total || 0) / 12);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-yellow-500/20 text-yellow-600";
      case "ready":
        return "bg-green-500/20 text-green-600";
      case "published":
        return "bg-blue-500/20 text-blue-600";
      case "failed":
        return "bg-red-500/20 text-red-600";
      default:
        return "bg-gray-500/20 text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    return STATUSES.find(s => s.id === status)?.label || status;
  };

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Histórico de Posts</h1>
          <p className="text-muted-foreground">Visualize e gerencie seus posts gerados</p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtros
                {hasActiveFilters && (
                  <span className="bg-primary-foreground text-primary rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {(platformFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
                  </span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                  <X className="w-3 h-3" />
                  Limpar
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {postsQuery.data?.total || 0} posts encontrados
            </p>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Plataforma</label>
                <div className="flex gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPlatformFilter(platformFilter === p.id ? undefined : p.id as Platform);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                        platformFilter === p.id
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
                <label className="text-sm font-medium mb-2 block">Status</label>
                <div className="flex gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setStatusFilter(statusFilter === s.id ? undefined : s.id as Status);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                        statusFilter === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Loading State */}
        {postsQuery.isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!postsQuery.isLoading && postsQuery.data?.posts.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">Nenhum post encontrado</p>
              <p className="text-sm">
                {hasActiveFilters
                  ? "Tente ajustar os filtros"
                  : "Comece criando seu primeiro post no Wizard"}
              </p>
            </div>
          </Card>
        )}

        {/* Posts Grid */}
        {!postsQuery.isLoading && postsQuery.data?.posts && postsQuery.data.posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {postsQuery.data.posts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                {/* Image */}
                {post.imageUrl ? (
                  <div className="aspect-square bg-secondary/10 relative group">
                    <img
                      src={post.imageUrl}
                      alt={post.topic}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadImage(post.imageUrl!, post.platform)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedPost(post.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-secondary/30 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Sem imagem</p>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {post.platform}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(post.status)}`}>
                      {getStatusLabel(post.status)}
                    </span>
                  </div>

                  {/* Topic */}
                  <p className="font-medium text-sm mb-2 line-clamp-1">{post.topic}</p>

                  {/* Caption Preview */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{post.caption}</p>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(post.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => handleCopyCaption(post.caption)}
                    >
                      <Copy className="w-3 h-3" />
                      Copiar
                    </Button>
                    {post.status === "ready" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleMarkAsPublished(post.id)}
                      >
                        Publicar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Post Detail Modal */}
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {(() => {
                const post = postsQuery.data?.posts.find(p => p.id === selectedPost);
                if (!post) return null;

                return (
                  <div>
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={post.topic}
                        className="w-full h-auto"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-xs font-medium uppercase text-muted-foreground">
                            {post.platform}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${getStatusColor(post.status)}`}>
                            {getStatusLabel(post.status)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPost(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <h3 className="font-bold text-lg mb-2">{post.topic}</h3>

                      <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium mb-1">Caption</p>
                        <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                      </div>

                      {post.imagePrompt && (
                        <div className="bg-slate-900 rounded-lg p-4 mb-4">
                          <p className="text-sm font-medium mb-1 text-slate-200">Image Prompt</p>
                          <p className="text-xs text-green-400 font-mono whitespace-pre-wrap">{post.imagePrompt}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                        {post.style && <p>Estilo: {post.style}</p>}
                        {post.tone && <p>Tom: {post.tone}</p>}
                        {post.goal && <p>Objetivo: {post.goal}</p>}
                        {post.aspectRatio && <p>Proporção: {post.aspectRatio}</p>}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleCopyCaption(post.caption)}
                          className="flex-1 gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Copiar Caption
                        </Button>
                        {post.imageUrl && (
                          <Button
                            variant="outline"
                            onClick={() => handleDownloadImage(post.imageUrl!, post.platform)}
                            className="flex-1 gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Baixar Imagem
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
