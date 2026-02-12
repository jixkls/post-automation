/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";
import { PHOTOREALISM_ANCHOR } from "./promptEngineering";

const IMAGE_GENERATION_TIMEOUT_MS = 120000; // 120 seconds

export type ImageGenerationErrorCode =
  | "CONFIG_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "API_ERROR"
  | "INVALID_RESPONSE";

export class ImageGenerationError extends Error {
  code: ImageGenerationErrorCode;
  statusCode?: number;

  constructor(
    message: string,
    code: ImageGenerationErrorCode,
    statusCode?: number
  ) {
    super(message);
    this.name = "ImageGenerationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

type ImageGenerationApiResponse = {
  image?: {
    b64Json?: string;
    mimeType?: string;
  };
};

export type TextOverlayConfig = {
  text: string;
  position?: "top" | "center" | "bottom";
  style?: "bold" | "elegant" | "playful" | "minimal" | "neon" | "threed" | "gradient" | "vintage" | "graffiti";
};

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  textOverlay?: TextOverlayConfig;
};

/**
 * Build an enhanced prompt with text rendering instructions for AI text-in-image
 * Uses professional typography design practices and artistic style descriptors
 */
function buildPromptWithText(basePrompt: string, textConfig: TextOverlayConfig): string {
  const { text, position = "center", style = "bold" } = textConfig;

  const styleDescriptions: Record<string, string> = {
    bold: "bold, impactful sans-serif typography with clean sharp edges, strong visual weight, high contrast black or white letters with subtle drop shadow, modern minimalist aesthetic",
    elegant: "sophisticated elegant serif typography with refined letterforms and subtle flourishes, classic timeless appeal, thin delicate strokes, luxurious gold or cream tones",
    playful: "hand-drawn whimsical typography with organic flowing lines, vibrant cheerful colors, slightly irregular playful letterforms, creative artistic flair",
    minimal: "ultra-clean minimal sans-serif typography, generous white space, perfectly balanced composition, subtle sophisticated presence, monochromatic palette",
    neon: "glowing neon sign typography with electric vibrant light emission, realistic glass tube effect, colorful glow and reflection, retro-futuristic cyberpunk aesthetic",
    threed: "3D dimensional typography with realistic shadows and depth, letters that pop out of the image, cinematic lighting, bold perspective and volume",
    gradient: "modern gradient typography with smooth color transitions, vibrant contemporary palette, sleek polished finish, Instagram-worthy aesthetic",
    vintage: "retro vintage typography with distressed textures, nostalgic color palette, classic letterpress feel, authentic aged patina",
    graffiti: "urban street art graffiti typography, spray paint texture, vibrant bold colors, edgy rebellious energy, artistic drips and splatters",
  };

  const positionDescriptions: Record<string, string> = {
    top: "positioned prominently at the top third of the image with generous breathing room from edges",
    center: "centered as the dominant focal element with balanced negative space around it",
    bottom: "anchored at the bottom third of the image with comfortable margin from the edge",
  };

  return `${basePrompt}

TYPOGRAPHY DESIGN REQUIREMENTS:
Create a visually striking social media graphic with integrated text typography.

TEXT CONTENT: The image must prominently display the text "${text}" as the focal design element.

TYPOGRAPHY STYLE: ${styleDescriptions[style] || styleDescriptions.bold}

TEXT PLACEMENT: The text should be ${positionDescriptions[position]}, composed as an integral part of the design with appropriate breathing room and visual balance.

DESIGN PRINCIPLES:
- High contrast between text and background for maximum legibility
- Professional typography that feels hand-crafted, not generic
- Text integrated naturally into the composition as a design element
- Visual hierarchy that draws the eye to the text first
- Artistic quality suitable for premium social media content

CRITICAL: The text "${text}" must be spelled correctly, clearly readable, and visually impactful.`;
}

export type GenerateImageResponse = {
  url?: string;
};

// Gemini API image generation response type
type GeminiImageResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.forgeApiKey) {
    throw new ImageGenerationError(
      "BUILT_IN_FORGE_API_KEY is not configured",
      "CONFIG_ERROR"
    );
  }

  // Use Gemini API with image generation model (Nano Banana Pro / Gemini 3 Pro Image)
  const model = "gemini-3-pro-image-preview";
  const fullUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Build the request parts - images should come FIRST for better reference
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // Add original images FIRST if provided (for image editing/composition)
  if (options.originalImages) {
    for (const img of options.originalImages) {
      if (img.b64Json) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || "image/png",
            data: img.b64Json
          }
        });
      }
    }
  }

  // Append photorealism anchor to every prompt
  const anchoredPrompt = `${options.prompt}\n\n${PHOTOREALISM_ANCHOR}`;

  // Build the final prompt (with text overlay instructions if provided)
  const finalPrompt = options.textOverlay
    ? buildPromptWithText(anchoredPrompt, options.textOverlay)
    : anchoredPrompt;

  // Add the text prompt after the images
  parts.push({ text: finalPrompt });

  // Set up timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": ENV.forgeApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts
          }
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        }
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ImageGenerationError(
        `Image generation timed out after ${IMAGE_GENERATION_TIMEOUT_MS / 1000} seconds`,
        "TIMEOUT_ERROR"
      );
    }
    throw new ImageGenerationError(
      `Network error during image generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ImageGenerationError(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`,
      "API_ERROR",
      response.status
    );
  }

  const result = (await response.json()) as GeminiImageResponse;

  // Find the image part in the response
  const imagePart = result.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data
  );

  if (!imagePart?.inlineData?.data) {
    throw new ImageGenerationError(
      "Image generation API returned invalid response: missing image data",
      "INVALID_RESPONSE"
    );
  }

  const base64Data = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType || "image/png";
  const buffer = Buffer.from(base64Data, "base64");

  // Save to storage
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    mimeType
  );
  return {
    url,
  };
}
