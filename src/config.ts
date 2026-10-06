import { z } from "zod";

const envSchema = z.object({
  VITE_APP_MODE: z.enum(["demo", "connected"]).default("demo"),
  VITE_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().optional().or(z.literal("")),
  VITE_COURSE_ID: z.string().optional().or(z.literal(""))
});

const env = envSchema.parse(import.meta.env);
if (env.VITE_APP_MODE === "connected" && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY || !env.VITE_COURSE_ID)) {
  throw new Error("Connected mode requires VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and VITE_COURSE_ID.");
}

export const appConfig = {
  mode: env.VITE_APP_MODE,
  supabaseUrl: env.VITE_SUPABASE_URL || null,
  supabasePublishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY || null,
  courseId: env.VITE_COURSE_ID || "demo-course",
  demoUserId: "demo-learner-001",
  demoAttemptId: "demo-attempt-initial"
} as const;
