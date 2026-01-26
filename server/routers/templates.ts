import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { templates, InsertTemplate } from "../../drizzle/schema";

const platformSchema = z.enum(["instagram", "facebook", "twitter", "linkedin"]);

export const templatesRouter = router({
  /**
   * Create a new template from wizard config
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        description: z.string().optional(),
        platform: platformSchema,
        aspectRatio: z.string().optional(),
        style: z.string().optional(),
        tone: z.string().optional(),
        goal: z.string().optional(),
        defaultBatchQuantity: z.number().min(1).max(10).optional().default(1),
        useSameModel: z.boolean().optional().default(false),
        modelDescription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        const templateData: InsertTemplate = {
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          platform: input.platform,
          aspectRatio: input.aspectRatio ?? null,
          style: input.style ?? null,
          tone: input.tone ?? null,
          goal: input.goal ?? null,
          defaultBatchQuantity: input.defaultBatchQuantity,
          useSameModel: input.useSameModel,
          modelDescription: input.modelDescription ?? null,
        };

        const result = await db.insert(templates).values(templateData);
        const insertId = result[0].insertId;

        return {
          success: true,
          templateId: insertId,
        };
      } catch (error) {
        console.error("Error creating template:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create template",
        };
      }
    }),

  /**
   * List all templates for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { success: false, templates: [] };
    }

    try {
      const items = await db
        .select()
        .from(templates)
        .where(eq(templates.userId, ctx.user.id))
        .orderBy(desc(templates.useCount), desc(templates.createdAt));

      return {
        success: true,
        templates: items,
      };
    } catch (error) {
      console.error("Error listing templates:", error);
      return {
        success: false,
        templates: [],
        error: error instanceof Error ? error.message : "Failed to list templates",
      };
    }
  }),

  /**
   * Get a single template by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, template: null };
      }

      try {
        const result = await db
          .select()
          .from(templates)
          .where(eq(templates.id, input.id))
          .limit(1);

        if (result.length === 0 || result[0].userId !== ctx.user.id) {
          return { success: false, template: null, error: "Template not found" };
        }

        return {
          success: true,
          template: result[0],
        };
      } catch (error) {
        console.error("Error getting template:", error);
        return {
          success: false,
          template: null,
          error: error instanceof Error ? error.message : "Failed to get template",
        };
      }
    }),

  /**
   * Update a template
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().optional(),
        platform: platformSchema.optional(),
        aspectRatio: z.string().optional(),
        style: z.string().optional(),
        tone: z.string().optional(),
        goal: z.string().optional(),
        defaultBatchQuantity: z.number().min(1).max(10).optional(),
        useSameModel: z.boolean().optional(),
        modelDescription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // First verify ownership
        const existing = await db
          .select()
          .from(templates)
          .where(eq(templates.id, input.id))
          .limit(1);

        if (existing.length === 0 || existing[0].userId !== ctx.user.id) {
          return { success: false, error: "Template not found" };
        }

        const { id, ...updateFields } = input;
        const updateData: Partial<InsertTemplate> = {};

        if (updateFields.name !== undefined) updateData.name = updateFields.name;
        if (updateFields.description !== undefined) updateData.description = updateFields.description;
        if (updateFields.platform !== undefined) updateData.platform = updateFields.platform;
        if (updateFields.aspectRatio !== undefined) updateData.aspectRatio = updateFields.aspectRatio;
        if (updateFields.style !== undefined) updateData.style = updateFields.style;
        if (updateFields.tone !== undefined) updateData.tone = updateFields.tone;
        if (updateFields.goal !== undefined) updateData.goal = updateFields.goal;
        if (updateFields.defaultBatchQuantity !== undefined) updateData.defaultBatchQuantity = updateFields.defaultBatchQuantity;
        if (updateFields.useSameModel !== undefined) updateData.useSameModel = updateFields.useSameModel;
        if (updateFields.modelDescription !== undefined) updateData.modelDescription = updateFields.modelDescription;

        if (Object.keys(updateData).length === 0) {
          return { success: false, error: "No fields to update" };
        }

        await db.update(templates).set(updateData).where(eq(templates.id, id));

        return { success: true };
      } catch (error) {
        console.error("Error updating template:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update template",
        };
      }
    }),

  /**
   * Delete a template
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        // First verify ownership
        const existing = await db
          .select()
          .from(templates)
          .where(eq(templates.id, input.id))
          .limit(1);

        if (existing.length === 0 || existing[0].userId !== ctx.user.id) {
          return { success: false, error: "Template not found" };
        }

        await db.delete(templates).where(eq(templates.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("Error deleting template:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete template",
        };
      }
    }),

  /**
   * Increment use count when a template is used
   */
  incrementUseCount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false };
      }

      try {
        // Verify ownership first
        const existing = await db
          .select()
          .from(templates)
          .where(eq(templates.id, input.id))
          .limit(1);

        if (existing.length === 0 || existing[0].userId !== ctx.user.id) {
          return { success: false };
        }

        await db
          .update(templates)
          .set({ useCount: sql`${templates.useCount} + 1` })
          .where(eq(templates.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("Error incrementing use count:", error);
        return { success: false };
      }
    }),
});
