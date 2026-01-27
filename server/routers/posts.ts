import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { posts, InsertPost } from "../../drizzle/schema";

const platformSchema = z.enum(["instagram", "facebook", "twitter", "linkedin"]);
const statusSchema = z.enum(["draft", "ready", "published", "failed"]);

// Default user ID for non-authenticated usage
const DEFAULT_USER_ID = 1;

export const postsRouter = router({
  /**
   * Save a single post after generation
   */
  savePost: publicProcedure
    .input(
      z.object({
        topic: z.string(),
        platform: platformSchema,
        aspectRatio: z.string().optional(),
        style: z.string().optional(),
        tone: z.string().optional(),
        goal: z.string().optional(),
        caption: z.string(),
        imagePrompt: z.string().optional(),
        imageUrl: z.string().optional(),
        productImageUrl: z.string().optional(),
        status: statusSchema.optional().default("draft"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        const userId = ctx.user?.id ?? DEFAULT_USER_ID;
        const postData: InsertPost = {
          userId,
          topic: input.topic,
          platform: input.platform,
          aspectRatio: input.aspectRatio ?? null,
          style: input.style ?? null,
          tone: input.tone ?? null,
          goal: input.goal ?? null,
          caption: input.caption,
          imagePrompt: input.imagePrompt ?? null,
          imageUrl: input.imageUrl ?? null,
          productImageUrl: input.productImageUrl ?? null,
          status: input.status,
        };

        const result = await db.insert(posts).values(postData);
        const insertId = result[0].insertId;

        return {
          success: true,
          postId: insertId,
        };
      } catch (error) {
        console.error("Error saving post:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to save post",
        };
      }
    }),

  /**
   * Save all posts from batch generation
   */
  saveBatch: publicProcedure
    .input(
      z.object({
        topic: z.string(),
        platform: platformSchema,
        aspectRatio: z.string().optional(),
        style: z.string().optional(),
        tone: z.string().optional(),
        goal: z.string().optional(),
        productImageUrl: z.string().optional(),
        items: z.array(
          z.object({
            caption: z.string(),
            imagePrompt: z.string().optional(),
            imageUrl: z.string().optional(),
            batchIndex: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        const userId = ctx.user?.id ?? DEFAULT_USER_ID;
        const batchId = crypto.randomUUID();
        const postIds: number[] = [];

        for (const item of input.items) {
          const postData: InsertPost = {
            userId,
            topic: input.topic,
            platform: input.platform,
            aspectRatio: input.aspectRatio ?? null,
            style: input.style ?? null,
            tone: input.tone ?? null,
            goal: input.goal ?? null,
            caption: item.caption,
            imagePrompt: item.imagePrompt ?? null,
            imageUrl: item.imageUrl ?? null,
            productImageUrl: input.productImageUrl ?? null,
            batchId,
            batchIndex: item.batchIndex,
            status: item.imageUrl ? "ready" : "draft",
          };

          const result = await db.insert(posts).values(postData);
          postIds.push(result[0].insertId);
        }

        return {
          success: true,
          batchId,
          postIds,
        };
      } catch (error) {
        console.error("Error saving batch:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to save batch",
        };
      }
    }),

  /**
   * Get paginated list of posts with optional filters
   */
  listPosts: publicProcedure
    .input(
      z.object({
        platform: platformSchema.optional(),
        status: statusSchema.optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, posts: [], total: 0 };
      }

      try {
        const userId = ctx.user?.id ?? DEFAULT_USER_ID;
        const conditions = [eq(posts.userId, userId)];

        if (input.platform) {
          conditions.push(eq(posts.platform, input.platform));
        }
        if (input.status) {
          conditions.push(eq(posts.status, input.status));
        }

        const offset = (input.page - 1) * input.limit;

        const [items, countResult] = await Promise.all([
          db
            .select()
            .from(posts)
            .where(and(...conditions))
            .orderBy(desc(posts.createdAt))
            .limit(input.limit)
            .offset(offset),
          db
            .select({ count: sql<number>`count(*)` })
            .from(posts)
            .where(and(...conditions)),
        ]);

        return {
          success: true,
          posts: items,
          total: countResult[0]?.count ?? 0,
          page: input.page,
          limit: input.limit,
        };
      } catch (error) {
        console.error("Error listing posts:", error);
        return {
          success: false,
          posts: [],
          total: 0,
          error: error instanceof Error ? error.message : "Failed to list posts",
        };
      }
    }),

  /**
   * Get a single post by ID
   */
  getPost: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, post: null };
      }

      try {
        const userId = ctx.user?.id ?? DEFAULT_USER_ID;
        const result = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, input.id), eq(posts.userId, userId)))
          .limit(1);

        if (result.length === 0) {
          return { success: false, post: null, error: "Post not found" };
        }

        return {
          success: true,
          post: result[0],
        };
      } catch (error) {
        console.error("Error getting post:", error);
        return {
          success: false,
          post: null,
          error: error instanceof Error ? error.message : "Failed to get post",
        };
      }
    }),

  /**
   * Update a post (caption or status)
   */
  updatePost: publicProcedure
    .input(
      z.object({
        id: z.number(),
        caption: z.string().optional(),
        status: statusSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        const userId = ctx.user?.id ?? DEFAULT_USER_ID;
        const updateData: Partial<InsertPost> = {};
        if (input.caption !== undefined) {
          updateData.caption = input.caption;
        }
        if (input.status !== undefined) {
          updateData.status = input.status;
        }

        if (Object.keys(updateData).length === 0) {
          return { success: false, error: "No fields to update" };
        }

        await db
          .update(posts)
          .set(updateData)
          .where(and(eq(posts.id, input.id), eq(posts.userId, userId)));

        return { success: true };
      } catch (error) {
        console.error("Error updating post:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update post",
        };
      }
    }),

  /**
   * Delete a post
   */
  deletePost: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: false, error: "Database not available" };
      }

      try {
        const userId = ctx.user?.id ?? DEFAULT_USER_ID;
        await db
          .delete(posts)
          .where(and(eq(posts.id, input.id), eq(posts.userId, userId)));

        return { success: true };
      } catch (error) {
        console.error("Error deleting post:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete post",
        };
      }
    }),
});
