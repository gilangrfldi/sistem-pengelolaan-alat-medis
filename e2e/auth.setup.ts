import { test as setup } from "@playwright/test"

/**
 * Setup Global E2E Playwright.
 * Memastikan web server aktif sebelum rangkaian tes dijalankan.
 */
setup("global health check and initialization", async ({ page }) => {
  await page.goto("/masuk")
  await page.waitForLoadState("domcontentloaded")
})

