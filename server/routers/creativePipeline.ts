import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { generateImage, type GenerateImageOptions, type TextOverlayConfig } from "../_core/imageGeneration";
import {
  buildBaseScenePrompt,
  buildCompositionPrompt,
  buildColorGradingPrompt,
  fetchImageAsBase64,
  buildProductReferencePrompt,
  buildPersonReferencePrompt,
} from "../_core/promptEngineering";

const platformSchema = z.enum(["instagram", "facebook", "twitter", "linkedin"]);

function extractText(response: Awaited<ReturnType<typeof invokeLLM>>, fallback: string): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0];
    if (first && "text" in first) return first.text;
  }
  return fallback;
}

export const creativePipelineRouter = router({
  generateCaption: publicProcedure
    .input(
      z.object({
        topic: z.string(),
        style: z.string(),
        tone: z.string(),
        goal: z.string(),
        platform: platformSchema,
      })
    )
    .mutation(async ({ input }) => {
      const { topic, style, tone, goal, platform } = input;

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
              content: `Create a ${tone} social media caption for ${platform} about: ${topic}

Goal: ${goal}
Style: ${style}

Make it engaging, include relevant hashtags and emojis. Keep it under 280 characters for Twitter. Return ONLY the caption text.`,
            },
          ],
        });

        const caption = extractText(response, `A ${style} post about ${topic}`);
        return { success: true as const, caption: caption.trim() };
      } catch (error) {
        console.error("Error generating caption:", error);
        return {
          success: false as const,
          caption: "",
          error: error instanceof Error ? error.message : "Failed to generate caption",
        };
      }
    }),

  generateBaseScene: publicProcedure
    .input(
      z.object({
        topic: z.string(),
        style: z.string(),
        tone: z.string(),
        goal: z.string(),
        platform: platformSchema,
        aspectRatio: z.string().optional(),
        productImageUrl: z.string().optional(),
        preserveModel: z.boolean().optional(),
        promptOverride: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { topic, style, tone, goal, platform, aspectRatio, productImageUrl, preserveModel, promptOverride } = input;

      try {
        // Build photography-quality prompt via LLM (or use override)
        const prompt = promptOverride || await buildBaseScenePrompt({
          topic, style, tone, goal, platform, aspectRatio,
          hasProductImage: !!productImageUrl,
        });

        let enhancedPrompt = aspectRatio ? `${prompt} (Format: ${aspectRatio})` : prompt;

        // Fetch product image as reference if provided
        let originalImages: GenerateImageOptions["originalImages"];
        if (productImageUrl) {
          try {
            const { b64Json, mimeType } = await fetchImageAsBase64(productImageUrl);
            originalImages = [{ b64Json, mimeType }];

            if (preserveModel) {
              enhancedPrompt = `${buildPersonReferencePrompt()}\n\n${enhancedPrompt}`;
            } else {
              enhancedPrompt = `${buildProductReferencePrompt()}\n\n${enhancedPrompt}`;
            }
          } catch (fetchError) {
            console.error("Error fetching product image:", fetchError);
          }
        }

        const result = await generateImage({ prompt: enhancedPrompt, originalImages });

        if (result.url) {
          return { success: true as const, imageUrl: result.url, prompt };
        }
        return { success: false as const, error: "Failed to generate image", prompt };
      } catch (error) {
        console.error("Error generating base scene:", error);
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Failed to generate base scene",
          prompt: "",
        };
      }
    }),

  refineComposition: publicProcedure
    .input(
      z.object({
        previousImageUrl: z.string(),
        background: z.string().optional(),
        framing: z.string().optional(),
        cameraAngle: z.string().optional(),
        depthOfField: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { previousImageUrl, ...adjustments } = input;

      try {
        const { b64Json, mimeType } = await fetchImageAsBase64(previousImageUrl);
        const prompt = buildCompositionPrompt(adjustments);

        const result = await generateImage({
          prompt,
          originalImages: [{ b64Json, mimeType }],
        });

        if (result.url) {
          return { success: true as const, imageUrl: result.url };
        }
        return { success: false as const, error: "Failed to refine composition" };
      } catch (error) {
        console.error("Error refining composition:", error);
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Failed to refine composition",
        };
      }
    }),

  applyColorGrading: publicProcedure
    .input(
      z.object({
        previousImageUrl: z.string(),
        temperature: z.string().optional(),
        contrast: z.string().optional(),
        saturation: z.string().optional(),
        mood: z.string().optional(),
        filmStock: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { previousImageUrl, ...grading } = input;

      try {
        const { b64Json, mimeType } = await fetchImageAsBase64(previousImageUrl);
        const prompt = buildColorGradingPrompt(grading);

        const result = await generateImage({
          prompt,
          originalImages: [{ b64Json, mimeType }],
        });

        if (result.url) {
          return { success: true as const, imageUrl: result.url };
        }
        return { success: false as const, error: "Failed to apply color grading" };
      } catch (error) {
        console.error("Error applying color grading:", error);
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Failed to apply color grading",
        };
      }
    }),

  applyTypography: publicProcedure
    .input(
      z.object({
        previousImageUrl: z.string(),
        text: z.string(),
        position: z.enum(["top", "center", "bottom"]).optional(),
        textStyle: z.enum(["bold", "elegant", "playful", "minimal", "neon", "threed", "gradient", "vintage", "graffiti"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { previousImageUrl, text, position, textStyle } = input;

      try {
        const { b64Json, mimeType } = await fetchImageAsBase64(previousImageUrl);

        const textOverlay: TextOverlayConfig = {
          text,
          position: position || "center",
          style: textStyle || "bold",
        };

        const result = await generateImage({
          prompt: "Add professional typography text to this image while preserving the entire image exactly as is.",
          originalImages: [{ b64Json, mimeType }],
          textOverlay,
        });

        if (result.url) {
          return { success: true as const, imageUrl: result.url };
        }
        return { success: false as const, error: "Failed to apply typography" };
      } catch (error) {
        console.error("Error applying typography:", error);
        return {
          success: false as const,
          error: error instanceof Error ? error.message : "Failed to apply typography",
        };
      }
    }),
});
