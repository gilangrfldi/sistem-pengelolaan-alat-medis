import { test, expect } from "./fixtures/auth.fixture"

test.describe("CUJ-9: Pengaturan Akun & Profil Perawat", () => {
  test("Menampilkan data profil dan kredensial perawat aktif", async ({ authedPage }) => {
    await authedPage.goto("/pengaturan-akun")
    await authedPage.waitForLoadState("domcontentloaded")

    // Verifikasi judul halaman
    await expect(authedPage.getByRole("heading", { name: "Pengaturan Akun", exact: true })).toBeVisible()

    // Verifikasi nama dan email perawat di kartu profil
    await expect(authedPage.getByText(/Staf Perawat HCU|Pengelola HCU/i).first()).toBeVisible()
    await expect(authedPage.getByText(/Status: Aktif/i).first()).toBeVisible()

    // Verifikasi input form profil terisi
    const nameInput = authedPage.getByPlaceholder("Contoh: Ns. Budi Santoso, S.Kep")
    await expect(nameInput).toBeVisible()
    await expect(nameInput).not.toBeEmpty()

    const emailInput = authedPage.getByPlaceholder("email@rsud-welasasih.go.id")
    await expect(emailInput).toBeVisible()
    await expect(emailInput).not.toBeEmpty()
  })

  test("Happy Path: Mengubah Nama Lengkap Perawat", async ({ authedPage }) => {
    await authedPage.goto("/pengaturan-akun")
    await authedPage.waitForLoadState("domcontentloaded")

    const nameInput = authedPage.getByPlaceholder("Contoh: Ns. Budi Santoso, S.Kep")
    await nameInput.fill("Ns. Siti Rahmawati, S.Kep (Updated)")

    // Klik tombol simpan perubahan profil
    const saveProfileBtn = authedPage.getByRole("button", { name: "Simpan Perubahan Profil" })
    await saveProfileBtn.click()

    // Verifikasi notifikasi berhasil
    await expect(authedPage.getByText(/Profil dan kontak medis Anda berhasil diperbarui/i)).toBeVisible()
  })

  test("Validasi & Interaksi Form Ganti Kata Sandi (Toggle Show/Hide & Mismatch)", async ({ authedPage }) => {
    await authedPage.goto("/pengaturan-akun")
    await authedPage.waitForLoadState("domcontentloaded")

    const newPwdInput = authedPage.getByPlaceholder("Minimal 6 karakter")
    const confirmPwdInput = authedPage.getByPlaceholder("Ulangi kata sandi baru")

    // Input kata sandi
    await newPwdInput.fill("Password123!")
    await confirmPwdInput.fill("BedaPassword!")

    // Toggle lihat kata sandi
    const toggleBtns = authedPage.locator("button:has(svg.lucide-eye), button:has(svg.lucide-eye-off)")
    if (await toggleBtns.first().isVisible()) {
      await toggleBtns.first().click()
      await expect(newPwdInput).toHaveAttribute("type", "text")
      await toggleBtns.first().click()
      await expect(newPwdInput).toHaveAttribute("type", "password")
    }

    // Klik tombol perbarui kata sandi dengan konfirmasi tidak cocok
    await authedPage.getByRole("button", { name: "Perbarui Kata Sandi" }).click()
    await expect(authedPage.getByText(/Konfirmasi kata sandi tidak cocok/i)).toBeVisible()

    // Samakan konfirmasi kata sandi
    await confirmPwdInput.fill("Password123!")
    await authedPage.getByRole("button", { name: "Perbarui Kata Sandi" }).click()

    // Verifikasi pesan berhasil
    await expect(authedPage.getByText(/Kata sandi akun Anda berhasil diperbarui/i)).toBeVisible()
  })

  test("Interaksi Kirim Link Reset Password", async ({ authedPage }) => {
    await authedPage.goto("/pengaturan-akun")
    await authedPage.waitForLoadState("domcontentloaded")

    // Klik tombol Kirim Link Reset Password
    const sendResetBtn = authedPage.getByRole("button", { name: "Kirim Link Reset Password" })
    await sendResetBtn.click()

    // Verifikasi notifikasi terkirim
    await expect(authedPage.getByText(/Tautan reset kata sandi telah dikirim/i)).toBeVisible()
  })

  test("Interaksi Modal Hapus Akun Saya Sendiri & Tombol Batal", async ({ authedPage }) => {
    await authedPage.goto("/pengaturan-akun")
    await authedPage.waitForLoadState("domcontentloaded")

    // Klik tombol buka modal hapus akun
    const deleteTriggerBtn = authedPage.getByRole("button", { name: "Hapus Akun Medis Saya" })
    await deleteTriggerBtn.click()

    // Verifikasi modal terbuka
    await expect(authedPage.getByRole("heading", { name: "Konfirmasi Penghapusan Akun" })).toBeVisible()
    await expect(authedPage.getByText(/Tindakan ini bersifat permanen/i)).toBeVisible()

    // Tombol eksekusi hapus harus disabled selama countdown berlangsung
    const executeDeleteBtn = authedPage.locator("button:has-text('Hapus Akun')").last()
    await expect(executeDeleteBtn).toBeDisabled()

    // Klik tombol Batal
    await authedPage.getByRole("button", { name: "Batal", exact: true }).click()

    // Modal tertutup
    await expect(authedPage.getByRole("heading", { name: "Konfirmasi Penghapusan Akun" })).not.toBeVisible()
  })
})

