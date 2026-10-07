/** A production build must never silently fall back to the fictional demo. */
export function releaseConfigurationErrors(env: Record<string, string | undefined>): string[] {
  const errors: string[] = [];
  if (env.VITE_APP_MODE !== "connected") errors.push("VITE_APP_MODE must be connected");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(env.VITE_SUPABASE_URL ?? "")) errors.push("VITE_SUPABASE_URL must identify the intended Supabase project");
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!key) errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is required");
  else if (key.startsWith("sb_secret_") || key.includes("service_role")) errors.push("Only a public publishable key may be used in browser code");
  else if (key.startsWith("eyJ")) {
    try {
      const claim = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (claim.role !== "anon") errors.push("A legacy browser JWT key must have the anon role");
    } catch { errors.push("Invalid legacy public key"); }
  } else if (!key.startsWith("sb_publishable_")) errors.push("Expected a public Supabase publishable key");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.VITE_COURSE_ID ?? "")) errors.push("VITE_COURSE_ID must be the configured course UUID");
  return errors;
}
