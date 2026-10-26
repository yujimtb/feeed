import { SUPABASE_URL } from '@/lib/supabase'

// MCP クライアントが認可サーバー（Supabase Auth）を見つけるためのメタデータ (RFC 9728)
export function GET(req: Request) {
  return Response.json({
    resource: new URL('/mcp', req.url).href,
    authorization_servers: [`${SUPABASE_URL}/auth/v1`],
    bearer_methods_supported: ['header'],
  })
}
