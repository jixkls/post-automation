import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  inpaintImage,
  removeBackground,
  insertObject,
  VertexAIError,
} from "../_core/vertexAI";

const editTypeSchema = z.enum(["text", "product", "generic"]);

export const creativeEditorRouter = router({
  /**
   * Replace an element in the image using inpainting
   * Generic endpoint for any type of element replacement
   */
  replaceElement: publicProcedure
    .input(
      z.object({
        image: z.string().describe("Base64 encoded original image"),
        mask: z.string().describe("Base64 encoded mask (white = area to edit)"),
        prompt: z.string().describe("Description of what to generate"),
        negativePrompt: z.string().optional(),
        editType: editTypeSchema.default("generic"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await inpaintImage({
          image: input.image,
          mask: input.mask,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
        });

        return {
          success: true,
          imageBase64: result.imageBase64,
          url: result.url,
        };
      } catch (error) {
        console.error("Error in replaceElement:", error);

        if (error instanceof VertexAIError) {
          return {
            success: false,
            error: error.message,
            errorCode: error.code,
          };
        }

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to replace element",
        };
      }
    }),

  /**
   * Replace text in the image
   * Optimized prompt for text replacement
   */
  replaceText: publicProcedure
    .input(
      z.object({
        image: z.string().describe("Base64 encoded original image"),
        mask: z.string().describe("Base64 encoded mask covering the text area"),
        newText: z.string().describe("The new text to display"),
        style: z
          .enum([
            "bold",
            "elegant",
            "playful",
            "minimal",
            "neon",
            "threed",
            "gradient",
            "vintage",
            "graffiti",
          ])
          .optional()
          .default("bold"),
      })
    )
    .mutation(async ({ input }) => {
      const styleDescriptions: Record<string, string> = {
        bold: "bold, impactful sans-serif typography with clean sharp edges, high contrast",
        elegant:
          "sophisticated elegant serif typography with refined letterforms, luxurious appearance",
        playful:
          "hand-drawn whimsical typography with organic flowing lines, vibrant colors",
        minimal:
          "ultra-clean minimal sans-serif typography, perfectly balanced, subtle presence",
        neon: "glowing neon sign typography with electric vibrant light emission, retro-futuristic",
        threed:
          "3D dimensional typography with realistic shadows and depth, cinematic lighting",
        gradient:
          "modern gradient typography with smooth color transitions, sleek polished finish",
        vintage:
          "retro vintage typography with distressed textures, nostalgic color palette",
        graffiti:
          "urban street art graffiti typography, spray paint texture, bold colors",
      };

      const styleDesc = styleDescriptions[input.style] || styleDescriptions.bold;

      const prompt = `Replace with the text "${input.newText}" using ${styleDesc}. The text must be perfectly readable, correctly spelled, and match the surrounding design aesthetic. High quality professional typography.`;

      const negativePrompt =
        "blurry text, misspelled words, illegible, distorted letters, low quality";

      try {
        const result = await inpaintImage({
          image: input.image,
          mask: input.mask,
          prompt,
          negativePrompt,
          maskDilation: 0.02,
        });

        return {
          success: true,
          imageBase64: result.imageBase64,
          url: result.url,
        };
      } catch (error) {
        console.error("Error in replaceText:", error);

        if (error instanceof VertexAIError) {
          return {
            success: false,
            error: error.message,
            errorCode: error.code,
          };
        }

        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to replace text",
        };
      }
    }),

  /**
   * Replace product in the image
   * Uses the product description to generate a matching replacement
   */
  replaceProduct: publicProcedure
    .input(
      z.object({
        image: z.string().describe("Base64 encoded original image"),
        mask: z
          .string()
          .describe("Base64 encoded mask covering the product area"),
        productDescription: z.string().describe("Description of the new product"),
        preserveBackground: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `Insert a ${input.productDescription}. The product should be professionally photographed, well-lit, and seamlessly integrated into the existing scene. Match the lighting and perspective of the original image.`;

      const negativePrompt =
        "low quality, distorted, unrealistic, mismatched lighting, floating, unnatural placement";

      try {
        const result = await insertObject({
          image: input.image,
          mask: input.mask,
          prompt,
          negativePrompt,
        });

        return {
          success: true,
          imageBase64: result.imageBase64,
          url: result.url,
        };
      } catch (error) {
        console.error("Error in replaceProduct:", error);

        if (error instanceof VertexAIError) {
          return {
            success: false,
            error: error.message,
            errorCode: error.code,
          };
        }

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to replace product",
        };
      }
    }),

  /**
   * Remove background from an image
   */
  removeBackground: publicProcedure
    .input(
      z.object({
        image: z.string().describe("Base64 encoded image"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await removeBackground({
          image: input.image,
        });

        return {
          success: true,
          imageBase64: result.imageBase64,
          url: result.url,
        };
      } catch (error) {
        console.error("Error in removeBackground:", error);

        if (error instanceof VertexAIError) {
          return {
            success: false,
            error: error.message,
            errorCode: error.code,
          };
        }

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to remove background",
        };
      }
    }),
});
