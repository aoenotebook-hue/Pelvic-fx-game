import { withCors } from "../_shared/http.ts";
import { belongsToCourse } from "../../../src/domain/access.ts";
import { withSupabase } from "npm:@supabase/server@1.9.1";
import { LEGACY_VERSION, clothingLevelFor, rankRewards } from "../../../src/domain/rewardRules.ts";
import { supportedVersion } from "../../../src/domain/serverRules.ts";
import { MINIGAME_VERSION } from "../../../src/games/spec.ts";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

export default {
  fetch: withCors(withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return fail("Method not allowed", 405);
    let body:{ courseId?: string; contentVersion?: string };try{body=await request.json();}catch{return fail("Invalid JSON");}
    if(!body||typeof body!=="object"||Array.isArray(body))return fail("Invalid request");
    const userId = ctx.userClaims?.id;
    if (!userId || !body.courseId || !body.contentVersion || !supportedVersion(body.contentVersion)) return fail("Invalid request");

    const { data: memberships } = await ctx.supabaseAdmin
      .from("memberships")
      .select("cohort_id, cohorts!inner(course_id)")
      .eq("user_id", userId);
    const membership = (memberships ?? []).find((row) => belongsToCourse(row.cohorts,body.courseId!));
    if (!membership) return fail("No authorized course membership", 403);

    const { data: attempts, error } = await ctx.supabaseAdmin
      .from("attempts")
      .select("user_id,attempt_summaries(reward_total,reward_scheme,completed)")
      .eq("cohort_id", membership.cohort_id)
      .eq("content_version", body.contentVersion)
      .eq("reporting_status", "reporting");
    if (error) return fail("Leaderboard could not be loaded", 500);

    const scheme = body.contentVersion === MINIGAME_VERSION ? "minigames-v4" : body.contentVersion === LEGACY_VERSION ? "legacy-150" : "collections-250";
    const candidates = (attempts ?? []).map((attempt) => {
      const raw = Array.isArray(attempt.attempt_summaries) ? attempt.attempt_summaries[0] : attempt.attempt_summaries;
      return {userId:attempt.user_id as string,reward:Number(raw?.reward_total ?? 0),scheme:raw?.reward_scheme,completed:Boolean(raw?.completed)};
    }).filter((row)=>row.completed && row.scheme === scheme);
    const ranked = rankRewards(candidates);

    return Response.json({
      rows: ranked.map((row, index) => ({
        rank: row.rank,
        label: row.userId === userId ? "You" : `Classmate ${index + 1}`,
        reward: row.reward,
        clothingLevel: clothingLevelFor(row.reward,scheme),
        isCurrentLearner: row.userId === userId
      }))
    });
  }))
};
