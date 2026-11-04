import { defineConfig, devices } from "@playwright/test"

/**
 * Konfigurasi Playwright E2E untuk Sistem Pengelolaan Alat Medis HCU.
 * Mendukung eksekusi lokal dan lingkungan CI (GitHub Actions).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: process.env.CI ? "retain-on-failure" : "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    // Setup Autentikasi Global (Fixture Session)
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Desktop Chromium / Chrome
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
      },
      dependencies: ["setup"],
    },
  ],

  // Otomatis jalankan server dev lokal jika belum aktif
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
