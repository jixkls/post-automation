import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, InvokeResult, TextContent, ImageContent, FileContent } from "../_core/llm";
import { generateImage, GenerateImageOptions } from "../_core/imageGeneration";
import { storagePut } from "../storage";

// Shared platform schema for consistent type safety
const platformSchema = z.enum(["instagram", "facebook", "twitter", "linkedin"]);

type ContentPart = TextContent | ImageContent | FileContent;

/**
 * Extract text content from an LLM response with fallback
 */
function extractLLMContent(response: InvokeResult, fallback: string): string {
  if (!response.choices || response.choices.length === 0) {
    return fallback;
  }

  const content = response.choices[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content) && content.length > 0) {
    const firstPart = content[0] as ContentPart;
    if (firstPart && firstPart.type === "text" && "text" in firstPart) {
      return firstPart.text;
    }
  }

  return fallback;
}

export const geminiRouter = router({
  /**
   * Generate a caption for a social media post using Gemini
   */
  generateCaption: publicProcedure
    .input(
      z.object({
        template: z.string().describe("Template with {variable} placeholders"),
        variables: z.record(z.string(), z.string()).describe("Variables to fill in the template"),
        platform: platformSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { template, variables, platform } = input;

      // Fill in the template with variables
      let filledTemplate = template;
      Object.entries(variables).forEach(([key, value]) => {
        filledTemplate = filledTemplate.replace(new RegExp(`\\{${key}\\}`, "g"), value);
      });

      // Generate an optimized caption using Gemini
      const prompt = `You are a social media content expert. I have this caption for ${platform || "social media"}:

"${filledTemplate}"

Please optimize this caption to be more engaging, concise, and platform-appropriate. Keep it under 280 characters for ${platform === "twitter" ? "Twitter" : "other platforms"}. Include relevant hashtags and emojis where appropriate. Return ONLY the optimized caption text, nothing else.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a professional social media copywriter. Generate engaging, platform-optimized captions. Return only the caption text.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const caption = extractLLMContent(response, filledTemplate);

        return {
          success: true,
          caption: caption.trim(),
          originalCaption: filledTemplate,
        };
      } catch (error) {
        console.error("Error generating caption:", error);
        return {
          success: false,
          caption: filledTemplate,
          originalCaption: filledTemplate,
          error: error instanceof Error ? error.message : "Failed to generate caption",
        };
      }
    }),

  /**
   * Generate an image prompt for Gemini Imagen API
   */
  generateImagePrompt: publicProcedure
    .input(
      z.object({
        topic: z.string().describe("Topic or subject for the image"),
        style: z.string().describe("Visual style (e.g., photography, illustration, 3D)"),
        platform: platformSchema.optional(),
        additionalContext: z.string().optional().describe("Additional context or requirements"),
      })
    )
    .mutation(async ({ input }) => {
      const { topic, style, platform, additionalContext } = input;

      // Platform-specific dimensions
      const dimensions: Record<string, string> = {
        instagram: "1080x1080 (square)",
        facebook: "1200x628 (landscape)",
        twitter: "1024x512 (landscape)",
        linkedin: "1200x627 (landscape)",
      };

      const platformDim = dimensions[platform || "instagram"] || "1080x1080";

      const prompt = `You are an expert prompt engineer for AI image generation. Create a detailed, optimized prompt for Gemini Imagen API that will generate a high-quality image for ${platform || "social media"}.

Topic: ${topic}
Visual Style: ${style}
Platform Dimensions: ${platformDim}
${additionalContext ? `Additional Context: ${additionalContext}` : ""}

Requirements for the prompt:
- Be specific and descriptive
- Include visual style details and mood
- Mention color palette if relevant
- Optimize for the platform dimensions
- Keep it under 480 tokens
- Make it suitable for Gemini Imagen API

Return ONLY the image prompt text, nothing else. Do not include any explanation or preamble.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are an expert prompt engineer for AI image generation. Create detailed, optimized prompts for Gemini Imagen API. Return only the prompt text.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const imagePrompt = extractLLMContent(response, "");

        return {
          success: true,
          imagePrompt: imagePrompt.trim(),
          topic,
          style,
          platform: platform || "instagram",
        };
      } catch (error) {
        console.error("Error generating image prompt:", error);
        return {
          success: false,
          imagePrompt: `A ${style} image of ${topic}`,
          topic,
          style,
          platform: platform || "instagram",
          error: error instanceof Error ? error.message : "Failed to generate image prompt",
        };
      }
    }),

  /**
   * Generate both caption and image prompt together
   */
  generatePost: publicProcedure
    .input(
      z.object({
        topic: z.string().describe("Topic for the post"),
        style: z.string().describe("Visual style for the image"),
        tone: z.string().describe("Tone of voice"),
        goal: z.string().describe("Goal of the post"),
        platform: z.enum(["instagram", "facebook", "twitter", "linkedin"]),
        productImageUrl: z.string().optional().describe("URL or base64 of product image"),
        aspectRatio: z.string().optional().describe("Image aspect ratio"),
        template: z.string().optional().describe("Caption template (legacy)"),
        variables: z.record(z.string(), z.string()).optional().describe("Variables (legacy)"),
      })
    )
    .mutation(async ({ input }) => {
      const { topic, style, tone, goal, platform, productImageUrl, aspectRatio } = input;

      try {
        // Generate caption
        const captionResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a professional social media copywriter. Generate engaging, platform-optimized captions. Return only the caption text.",
            },
            {
              role: "user",
              content: `Create a ${tone} social media caption for ${platform} about: ${topic}

Goal: ${goal}
Style: ${style}

Make it engaging, include relevant hashtags and emojis. Keep it under 280 characters for Twitter. Return ONLY the caption text.`,
            },
          ],
        });

        // Generate image prompt
        const dimensions: Record<string, string> = {
          instagram: "1080x1080 (square)",
          facebook: "1200x628 (landscape)",
          twitter: "1024x512 (landscape)",
          linkedin: "1200x627 (landscape)",
        };

        // Build the image prompt based on whether product image is provided
        const productContext = productImageUrl
          ? "The image should prominently feature the product from the uploaded image as the main component. Compose the rest of the scene around it."
          : "";
        
        const aspectRatioContext = aspectRatio
          ? `Format: ${aspectRatio}. Optimize composition for this format.`
          : "";

        const imagePromptResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are an expert prompt engineer for AI image generation. Create detailed, optimized prompts for Gemini Imagen API. Return only the prompt text.",
            },
            {
              role: "user",
              content: `Create an optimized prompt for Gemini Imagen API for a ${platform} image (${dimensions[platform]}):

Topic: ${topic}
Visual Style: ${style}
Tone: ${tone}
Goal: ${goal}
${aspectRatioContext}
${productContext}

Make it specific, descriptive, and under 480 tokens. Return ONLY the prompt text.`,
            },
          ],
        });

        const caption = extractLLMContent(captionResponse, `A ${style} post about ${topic}`);
        const imagePrompt = extractLLMContent(imagePromptResponse, `A ${style} image of ${topic}`);

        return {
          success: true,
          caption: caption.trim(),
          imagePrompt: imagePrompt.trim(),
          platform,
          hasProductImage: !!productImageUrl,
          aspectRatio: aspectRatio || "default",
        };
      } catch (error) {
        console.error("Error generating post:", error);
        return {
          success: false,
          caption: "",
          imagePrompt: "",
          platform,
          error: error instanceof Error ? error.message : "Failed to generate post",
        };
      }
    }),

  uploadProductImage: publicProcedure
    .input(
      z.object({
        imageData: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { imageData, fileName } = input;
      try {
        const buffer = Buffer.from(imageData, "base64");
        const ext = fileName.split(".").pop()?.toLowerCase() || "png";
        const mimeTypes: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          webp: "image/webp",
        };
        const mimeType = mimeTypes[ext] || "image/png";
        const result = await storagePut(
          `products/${Date.now()}-${fileName}`,
          buffer,
          mimeType
        );
        return {
          success: true,
          url: result.url,
        };
      } catch (error) {
        console.error("Error uploading product image:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to upload image",
        };
      }
    }),

  /**
   * Generate batch posts with multiple variations
   */
  generateBatchPosts: publicProcedure
    .input(
      z.object({
        topic: z.string(),
        style: z.string(),
        tone: z.string(),
        goal: z.string(),
        platform: platformSchema,
        productImageUrl: z.string().optional(),
        aspectRatio: z.string().optional(),
        quantity: z.number().min(1).max(10),
        useSameModel: z.boolean(),
        modelDescription: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { topic, style, tone, goal, platform, aspectRatio, quantity, useSameModel, modelDescription } = input;

      // Predefined variation contexts for character consistency
      const variationContexts = [
        "vista frontal, contato visual direto",
        "vista tres-quartos da esquerda",
        "vista tres-quartos da direita",
        "close-up, expressao engajada",
        "plano medio, pose natural",
        "corpo inteiro, postura confiante",
        "angulo de baixo para cima, impactante",
        "angulo de cima para baixo, intimo",
        "perfil lateral, olhando ao longe",
        "vista de costas olhando por cima do ombro",
      ];

      try {
        const items = [];

        // Platform dimensions
        const dimensions: Record<string, string> = {
          instagram: "1080x1080 (square)",
          facebook: "1200x628 (landscape)",
          twitter: "1024x512 (landscape)",
          linkedin: "1200x627 (landscape)",
        };

        const aspectRatioContext = aspectRatio
          ? `Format: ${aspectRatio}. Optimize composition for this format.`
          : "";

        for (let i = 0; i < quantity; i++) {
          // Generate caption with variation
          const captionResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are a professional social media copywriter. Generate engaging, platform-optimized captions. Return only the caption text. Each caption should be unique and creative.",
              },
              {
                role: "user",
                content: `Create variation #${i + 1} of a ${tone} social media caption for ${platform} about: ${topic}

Goal: ${goal}
Style: ${style}

This is variation ${i + 1} of ${quantity}. Make it different from previous variations while keeping the same theme.
Make it engaging, include relevant hashtags and emojis. Keep it under 280 characters for Twitter. Return ONLY the caption text.`,
              },
            ],
          });

          // Build character consistency prefix if enabled
          let characterConsistencyPrefix = "";
          if (useSameModel && modelDescription) {
            const variationContext = variationContexts[i % variationContexts.length];
            characterConsistencyPrefix = `CONSISTENCIA DE PERSONAGEM: A imagem deve apresentar esta pessoa especifica:
${modelDescription}

Mantenha: tracos faciais, tom de pele, cor/estilo do cabelo, tipo fisico.
Varie apenas: pose, angulo da camera, expressao, cenario.

VARIACAO #${i + 1}: ${variationContext}

`;
          }

          // Generate image prompt with variation
          const imagePromptResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are an expert prompt engineer for AI image generation. Create detailed, optimized prompts for Gemini Imagen API. Return only the prompt text.",
              },
              {
                role: "user",
                content: `Create variation #${i + 1} of an optimized prompt for Gemini Imagen API for a ${platform} image (${dimensions[platform]}):

Topic: ${topic}
Visual Style: ${style}
Tone: ${tone}
Goal: ${goal}
${aspectRatioContext}

This is variation ${i + 1} of ${quantity}. Create a unique composition/scene while maintaining the same theme.
Make it specific, descriptive, and under 480 tokens. Return ONLY the prompt text.`,
              },
            ],
          });

          const caption = extractLLMContent(captionResponse, `A ${style} post about ${topic}`);
          let imagePrompt = extractLLMContent(imagePromptResponse, `A ${style} image of ${topic}`);

          // Prepend character consistency instructions if enabled
          if (characterConsistencyPrefix) {
            imagePrompt = characterConsistencyPrefix + imagePrompt;
          }

          items.push({
            index: i,
            caption: caption.trim(),
            imagePrompt: imagePrompt.trim(),
          });
        }

        return {
          success: true,
          items,
          platform,
          aspectRatio: aspectRatio || "default",
          useSameModel,
        };
      } catch (error) {
        console.error("Error generating batch posts:", error);
        return {
          success: false,
          items: [],
          platform,
          error: error instanceof Error ? error.message : "Failed to generate batch posts",
        };
      }
    }),

  generateImageFromPrompt: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        aspectRatio: z.string().optional(),
        productImageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { prompt, aspectRatio, productImageUrl } = input;
      try {
        let enhancedPrompt = prompt;
        if (aspectRatio) {
          enhancedPrompt = `${prompt} (Format: ${aspectRatio})`;
        }

        // If product image is provided, fetch it and convert to base64
        let originalImages: GenerateImageOptions["originalImages"] = undefined;
        if (productImageUrl) {
          try {
            // Handle both local URLs and remote URLs
            let imageBuffer: Buffer;
            let mimeType = "image/png";

            if (productImageUrl.startsWith("/uploads/")) {
              // Local file - read from filesystem
              const fs = await import("fs");
              const path = await import("path");
              const filePath = path.join(process.cwd(), "public", productImageUrl);
              imageBuffer = fs.readFileSync(filePath);
              // Detect mime type from extension
              if (productImageUrl.endsWith(".jpg") || productImageUrl.endsWith(".jpeg")) {
                mimeType = "image/jpeg";
              } else if (productImageUrl.endsWith(".webp")) {
                mimeType = "image/webp";
              }
            } else {
              // Remote URL - fetch the image
              const imageResponse = await fetch(productImageUrl);
              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch product image: ${imageResponse.status}`);
              }
              const arrayBuffer = await imageResponse.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              mimeType = imageResponse.headers.get("content-type") || "image/png";
            }

            const b64Json = imageBuffer.toString("base64");
            originalImages = [{ b64Json, mimeType }];

            // Enhance the prompt to emphasize using the product
            enhancedPrompt = `IMPORTANT: The attached image is the PRODUCT that MUST be the main focus of the generated image. Keep the product exactly as it appears - same shape, colors, branding, and details. Create a scene around this exact product.\n\n${enhancedPrompt}`;
          } catch (fetchError) {
            console.error("Error fetching product image:", fetchError);
            // Continue without the product image
          }
        }

        const generateOptions: GenerateImageOptions = {
          prompt: enhancedPrompt,
          originalImages,
        };

        const result = await generateImage(generateOptions);

        if (result.url) {
          return {
            success: true,
            imageUrl: result.url,
          };
        } else {
          return {
            success: false,
            error: "Failed to generate image",
          };
        }
      } catch (error) {
        console.error("Error generating image:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate image",
        };
      }
    }),
});
