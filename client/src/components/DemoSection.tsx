import { useState } from "react";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const DEMO_TEMPLATES = {
  product: {
    caption: "Check out our latest {product}! 🚀 Perfect for {use_case}. Limited time offer - get {discount}% off today. Link in bio. #innovation #tech",
    imagePrompt: "Professional product photography of {product} on clean white background, studio lighting, sharp focus, high resolution, commercial photography style, modern minimalist aesthetic"
  },
  lifestyle: {
    caption: "Living the {lifestyle} life! ✨ {description} Join our community of {audience}. {cta} #lifestyle #community #inspiration",
    imagePrompt: "Vibrant lifestyle photography of {lifestyle} scene, bright natural lighting, warm color palette, modern aesthetic, high quality, Instagram-ready, lifestyle photography style"
  },
  announcement: {
    caption: "📢 Big news! {announcement} We're excited to share this with you. {details} Learn more: {link} #announcement #news #update",
    imagePrompt: "Bold announcement graphic with {announcement}, modern design, eye-catching colors, professional typography, high contrast, suitable for social media, graphic design style"
  },
  educational: {
    caption: "Did you know? {fact} 🧠 {explanation} Want to learn more? {cta} #education #learning #knowledge",
    imagePrompt: "Educational infographic about {fact}, clean design, clear typography, professional color scheme, information design, high quality, suitable for social media"
  },
  promotional: {
    caption: "🎉 Special offer: {offer}! {details} Use code {code} for {discount}% off. Hurry, {urgency}! #sale #promotion #limited",
    imagePrompt: "Eye-catching promotional graphic for {offer}, vibrant colors, bold typography, urgency elements, professional design, high contrast, retail-ready aesthetic"
  }
};

const PLATFORM_DIMENSIONS = {
  instagram: "1080x1080 (square)",
  facebook: "1200x628 (landscape)",
  twitter: "1024x512 (landscape)",
  linkedin: "1200x627 (landscape)"
};

