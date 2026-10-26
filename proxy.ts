import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_KEY, SUPABASE_URL } from './lib/supabase'

// Supabase のセッション Cookie を更新する（Server Component では Cookie を書けないため）
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  await sb.auth.getClaims()
  return response
}

export const config = {
  matcher: ['/((?!mcp|\\.well-known|_next/static|_next/image|favicon.ico).*)'],
}
