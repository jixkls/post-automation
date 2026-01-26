import { useState, useEffect } from "react";
import { ArrowRight, Zap, Code, TrendingUp, CheckCircle2, Layers, Database, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DemoSection from "@/components/DemoSection";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, loading, error, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg font-sora">AutoPost</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#architecture" className="text-sm hover:text-primary transition">
              Architecture
            </a>
            <a href="#roadmap" className="text-sm hover:text-primary transition">
              Roadmap
            </a>
            <a href="#costs" className="text-sm hover:text-primary transition">
              Costs
            </a>
            <a href="#implementation" className="text-sm hover:text-primary transition">
              Implementation
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container max-w-5xl mx-auto relative z-10">
          <div className="text-center space-y-6 fade-in">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="text-gradient">AI-Powered</span> Social Media Automation
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Eliminate manual design work. Generate stunning social media posts with AI-powered image creation and content generation in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Key Benefits Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16">Why AutoPost?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Generate complete posts in under 2 minutes from template to published",
              },
              {
                icon: TrendingUp,
                title: "Cost Effective",
                description: "80-90% savings compared to hiring a full-time designer",
              },
              {
                icon: Layers,
                title: "Multi-Platform",
                description: "Publish to Instagram, Facebook, Twitter, and LinkedIn simultaneously",
              },
            ].map((benefit, idx) => (
              <Card
                key={idx}
                className="p-8 hover:shadow-lg transition-shadow duration-300 border-border/50 hover:border-primary/30"
              >
                <benefit.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-20 px-4 bg-secondary/30">
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold">System Architecture</h2>
              <p className="text-lg text-muted-foreground">
                Our automation engine orchestrates content generation, image creation, and multi-platform distribution through a scalable, cloud-native architecture.
              </p>
              <div className="space-y-4">
                {[
                  "Google Gemini Imagen API for high-fidelity image generation",
                  "Gemini Text API for intelligent caption generation",
                  "Job queue system with automatic retry logic",
                  "Multi-platform API integration (Meta, Twitter, LinkedIn)",
                  "Real-time analytics and performance tracking",
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-8 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <Code className="w-5 h-5 text-primary" />
                  <span className="font-semibold">User Interface</span>
                </div>
                <div className="text-center text-muted-foreground">↓</div>
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <Layers className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Automation Engine</span>
                </div>
                <div className="text-center text-muted-foreground">↓</div>
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <Database className="w-5 h-5 text-primary" />
                  <span className="font-semibold">APIs & Storage</span>
                </div>
                <div className="text-center text-muted-foreground">↓</div>
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <Rocket className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Social Media</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16">Technology Stack</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                category: "Image Generation",
                items: ["Google Gemini Imagen API", "Multiple aspect ratios support", "Text embedding in images"],
              },
              {
                category: "Content Generation",
                items: ["Google Gemini Text API", "Template-based generation", "Brand voice consistency"],
              },
              {
                category: "Scheduling & Orchestration",
                items: ["Node.js + Express", "Bull job queue", "Redis for caching", "Cron-based scheduling"],
              },
              {
                category: "Social Media Integration",
                items: ["Meta Graph API", "Twitter API v2", "LinkedIn API", "Analytics collection"],
              },
            ].map((stack, idx) => (
              <Card key={idx} className="p-8 border-border/50">
                <h3 className="text-xl font-semibold mb-4 text-primary">{stack.category}</h3>
                <ul className="space-y-2">
                  {stack.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex gap-2 text-muted-foreground">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="py-20 px-4 bg-secondary/30">
        <div className="container max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16">Implementation Roadmap</h2>
          <div className="space-y-6">
            {[
              {
                phase: "Phase 1",
                title: "Foundation (Week 1-2)",
                items: ["Gemini API setup", "Image generation service", "Database schema design", "Content generation pipeline"],
              },
              {
                phase: "Phase 2",
                title: "Automation Engine (Week 3-4)",
                items: ["Scheduling system", "Job queue management", "Error handling & retries", "S3/Cloud storage integration"],
              },
              {
                phase: "Phase 3",
                title: "Social Media Integration (Week 5-6)",
                items: ["Meta Graph API integration", "Twitter API v2 setup", "LinkedIn API connection", "Analytics collection"],
              },
              {
                phase: "Phase 4",
                title: "Dashboard & UI (Week 7-8)",
                items: ["React dashboard", "Template builder", "Schedule visualization", "Performance analytics"],
              },
            ].map((phase, idx) => (
              <Card key={idx} className="p-8 border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                      <span className="text-primary font-bold">{idx + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{phase.title}</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {phase.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cost Analysis */}
      <section id="costs" className="py-20 px-4">
        <div className="container max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16">Cost Analysis</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Monthly Breakdown (10 posts/day)</h3>
              <div className="space-y-3">
                {[
                  { service: "Gemini Imagen API", cost: "$6-12", note: "~$0.02-0.04 per image" },
                  { service: "Gemini Text API", cost: "$1-3", note: "Caption generation" },
                  { service: "Cloud Storage (S3)", cost: "$1-2", note: "Image hosting" },
                  { service: "Server/Hosting", cost: "$20-50", note: "Depending on provider" },
                  { service: "Database & Redis", cost: "$5-15", note: "Managed services" },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start pb-3 border-b border-border/50">
                    <div>
                      <p className="font-semibold">{item.service}</p>
                      <p className="text-sm text-muted-foreground">{item.note}</p>
                    </div>
                    <p className="font-semibold text-primary">{item.cost}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t-2 border-primary">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">Total Monthly Cost</p>
                  <p className="text-2xl font-bold text-primary">$33-82</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Scales with volume. Saves 80-90% vs. hiring designer.</p>
              </div>
            </div>
            <Card className="p-8 bg-primary/5 border-primary/20">
              <h3 className="text-xl font-semibold mb-6">ROI Calculation</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Designer Salary (Annual)</p>
                  <p className="text-2xl font-bold">$40,000 - $60,000</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">AutoPost Annual Cost</p>
                  <p className="text-2xl font-bold">$396 - $984</p>
                </div>
                <div className="pt-4 border-t border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Annual Savings</p>
                  <p className="text-3xl font-bold text-primary">$39,000+</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <DemoSection />

      {/* Code Example Section */}
      <section id="implementation" className="py-20 px-4 bg-secondary/30">
        <div className="container max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16">Implementation Example</h2>
          <Card className="p-8 border-border/50 overflow-hidden">
            <div className="bg-slate-900 rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono">
                <code>{`// Generate image with Gemini Imagen API
import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

async function generateImage(prompt) {
  const response = await client.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt: prompt,
    config: {
      numberOfImages: 1,
      imageSize: "1K",
      aspectRatio: "1:1",
    },
  });
  
  return response.generatedImages[0].image.url;
}

// Schedule post for multi-platform publishing
async function schedulePost(postData) {
  const { scheduledTime, platforms, caption, imageUrl } = postData;
  
  await postQueue.add(
    { platforms, caption, imageUrl },
    { delay: scheduledTime - Date.now() }
  );
}
`}</code>
              </pre>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Simple, clean API for image generation and scheduling. Full documentation available in the implementation guide.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 pointer-events-none" />
        <div className="container max-w-4xl mx-auto relative z-10 text-center space-y-6">
          <h2 className="text-4xl font-bold">Ready to Automate?</h2>
          <p className="text-xl text-muted-foreground">
            Start generating stunning social media posts with AI. No design skills required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/50 py-12 px-4">
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">AutoPost</h3>
              <p className="text-sm text-muted-foreground">AI-powered social media automation platform.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Features</a></li>
                <li><a href="#" className="hover:text-primary transition">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">About</a></li>
                <li><a href="#" className="hover:text-primary transition">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition">Terms</a></li>
                <li><a href="#" className="hover:text-primary transition">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">© 2026 AutoPost. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-muted-foreground hover:text-primary transition">Twitter</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition">LinkedIn</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