export default function DemoSection() {
  const [topic, setTopic] = useState("");
  const [templateType, setTemplateType] = useState<keyof typeof DEMO_TEMPLATES>("product");
  const [platform, setPlatform] = useState("instagram");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // tRPC mutations for Gemini API
  const generatePostMutation = trpc.gemini.generatePost.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedCaption(data.caption);
        setGeneratedPrompt(data.imagePrompt);
        toast.success("✨ Post generated with Gemini AI!");
      } else {
        toast.error(data.error || "Failed to generate post");
      }
    },
    onError: (error) => {
      toast.error("Error generating post: " + error.message);
    },
  });

  const extractVariables = (text: string) => {
    const regex = /\{([^}]+)\}/g;
    const vars: Record<string, string> = {};
    let match;
    while ((match = regex.exec(text)) !== null) {
      vars[match[1]] = "";
    }
    return vars;
  };

  const handleTemplateChange = (type: keyof typeof DEMO_TEMPLATES) => {
    setTemplateType(type);
    const template = DEMO_TEMPLATES[type];
    const captionVars = extractVariables(template.caption);
    const promptVars = extractVariables(template.imagePrompt);
    setVariables({ ...captionVars, ...promptVars });
    setGeneratedCaption("");
    setGeneratedPrompt("");
  };

  const fillTemplate = (template: string, vars: Record<string, string>) => {
    let result = template;
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value || `[${key}]`);
    });
    return result;
  };

  const handleGenerate = async () => {
    const template = DEMO_TEMPLATES[templateType];
    const filledCaption = fillTemplate(template.caption, variables);
    
    generatePostMutation.mutate({
      topic: variables.product || variables.lifestyle || variables.offer || variables.fact || "social media post",
      style: "modern professional",
      tone: "engaging",
      goal: "engagement",
      platform: platform as any,
    });
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (text: string, setCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTemplate = DEMO_TEMPLATES[templateType];
  const currentVars = extractVariables(currentTemplate.caption + currentTemplate.imagePrompt);
  const isLoading = generatePostMutation.isPending;

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background via-secondary/20 to-background">
      <div className="container max-w-6xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Interactive Demo</span>
          </div>
          <h2 className="text-4xl font-bold mb-4">Try It Live with Gemini AI</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select a template, fill in your details, and watch as Gemini AI generates optimized captions and image prompts in real-time.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 border-border/50">
              <h3 className="text-lg font-semibold mb-4">Configuration</h3>
              
              {/* Template Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium">Post Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(DEMO_TEMPLATES).map(type => (
                    <button
                      key={type}
                      onClick={() => handleTemplateChange(type as keyof typeof DEMO_TEMPLATES)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        templateType === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform Selection */}
              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium">Platform</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                >
                  {Object.entries(PLATFORM_DIMENSIONS).map(([key, dims]) => (
                    <option key={key} value={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1)} ({dims})
                    </option>
                  ))}
                </select>
              </div>

              {/* Variable Inputs */}
              <div className="space-y-4">
                <label className="text-sm font-medium block">Template Variables</label>
                {Object.keys(currentVars).map(key => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground mb-1 block capitalize">
                      {key.replace(/_/g, " ")}
                    </label>
                    <Input
                      placeholder={`Enter ${key}`}
                      value={variables[key] || ""}
                      onChange={e => handleVariableChange(key, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading || Object.values(variables).some(v => !v)}
                className="w-full mt-6 gap-2 bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            </Card>
          </div>

          {/* Output Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Caption Output */}
            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">AI-Generated Caption</h3>
                {generatedCaption && (
                  <button
                    onClick={() => copyToClipboard(generatedCaption, setCopiedCaption)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
                  >
                    {copiedCaption ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {generatedCaption ? (
                <div className="bg-secondary/50 rounded-lg p-4 min-h-24 border border-border/50">
                  <p className="text-sm leading-relaxed text-foreground">{generatedCaption}</p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {generatedCaption.length} characters • {generatedCaption.split(" ").length} words
                  </div>
                </div>
              ) : (
                <div className="bg-secondary/30 rounded-lg p-4 min-h-24 border border-dashed border-border flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Your AI-generated caption will appear here...</p>
                </div>
              )}
            </Card>

            {/* Image Prompt Output */}
            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Gemini Imagen Prompt</h3>
                {generatedPrompt && (
                  <button
                    onClick={() => copyToClipboard(generatedPrompt, setCopiedPrompt)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {generatedPrompt ? (
                <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 min-h-24 border border-border/50 font-mono text-sm">
                  <p className="text-green-400 leading-relaxed break-words">{generatedPrompt}</p>
                  <div className="mt-3 text-xs text-slate-400">
                    {generatedPrompt.length} characters • Ready for Gemini Imagen API
                  </div>
                </div>
              ) : (
                <div className="bg-secondary/30 rounded-lg p-4 min-h-24 border border-dashed border-border flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Your image prompt will appear here...</p>
                </div>
              )}
            </Card>

            {/* Info Box */}
            {generatedCaption && generatedPrompt && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-primary mb-1">✨ Powered by Gemini AI!</p>
                    <p className="text-muted-foreground">
                      Copy the caption to your social media platform and use the image prompt with Gemini Imagen API to generate your visual content automatically.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Template Examples */}
        <div className="mt-16 pt-16 border-t border-border">
          <h3 className="text-2xl font-bold mb-8 text-center">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Choose Template",
                description: "Select a post type that matches your content (product, lifestyle, announcement, etc.)"
              },
              {
                step: "2",
                title: "Fill Variables",
                description: "Enter specific details like product name, target audience, or key message"
              },
              {
                step: "3",
                title: "AI Generates & Copy",
                description: "Gemini AI optimizes your caption and creates a detailed image prompt ready for Imagen API"
              }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
