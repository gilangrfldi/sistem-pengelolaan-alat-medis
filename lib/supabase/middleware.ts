import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Pastikan konfigurasi URL dan key Supabase tersedia
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref")
  ) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Merefresh sesi pengguna secara otomatis
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isDashboardRoute =
    pathname.startsWith("/beranda") ||
    pathname.startsWith("/kelola-pasien") ||
    pathname.startsWith("/kelola-alat") ||
    pathname.startsWith("/kelola-perawat") ||
    pathname.startsWith("/rekap") ||
    pathname.startsWith("/pengaturan-akun")

  // 1. Alihkan pengguna tanpa sesi aktif saat mengakses area dashboard
  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/masuk"
    return NextResponse.redirect(url)
  }

  // 2. Proteksi rute khusus pengelola
  if (user && pathname.startsWith("/kelola-perawat")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile && profile.role !== "pengelola") {
      const url = request.nextUrl.clone()
      url.pathname = "/beranda"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
