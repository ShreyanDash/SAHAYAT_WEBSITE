import { afterEach, describe, expect, it, vi } from "vitest";
import { publicPlatformConfig, publicPlatformScript } from "./_core/publicConfig";
import { COOKIE_NAME } from "../shared/const";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("independent application platform checks", () => {
  it("publicPlatformConfig returns an empty object (no Manus config exposed)", () => {
    const config = publicPlatformConfig({});
    expect(config).toEqual({});
  });

  it("publicPlatformScript returns a no-op comment (no Manus runtime injected)", () => {
    const script = publicPlatformScript({});
    expect(script).not.toContain("__MANUS_CONFIG__");
    expect(script).not.toContain("MANUS_PROJECT_ID");
    expect(script).not.toContain("MANUS_API_KEY");
    expect(script).not.toContain("DATABASE_URL");
  });

  it("publicPlatformScript does not expose any secret environment values", () => {
    const env = {
      MANUS_PROJECT_ID: "project-test",
      MANUS_API_KEY: "server-only-test",
      MANUS_JWT_SECRET: "signing-only-test",
      DATABASE_URL: "db-only-test",
      GMAIL_APP_PASSWORD: "password-only-test",
    };
    const script = publicPlatformScript(env);
    for (const value of Object.values(env)) {
      expect(script).not.toContain(value);
    }
  });

  it("COOKIE_NAME is a stable, non-conflicting identifier", () => {
    expect(typeof COOKIE_NAME).toBe("string");
    expect(COOKIE_NAME.length).toBeGreaterThan(0);
    expect(COOKIE_NAME).not.toBe("app_session_id");
    expect(COOKIE_NAME).not.toBe("webdev_app_session");
  });
});
