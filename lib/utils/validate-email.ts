// Validasi Sintaks & Deteksi Typo Domain Email (misal @gmil.com, @gmail.co, dll.)

const TYPO_DOMAINS: Record<string, string> = {
  "gmil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.cpm": "gmail.com",
  "gmeil.com": "gmail.com",
  "gmaik.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yaho.co.id": "yahoo.co.id",
  "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outluk.com": "outlook.com",
}

export interface EmailValidationResult {
  isValid: boolean
  error?: string
}

export function validateStrictEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase()

  if (!trimmed) {
    return { isValid: false, error: "Email wajib diisi." }
  }

  // Cek format email standar
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "Format email tidak valid." }
  }

  const parts = trimmed.split("@")
  if (parts.length !== 2) {
    return { isValid: false, error: "Format email tidak valid." }
  }

  const [username, domain] = parts

  if (username.length < 3) {
    return { isValid: false, error: "Nama email terlalu pendek (minimal 3 karakter)." }
  }

  // Cek typo domain terkenal
  if (TYPO_DOMAINS[domain]) {
    const suggested = TYPO_DOMAINS[domain]
    return {
      isValid: false,
      error: `Domain email tidak valid (@${domain}). Apakah maksud Anda @${suggested}?`,
    }
  }

  // Cek ekstensi domain (TLD)
  const domainParts = domain.split(".")
  const tld = domainParts[domainParts.length - 1]
  if (!tld || tld.length < 2) {
    return { isValid: false, error: "Domain email harus memiliki ekstensi yang valid (misal .com, .id, .edu)." }
  }

  return { isValid: true }
}

