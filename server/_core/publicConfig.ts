// Public runtime configuration injected into the browser.
// No secrets — this script is served without authentication.
export function publicPlatformConfig(_env: NodeJS.ProcessEnv = process.env) {
  // All Manus-specific values removed. Return an empty config object so any
  // legacy references to window.__APP_CONFIG__ degrade gracefully.
  return {};
}

export function publicPlatformScript(_env: NodeJS.ProcessEnv = process.env): string {
  // No-op script — the application no longer relies on a runtime platform config.
  return "/* app config */";
}
