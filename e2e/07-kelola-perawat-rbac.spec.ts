import { test, expect } from "./fixtures/auth.fixture"

test.describe("CUJ-7: Otorisasi Berbasis Peran (RBAC) & Manajemen Staf Perawat", () => {
  test("Failure State: Perawat biasa dicegat dengan pesan Akses Ditolak jika membuka /kelola-perawat", async ({
    authedPage,
  }) => {
    // authedPage memiliki role 'perawat'
    await authedPage.goto("/kelola-perawat")
    await authedPage.waitForLoadState("domcontentloaded")

    // Dicegat oleh DashboardAccessGuard
    await expect(authedPage.getByRole("heading", { name: "Akses Ditolak" })).toBeVisible({
      timeout: 10000,
    })
    await expect(authedPage.getByText(/Halaman Kelola Staf Perawat hanya dapat diakses/i)).toBeVisible()
    await expect(authedPage.getByRole("link", { name: "Kembali ke Beranda" })).toBeVisible()
  })

  test("Happy Path: Pengelola (Super Admin) dapat mengakses /kelola-perawat dan melihat daftar perawat", async ({
    pengelolaPage,
  }) => {
    // pengelolaPage memiliki role 'pengelola'
    await pengelolaPage.goto("/kelola-perawat")
    await pengelolaPage.waitForLoadState("domcontentloaded")

    // Halaman kelola perawat berhasil dibuka
    await expect(
      pengelolaPage.getByRole("heading", { name: "Kelola Akun Perawat HCU" })
    ).toBeVisible({ timeout: 10000 })

    // Memverifikasi badge Super Admin dan staf perawat tampil
    await expect(pengelolaPage.getByText("Super Admin").first()).toBeVisible()
    await expect(pengelolaPage.getByText("Ns. Siti Rahmawati, S.Kep")).toBeVisible()
  })

  test("Pencarian staf perawat berdasarkan nama atau email", async ({ pengelolaPage }) => {
    await pengelolaPage.goto("/kelola-perawat")
    await expect(pengelolaPage.getByText("Ns. Siti Rahmawati, S.Kep")).toBeVisible({
      timeout: 10000,
    })

    const searchInput = pengelolaPage
      .getByPlaceholder("Cari berdasarkan nama atau email perawat...")
      .or(pengelolaPage.getByPlaceholder(/nama atau email/i))
      .first()
    await searchInput.fill("Budi")

    await expect(pengelolaPage.getByText("Ns. Budi Santoso, S.Kep")).toBeVisible()
    await expect(pengelolaPage.getByText("Ns. Siti Rahmawati, S.Kep")).not.toBeVisible()

    await searchInput.clear()
    await expect(pengelolaPage.getByText("Ns. Siti Rahmawati, S.Kep")).toBeVisible()
  })

  test("Happy Path: Toggle status akses perawat aktif/nonaktif", async ({ pengelolaPage }) => {
    await pengelolaPage.goto("/kelola-perawat")
    await expect(pengelolaPage.getByText("Ns. Siti Rahmawati, S.Kep")).toBeVisible({
      timeout: 10000,
    })

    const perawatRow = pengelolaPage.locator("tr", { hasText: "Ns. Siti Rahmawati, S.Kep" })
    const switchToggle = perawatRow.locator('button[role="switch"]')

    await expect(switchToggle).toBeVisible()
    const isInitiallyChecked = (await switchToggle.getAttribute("aria-checked")) === "true"

    // Klik toggle untuk mengubah status
    await switchToggle.click()

    // Status toggle berbalik
    await expect(switchToggle).toHaveAttribute(
      "aria-checked",
      isInitiallyChecked ? "false" : "true"
    )
  })

  test("Happy Path: Hapus akun perawat dengan verifikasi modal pengaman", async ({ pengelolaPage }) => {
    await pengelolaPage.goto("/kelola-perawat")
    await expect(pengelolaPage.getByText("Ns. Budi Santoso, S.Kep")).toBeVisible({
      timeout: 10000,
    })

    // Klik tombol hapus akun Budi Santoso
    const budiRow = pengelolaPage.locator("tr", { hasText: "Ns. Budi Santoso, S.Kep" })
    await budiRow.locator("button[title='Hapus akun perawat ini']").click()

    // Modal konfirmasi hapus terbuka
    await expect(
      pengelolaPage.getByRole("heading", { name: /Hapus Akun.*Perawat|Konfirmasi Hapus Akun Perawat/i })
    ).toBeVisible()

    // Tombol Batal berfungsi menutup modal
    await pengelolaPage.getByRole("button", { name: "Batal" }).click()
    await expect(
      pengelolaPage.getByRole("heading", { name: /Hapus Akun.*Perawat|Konfirmasi Hapus Akun Perawat/i })
    ).not.toBeVisible()
  })
})
