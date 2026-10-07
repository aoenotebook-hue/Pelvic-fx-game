import { describe, expect, it } from "vitest";
import { releaseConfigurationErrors } from "./releaseConfig";
const ready = { VITE_APP_MODE: "connected", VITE_SUPABASE_URL: "https://wdedeqaqjyyudhjivnva.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example", VITE_COURSE_ID: "11111111-1111-4111-8111-111111111111" };
describe("production configuration guard", () => {
  it("accepts the public connected configuration", () => expect(releaseConfigurationErrors(ready)).toEqual([]));
  it("rejects accidental demo and missing course configuration", () => expect(releaseConfigurationErrors({}).length).toBe(4));
  it("never accepts a privileged browser key", () => {
    expect(releaseConfigurationErrors({ ...ready, VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_example" })).not.toEqual([]);
    const jwt = `eyJ.${btoa(JSON.stringify({ role: "service_role" }))}.signature`;
    expect(releaseConfigurationErrors({ ...ready, VITE_SUPABASE_PUBLISHABLE_KEY: jwt })).not.toEqual([]);
  });
});
