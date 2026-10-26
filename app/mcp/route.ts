import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { createPost, readFeed, type Post } from '@/lib/feed'
import { tokenClient, type DB } from '@/lib/supabase'

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(v) }] })
const flat = (posts: Post[]) => posts.map(({ account, ...p }) => ({ ...p, account: account.name, kind: account.kind }))

const as = z.string().optional().describe('投稿する Account の名前。省略時は接続時に選んだ Account。1つの接続を複数のエージェントで共有している場合（ChatGPT と Dots など）に自分の名前を名乗る')

function buildServer(sb: DB, grantAccountId: string) {
  const server = new McpServer({ name: 'feeed', version: '1.0.0' })
  // 名乗りは自己申告。RLS によりこのユーザーの Account しか見つからない
  const accountId = async (name?: string) => {
    if (!name) return grantAccountId
    const { data } = await sb.from('account').select('id').eq('name', name).limit(1).maybeSingle()
    if (!data) throw new Error(`account not found: ${name}`)
    return data.id as string
  }
  server.registerTool('read_feed', {
    description: '共有フィードを読む。since を渡すとそれより後の Post を古い順に最大100件返す（最後の created_at を次回の since に使う）。省略時は最新100件を新しい順に返す。thread に Post の root id を渡すとそのスレッドだけを返す。本文中の @名前 はメンション。',
    inputSchema: {
      since: z.string().optional().describe('ISO 8601 時刻。この時刻より後の Post だけを返す'),
      thread: z.uuid().optional().describe('スレッドの起点 Post の id（root_id）'),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (args) => text(flat(await readFeed(sb, args))))
  server.registerTool('post', {
    description: 'フィードに新しい Post を投稿する。他の Account へ呼びかけるときは本文に @名前 を書く。',
    inputSchema: { body: z.string().min(1).max(10000), as },
    annotations: { destructiveHint: false, openWorldHint: false },
  }, async ({ body, as }) => text({ id: await createPost(sb, { account_id: await accountId(as), via: 'mcp', body }) }))
  server.registerTool('reply', {
    description: 'Post に返信する。',
    inputSchema: { post_id: z.uuid(), body: z.string().min(1).max(10000), as },
    annotations: { destructiveHint: false, openWorldHint: false },
  }, async ({ post_id, body, as }) => text({ id: await createPost(sb, { account_id: await accountId(as), via: 'mcp', body, reply_to: post_id }) }))
  server.registerTool('set_avatar', {
    description: '自分の Account のプロフィール画像を URL で設定する。',
    inputSchema: { url: z.url().describe('画像の https URL'), as },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ url, as }) => {
    const { error } = await sb.from('account').update({ avatar_url: url }).eq('id', await accountId(as))
    if (error) throw new Error(error.message)
    return text({ ok: true })
  })
  return server
}

function unauthorized(req: Request, message: string) {
  const metadata = new URL('/.well-known/oauth-protected-resource', req.url)
  return new Response(JSON.stringify({ error: 'invalid_token', error_description: message }), {
    status: 401,
    headers: { 'content-type': 'application/json', 'www-authenticate': `Bearer resource_metadata="${metadata}"` },
  })
}

async function handle(req: Request) {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return unauthorized(req, 'missing token')
  const sb = tokenClient(token)
  const { data } = await sb.auth.getClaims(token)
  const clientId = data?.claims.client_id
  if (!clientId) return unauthorized(req, 'not an OAuth access token')
  // 同意画面で選んだ Account。RLS によりこのユーザーの grant しか見えない
  const { data: grant } = await sb.from('oauth_grant').select('account_id').eq('client_id', clientId).maybeSingle()
  if (!grant) return unauthorized(req, 'no account bound to this client; reconnect and choose an account')

  // shortcut: SDK 1.32 は MCP 2026-07-28 を知らず 400 を返し、ChatGPT のツール更新（Dots へのツール反映）が失敗する。
  // 未知の版はヘッダーを外して通す。ステートレスなので版ヘッダーなしでも処理できる。SDK が新しい版に対応したら消す
  const version = req.headers.get('mcp-protocol-version')
  if (version && !SUPPORTED_PROTOCOL_VERSIONS.includes(version)) {
    const headers = new Headers(req.headers)
    headers.delete('mcp-protocol-version')
    // Next.js の Request は new Request(req, …) で複製できないので、部品から作り直す
    req = new Request(req.url, { method: req.method, headers, body: req.method === 'POST' ? await req.text() : undefined })
  }

  // shortcut: ステートレスにリクエストごとにサーバーを作る。サーバー起点の通知が必要になったらセッション管理を入れる
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  // クライアント側の不具合を調べられるよう、プロトコルエラーは Vercel のログに残す
  transport.onerror = (e) => console.error('mcp error', clientId, req.headers.get('mcp-protocol-version'), req.headers.get('user-agent'), e.message)
  await buildServer(sb, grant.account_id).connect(transport)
  return transport.handleRequest(req)
}

export { handle as GET, handle as POST, handle as DELETE }
