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

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

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

  // Use Gemini API with image generation model (Nano Banana / Gemini 2.5 Flash Image)
  const model = "gemini-2.5-flash-image";
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

  // Add the text prompt after the images
  parts.push({ text: options.prompt });

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
