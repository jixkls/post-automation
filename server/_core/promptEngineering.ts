import { invokeLLM } from "./llm";

export const PHOTOREALISM_ANCHOR =
  "Photorealistic photograph, natural lighting and textures. Not an illustration, not a rendering. 8K resolution, no text, no watermarks, no artifacts.";

export function buildProductReferencePrompt(): string {
  return `IMPORTANT: The attached image contains the PRODUCT that must be the hero of this image.
Recreate this exact product with photorealistic accuracy — preserve its shape, colors, branding, labels, and packaging exactly as shown.
The product must be the central subject and focal point of the composition. Build the entire scene around it.
Do NOT replace, alter, or reimagine the product. Do NOT add people unless the prompt explicitly requests them.`;
}

export function buildPersonReferencePrompt(): string {
  return `IMPORTANT: The attached image contains a PERSON that MUST be preserved exactly.
Keep the person's: facial features, skin tone, hair color/style, body type, and overall appearance.
Create a new scene with this EXACT same person.`;
}

// Photography equipment mappings per visual style
const STYLE_PHOTOGRAPHY: Record<string, { camera: string; lens: string; lighting: string }> = {
  minimalist: {
    camera: "Leica M11",
    lens: "50mm f/2 Summicron",
    lighting: "Natural window light, high key, soft diffused",
  },
  creative: {
    camera: "Canon EOS R5",
    lens: "24-70mm f/2.8L RF",
    lighting: "Colored gels, creative backlighting, RGB accents",
  },
  professional: {
    camera: "Phase One IQ4 150MP",
    lens: "120mm f/4 Macro",
    lighting: "Three-point studio lighting with softbox key light, silver fill, hair light",
  },
  casual: {
    camera: "Fujifilm X-T5",
    lens: "35mm f/1.4 XF",
    lighting: "Ambient golden hour light, natural and warm",
  },
  luxury: {
    camera: "Hasselblad X2D 100C",
    lens: "90mm f/2.5 XCD",
    lighting: "Rembrandt lighting, dark moody shadows, single dramatic key light",
  },
};

export function mapStyleToPhotography(style: string, tone: string) {
  const equipment = STYLE_PHOTOGRAPHY[style] || STYLE_PHOTOGRAPHY.professional;

  const toneModifiers: Record<string, string> = {
    funny: "vibrant playful energy, candid feel, bright saturated colors",
    inspiring: "epic heroic composition, dramatic skies, golden light rays",
    urgent: "high contrast, sharp focus, dynamic angles, bold red accents",
    educational: "clean informative layout, balanced neutral tones, clear subject",
    emotional: "intimate shallow DOF, warm tones, soft vignette, human connection",
  };

  return {
    ...equipment,
    tonalModifier: toneModifiers[tone] || toneModifiers.educational,
  };
}

function extractLLMText(response: Awaited<ReturnType<typeof invokeLLM>>, fallback: string): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (first && "text" in first) return first.text;
  }
  return fallback;
}

export async function buildBaseScenePrompt(config: {
  topic: string;
  style: string;
  tone: string;
  goal: string;
  platform: string;
  aspectRatio?: string;
  hasProductImage?: boolean;
}): Promise<string> {
  const photo = mapStyleToPhotography(config.style, config.tone);

  const productContext = config.hasProductImage
    ? "The attached product image is the HERO of this shot. Recreate the exact product (shape, colors, branding, packaging) with photorealistic accuracy as the central subject. Build the entire scene around it."
    : "";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert photography director and prompt engineer. Generate a single, detailed photography prompt for AI image generation. The prompt must include specific photography terminology for maximum photorealism. Return ONLY the prompt text, nothing else.`,
      },
      {
        role: "user",
        content: `Create a photorealistic image prompt for a ${config.platform} post about: ${config.topic}

Photography equipment:
- Camera: ${photo.camera}
- Lens: ${photo.lens}
- Lighting: ${photo.lighting}

Mood: ${photo.tonalModifier}
Goal: ${config.goal}
${config.aspectRatio ? `Format: ${config.aspectRatio}` : ""}
${productContext}

The prompt MUST include:
1. Specific camera and lens reference (e.g., "shot on ${photo.camera} with ${photo.lens}")
2. Lighting setup description
3. Depth of field specification (e.g., "shallow DOF at f/2.0, creamy bokeh")
4. Color science and grading direction
5. Composition rule (e.g., "rule of thirds, subject in left third")
6. Negative constraints: "no text, no watermarks, no artifacts, 8K resolution, photorealistic"

Return ONLY the prompt. Under 500 tokens.`,
      },
    ],
  });

  return extractLLMText(response, `Professional product photography of ${config.topic}, shot on ${photo.camera} with ${photo.lens}, ${photo.lighting}, shallow depth of field, 8K resolution, photorealistic, no text, no watermarks`).trim();
}

export function buildCompositionPrompt(adjustments: {
  background?: string;
  framing?: string;
  cameraAngle?: string;
  depthOfField?: string;
}): string {
  const parts: string[] = [
    "Refine this image's composition while preserving the main subject exactly.",
  ];

  if (adjustments.background) {
    parts.push(`Background: ${adjustments.background}.`);
  }
  if (adjustments.framing) {
    parts.push(`Framing: ${adjustments.framing}.`);
  }
  if (adjustments.cameraAngle) {
    parts.push(`Camera angle: ${adjustments.cameraAngle}.`);
  }
  if (adjustments.depthOfField) {
    parts.push(`Depth of field: ${adjustments.depthOfField}.`);
  }

  parts.push("Keep the subject, colors, and overall quality intact. 8K resolution, photorealistic, no text, no watermarks.");

  return parts.join(" ");
}

export function buildColorGradingPrompt(grading: {
  temperature?: string;
  contrast?: string;
  saturation?: string;
  mood?: string;
  filmStock?: string;
}): string {
  const parts: string[] = [
    "Apply professional color grading to this image while preserving the composition and subject exactly.",
  ];

  if (grading.temperature) {
    parts.push(`Color temperature: ${grading.temperature}.`);
  }
  if (grading.contrast) {
    parts.push(`Contrast: ${grading.contrast}.`);
  }
  if (grading.saturation) {
    parts.push(`Saturation: ${grading.saturation}.`);
  }
  if (grading.mood) {
    parts.push(`Mood: ${grading.mood}.`);
  }
  if (grading.filmStock) {
    parts.push(`Film stock emulation: ${grading.filmStock}.`);
  }

  parts.push("Do not alter composition, framing, or subject. 8K resolution, photorealistic, no text, no watermarks.");

  return parts.join(" ");
}

export async function fetchImageAsBase64(imageUrl: string): Promise<{ b64Json: string; mimeType: string }> {
  let imageBuffer: Buffer;
  let mimeType = "image/png";

  if (imageUrl.startsWith("/uploads/")) {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", imageUrl);
    imageBuffer = fs.readFileSync(filePath);
    if (imageUrl.endsWith(".jpg") || imageUrl.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (imageUrl.endsWith(".webp")) {
      mimeType = "image/webp";
    }
  } else {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
    mimeType = response.headers.get("content-type") || "image/png";
  }

  return {
    b64Json: imageBuffer.toString("base64"),
    mimeType,
  };
}
