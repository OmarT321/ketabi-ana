import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: process.env.E2E_EXTERNAL
    ? undefined
    : [
        {
          command: "npm run dev:qindeel",
          url: "http://localhost:3001",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          // Tests never call a real provider, whatever .env.local holds: Next.js
          // gives .env.local priority over these values, but skips it when NODE_ENV=test.
          env: {
            NODE_ENV: "test",
            AI_ENABLED: "false",
            AI_IMAGES_ENABLED: "false",
            RATE_LIMIT_PER_MINUTE: "1000",
          },
        },
      ],
});
