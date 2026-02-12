/**
 * Vertex AI service for advanced image operations
 *
 * Provides inpainting, background removal, and object insertion
 * using the Imagen 3.0 model via Vertex AI endpoints.
 *
 * Requires:
 * - GOOGLE_CLOUD_PROJECT: GCP project ID (default: gen-lang-client-0436130343)
 * - GOOGLE_CLOUD_LOCATION: Region (default: us-central1)
 * - BUILT_IN_FORGE_API_KEY: Google API key for authentication
 */

import { storagePut } from "server/storage";
import { ENV } from "./env";

const VERTEX_AI_TIMEOUT_MS = 120000;

export type VertexAIErrorCode =
  | "CONFIG_ERROR"
  | "AUTH_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "API_ERROR"
  | "INVALID_RESPONSE";

export class VertexAIError extends Error {
  code: VertexAIErrorCode;
  statusCode?: number;

  constructor(message: string, code: VertexAIErrorCode, statusCode?: number) {
    super(message);
    this.name = "VertexAIError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

type VertexAIPrediction = {
  bytesBase64Encoded?: string;
  mimeType?: string;
};

type VertexAIResponse = {
  predictions?: VertexAIPrediction[];
};

export type InpaintImageOptions = {
  image: string;
  mask: string;
  prompt: string;
  negativePrompt?: string;
  sampleCount?: number;
  maskDilation?: number;
};

export type RemoveBackgroundOptions = {
  image: string;
};

export type InsertObjectOptions = {
  image: string;
  mask: string;
  prompt: string;
  negativePrompt?: string;
  sampleCount?: number;
};

type VertexAIConfig = {
  projectId: string;
  location: string;
  apiKey: string;
};

function getConfig(): VertexAIConfig {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0436130343";
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  const apiKey = ENV.forgeApiKey;

  if (!apiKey) {
    throw new VertexAIError(
      "BUILT_IN_FORGE_API_KEY environment variable is not configured",
      "CONFIG_ERROR"
    );
  }

  return { projectId, location, apiKey };
}

function buildVertexAIUrl(
  config: VertexAIConfig,
  model: string,
  action: string = "predict"
): string {
  return `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${model}:${action}?key=${config.apiKey}`;
}

async function callVertexAI(
  url: string,
  payload: Record<string, unknown>
): Promise<VertexAIResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VERTEX_AI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new VertexAIError(
        `Request timed out after ${VERTEX_AI_TIMEOUT_MS / 1000} seconds`,
        "TIMEOUT_ERROR"
      );
    }
    throw new VertexAIError(
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new VertexAIError(
      `Vertex AI request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`,
      "API_ERROR",
      response.status
    );
  }

  return (await response.json()) as VertexAIResponse;
}

/**
 * Inpaint an image using a mask
 *
 * @param options.image - Base64 encoded original image
 * @param options.mask - Base64 encoded mask (white = area to edit)
 * @param options.prompt - Description of what to generate in the masked area
 * @param options.negativePrompt - What to avoid in the generated content
 * @param options.sampleCount - Number of variations to generate (default: 1)
 * @param options.maskDilation - Mask edge softening (default: 0.01)
 */
export async function inpaintImage(
  options: InpaintImageOptions
): Promise<{ imageBase64: string; url?: string }> {
  const config = getConfig();
  const url = buildVertexAIUrl(config, "imagen-3.0-capability-001");

  const payload = {
    instances: [
      {
        prompt: options.prompt,
        image: { bytesBase64Encoded: options.image },
        mask: { bytesBase64Encoded: options.mask },
      },
    ],
    parameters: {
      editMode: "EDIT_MODE_INPAINT_INSERTION",
      maskMode: "MASK_MODE_USER_PROVIDED",
      maskDilation: options.maskDilation ?? 0.01,
      sampleCount: options.sampleCount ?? 1,
      ...(options.negativePrompt && { negativePrompt: options.negativePrompt }),
    },
  };

  const result = await callVertexAI(url, payload);

  const imageData = result.predictions?.[0]?.bytesBase64Encoded;
  if (!imageData) {
    throw new VertexAIError(
      "Vertex AI response missing image data",
      "INVALID_RESPONSE"
    );
  }

  // Save to storage
  const mimeType = result.predictions?.[0]?.mimeType || "image/png";
  const buffer = Buffer.from(imageData, "base64");
  const { url: storageUrl } = await storagePut(
    `creative-editor/${Date.now()}.png`,
    buffer,
    mimeType
  );

  return {
    imageBase64: imageData,
    url: storageUrl,
  };
}

/**
 * Remove background from an image
 *
 * @param options.image - Base64 encoded image
 */
export async function removeBackground(
  options: RemoveBackgroundOptions
): Promise<{ imageBase64: string; url?: string }> {
  const config = getConfig();
  const url = buildVertexAIUrl(config, "imagen-3.0-capability-001");

  const payload = {
    instances: [
      {
        image: { bytesBase64Encoded: options.image },
      },
    ],
    parameters: {
      editMode: "EDIT_MODE_BGREMOVAL",
      sampleCount: 1,
    },
  };

  const result = await callVertexAI(url, payload);

  const imageData = result.predictions?.[0]?.bytesBase64Encoded;
  if (!imageData) {
    throw new VertexAIError(
      "Vertex AI response missing image data",
      "INVALID_RESPONSE"
    );
  }

  // Save to storage
  const mimeType = result.predictions?.[0]?.mimeType || "image/png";
  const buffer = Buffer.from(imageData, "base64");
  const { url: storageUrl } = await storagePut(
    `creative-editor/${Date.now()}-nobg.png`,
    buffer,
    mimeType
  );

  return {
    imageBase64: imageData,
    url: storageUrl,
  };
}

/**
 * Insert an object into a specified area of an image
 *
 * @param options.image - Base64 encoded original image
 * @param options.mask - Base64 encoded mask (white = area to insert)
 * @param options.prompt - Description of the object to insert
 * @param options.negativePrompt - What to avoid
 * @param options.sampleCount - Number of variations (default: 1)
 */
export async function insertObject(
  options: InsertObjectOptions
): Promise<{ imageBase64: string; url?: string }> {
  const config = getConfig();
  const url = buildVertexAIUrl(config, "imagen-3.0-capability-001");

  const payload = {
    instances: [
      {
        prompt: options.prompt,
        image: { bytesBase64Encoded: options.image },
        mask: { bytesBase64Encoded: options.mask },
      },
    ],
    parameters: {
      editMode: "EDIT_MODE_INPAINT_INSERTION",
      maskMode: "MASK_MODE_USER_PROVIDED",
      sampleCount: options.sampleCount ?? 1,
      ...(options.negativePrompt && { negativePrompt: options.negativePrompt }),
    },
  };

  const result = await callVertexAI(url, payload);

  const imageData = result.predictions?.[0]?.bytesBase64Encoded;
  if (!imageData) {
    throw new VertexAIError(
      "Vertex AI response missing image data",
      "INVALID_RESPONSE"
    );
  }

  // Save to storage
  const mimeType = result.predictions?.[0]?.mimeType || "image/png";
  const buffer = Buffer.from(imageData, "base64");
  const { url: storageUrl } = await storagePut(
    `creative-editor/${Date.now()}-insert.png`,
    buffer,
    mimeType
  );

  return {
    imageBase64: imageData,
    url: storageUrl,
  };
}
