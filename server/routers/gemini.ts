import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM, InvokeResult, TextContent, ImageContent, FileContent } from "../_core/llm";
import { generateImage, GenerateImageOptions, TextOverlayConfig } from "../_core/imageGeneration";
import { fetchImageAsBase64, buildProductReferencePrompt, buildPersonReferencePrompt } from "../_core/promptEngineering";
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
          ? "The attached product image is the HERO of this shot. Recreate the exact product (shape, colors, branding, packaging) with photorealistic accuracy as the central subject. Build the entire scene around it."
          : "";

        const aspectRatioContext = aspectRatio
          ? `Format: ${aspectRatio}. Optimize composition for this format.`
          : "";

        const imagePromptResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are an expert photography director and prompt engineer. Generate a single, detailed photography prompt for AI image generation. The prompt MUST include specific photography terminology: camera model, lens, lighting setup, depth of field, and composition rules for maximum photorealism. Return ONLY the prompt text, nothing else.",
            },
            {
              role: "user",
              content: `Create a photorealistic image prompt for a ${platform} image (${dimensions[platform]}):

Topic: ${topic}
Visual Style: ${style}
Tone: ${tone}
Goal: ${goal}
${aspectRatioContext}
${productContext}

The prompt MUST include:
1. Specific camera and lens reference (e.g., "shot on Canon EOS R5 with 50mm f/1.4")
2. Lighting setup description
3. Depth of field specification (e.g., "shallow DOF at f/2.0, creamy bokeh")
4. Color science and grading direction
5. Composition rule (e.g., "rule of thirds, subject in left third")
6. Negative constraints: "no text, no watermarks, no artifacts, 8K resolution, photorealistic"

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
      })
    )
    .mutation(async ({ input }) => {
      const { topic, style, tone, goal, platform, productImageUrl, aspectRatio, quantity } = input;

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

        const productContext = productImageUrl
          ? "The attached product image is the HERO of this shot. Recreate the exact product (shape, colors, branding, packaging) with photorealistic accuracy as the central subject. Build the entire scene around it."
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

          // Generate image prompt with variation
          const imagePromptResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are an expert photography director and prompt engineer. Generate a single, detailed photography prompt for AI image generation. The prompt MUST include specific photography terminology: camera model, lens, lighting setup, depth of field, and composition rules for maximum photorealism. Return ONLY the prompt text, nothing else.",
              },
              {
                role: "user",
                content: `Create variation #${i + 1} of a photorealistic image prompt for a ${platform} image (${dimensions[platform]}):

Topic: ${topic}
Visual Style: ${style}
Tone: ${tone}
Goal: ${goal}
${aspectRatioContext}
${productContext}

This is variation ${i + 1} of ${quantity}. Create a unique composition/scene while maintaining the same theme.

The prompt MUST include:
1. Specific camera and lens reference (e.g., "shot on Canon EOS R5 with 50mm f/1.4")
2. Lighting setup description
3. Depth of field specification (e.g., "shallow DOF at f/2.0, creamy bokeh")
4. Color science and grading direction
5. Composition rule (e.g., "rule of thirds, subject in left third")
6. Negative constraints: "no text, no watermarks, no artifacts, 8K resolution, photorealistic"

Make it specific, descriptive, and under 480 tokens. Return ONLY the prompt text.`,
              },
            ],
          });

          const caption = extractLLMContent(captionResponse, `A ${style} post about ${topic}`);
          const imagePrompt = extractLLMContent(imagePromptResponse, `A ${style} image of ${topic}`);

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

  /**
   * Generate text overlay suggestion from caption using AI
   */
  generateTextOverlay: publicProcedure
    .input(
      z.object({
        caption: z.string().describe("The generated caption to extract key phrase from"),
        style: z.string().optional().describe("Post style (minimalist, creative, etc.)"),
        tone: z.string().optional().describe("Post tone (funny, inspiring, urgent, etc.)"),
      })
    )
    .mutation(async ({ input }) => {
      const { caption, style, tone } = input;

      const prompt = `You are a professional graphic designer specializing in social media content. Extract the most impactful, memorable phrase from this caption for a text overlay on an image.

Caption: "${caption}"
${style ? `Style: ${style}` : ""}
${tone ? `Tone: ${tone}` : ""}

Requirements:
- Extract 2-6 words maximum
- Choose the most impactful phrase: CTA, emotional hook, or key message
- Must work visually as text overlay on an image
- Prioritize short, punchy phrases that grab attention

Respond in JSON format only:
{
  "text": "THE KEY PHRASE",
  "position": "top" | "center" | "bottom",
  "alignment": "left" | "center" | "right"
}

Choose position based on typical design patterns:
- "top" for announcements, headlines
- "center" for powerful statements, quotes
- "bottom" for CTAs, closings

Return ONLY the JSON, no explanation.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a professional graphic designer. Extract key phrases for text overlays. Return only valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const content = extractLLMContent(response, '{"text": "", "position": "center", "alignment": "center"}');

        // Parse JSON response
        let parsed: { text: string; position: string; alignment: string };
        try {
          // Clean the response - remove markdown code blocks if present
          const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
          parsed = JSON.parse(cleanContent);
        } catch {
          // Fallback: try to extract text from caption
          const words = caption.split(/\s+/).slice(0, 4).join(" ");
          parsed = {
            text: words.toUpperCase(),
            position: "center",
            alignment: "center",
          };
        }

        // Validate position and alignment
        const validPositions = ["top", "center", "bottom"];
        const validAlignments = ["left", "center", "right"];

        // Determine AI text style based on post tone
        type TextStyleType = "bold" | "elegant" | "playful" | "minimal" | "neon" | "threed" | "gradient" | "vintage" | "graffiti";
        const toneToStyle: Record<string, TextStyleType> = {
          funny: "playful",
          inspiring: "elegant",
          urgent: "bold",
          educational: "minimal",
          emotional: "elegant",
        };
        const aiTextStyle = tone ? toneToStyle[tone] || "bold" : "bold";

        return {
          success: true,
          text: parsed.text || "",
          position: validPositions.includes(parsed.position) ? parsed.position as "top" | "center" | "bottom" : "center",
          alignment: validAlignments.includes(parsed.alignment) ? parsed.alignment as "left" | "center" | "right" : "center",
          aiConfig: {
            style: aiTextStyle,
          },
        };
      } catch (error) {
        console.error("Error generating text overlay:", error);
        // Fallback: extract first few words from caption
        const words = caption.split(/\s+/).slice(0, 4).join(" ");
        return {
          success: false,
          text: words.toUpperCase(),
          position: "center" as const,
          alignment: "center" as const,
          aiConfig: {
            style: "bold" as const,
          },
          error: error instanceof Error ? error.message : "Failed to generate text overlay",
        };
      }
    }),

  generateImageFromPrompt: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        aspectRatio: z.string().optional(),
        productImageUrl: z.string().optional(),
        preserveModel: z.boolean().optional().describe("Preserve the person from the reference image"),
        embedText: z.object({
          text: z.string(),
          position: z.enum(["top", "center", "bottom"]).optional(),
          style: z.enum(["bold", "elegant", "playful", "minimal", "neon", "threed", "gradient", "vintage", "graffiti"]).optional(),
        }).optional().describe("Text to embed directly in the generated image using AI"),
      })
    )
    .mutation(async ({ input }) => {
      const { prompt, aspectRatio, productImageUrl, preserveModel, embedText } = input;
      try {
        let enhancedPrompt = prompt;
        if (aspectRatio) {
          enhancedPrompt = `${prompt} (Format: ${aspectRatio})`;
        }

        // If product image is provided, fetch it and convert to base64
        let originalImages: GenerateImageOptions["originalImages"] = undefined;
        if (productImageUrl) {
          try {
            const { b64Json, mimeType } = await fetchImageAsBase64(productImageUrl);
            originalImages = [{ b64Json, mimeType }];

            // Enhance the prompt based on preserveModel flag
            if (preserveModel) {
              enhancedPrompt = `${buildPersonReferencePrompt()}\n\n${enhancedPrompt}`;
            } else {
              enhancedPrompt = `${buildProductReferencePrompt()}\n\n${enhancedPrompt}`;
            }
          } catch (fetchError) {
            console.error("Error fetching product image:", fetchError);
            // Continue without the product image
          }
        }

        // Build text overlay config if embedText is provided
        let textOverlay: TextOverlayConfig | undefined;
        if (embedText) {
          textOverlay = {
            text: embedText.text,
            position: embedText.position,
            style: embedText.style,
          };
        }

        const generateOptions: GenerateImageOptions = {
          prompt: enhancedPrompt,
          originalImages,
          textOverlay,
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
