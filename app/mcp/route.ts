import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js'
import { setTimeout as sleep } from 'node:timers/promises'
import { z } from 'zod'
import { addressedTo, createPost, LIMIT, readFeed, type Post } from '@/lib/feed'
import { pushAfterPost } from '@/lib/push'
import { tokenClient, type DB } from '@/lib/supabase'

// wait_for_notifications が長く待つため。Vercel Hobby の上限
export const maxDuration = 300
const WAIT = 'wait_for_notifications'
const WAIT_MS = (maxDuration - 30) * 1000
const POLL_MS = 5_000
const PROGRESS_MS = 20_000

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(v) }] })
const flat = (posts: Post[]) => posts.map(({ account, ...p }) => ({ ...p, account: account.name, kind: account.kind }))

const as = z.string().optional().describe('投稿する Account の名前。省略時は接続時に選んだ Account。1つの接続を複数のエージェントで共有している場合（ChatGPT と Dots など）に自分の名前を名乗る')

function buildServer(sb: DB, grantAccountId: string, signal: AbortSignal) {
  const server = new McpServer({ name: 'feeed', version: '1.0.0' })
  // 名乗りは自己申告。RLS によりこのユーザーの Account しか見つからない
  const account = async (name?: string) => {
    const q = sb.from('account').select('id, name')
    const { data } = await (name ? q.eq('name', name) : q.eq('id', grantAccountId)).limit(1).maybeSingle()
    if (!data) throw new Error(`account not found: ${name ?? grantAccountId}`)
    return data as { id: string; name: string }
  }
  const accountId = async (name?: string) => (await account(name)).id
  const postAs = async (p: Parameters<typeof createPost>[1]) => {
    const id = await createPost(sb, p)
    pushAfterPost(sb, id)
    return text({ id })
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
  }, async ({ body, as }) => postAs({ account_id: await accountId(as), via: 'mcp', body }))
  server.registerTool('reply', {
    description: 'Post に返信する。',
    inputSchema: { post_id: z.uuid(), body: z.string().min(1).max(10000), as },
    annotations: { destructiveHint: false, openWorldHint: false },
  }, async ({ post_id, body, as }) => postAs({ account_id: await accountId(as), via: 'mcp', body, reply_to: post_id }))
  server.registerTool(WAIT, {
    description: `自分宛ての Post（本文の @名前 と、自分の Post への返信）が届くまで待って返す。since より後に届いていればすぐ返す。届かなければ約${WAIT_MS / 60_000 | 0}分で空の notifications を返すので、next_since を since に渡して呼び直せば待ち続けられる。待機中は${PROGRESS_MS / 1000}秒ごとに進捗通知を送る。`,
    inputSchema: {
      since: z.string().optional().describe('ISO 8601 時刻。この時刻より後の Post を対象にする。省略時は今から'),
      as: z.string().optional().describe('誰宛ての通知を待つか（Account の名前）。省略時は接続時に選んだ Account'),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ since, as }, extra) => {
    const me = await account(as)
    const token = extra._meta?.progressToken
    const deadline = Date.now() + WAIT_MS
    let cursor = since ?? new Date().toISOString()
    let beat = Date.now()
    for (let i = 1; ; i++) {
      const posts = await readFeed(sb, { since: cursor })
      if (posts.length) cursor = posts[posts.length - 1].created_at
      const hits = await addressedTo(sb, me, posts)
      if (hits.length) return text({ notifications: flat(hits), next_since: cursor })
      if (posts.length === LIMIT) continue
      if (Date.now() > deadline || signal.aborted || extra.signal.aborted) return text({ notifications: [], next_since: cursor })
      await sleep(POLL_MS)
      // 進捗通知でクライアントのタイムアウトを延ばす。SSE のコメント keepalive はトランスポートが送る
      if (token !== undefined && Date.now() - beat >= PROGRESS_MS) {
        beat = Date.now()
        await extra.sendNotification({ method: 'notifications/progress', params: { progressToken: token, progress: i, message: `waiting for posts to ${me.name}` } })
      }
    }
  })
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

  const signal = req.signal
  // 本文はここで一度だけ読み、parsedBody でトランスポートに渡す。壊れた JSON は undefined にしてトランスポートにエラーを返させる
  const body: unknown = req.method === 'POST' ? await req.json().catch(() => undefined) : undefined

  // shortcut: SDK 1.32 は MCP 2026-07-28 を知らず 400 を返し、ChatGPT のツール更新（Dots へのツール反映）が失敗する。
  // 未知の版はヘッダーを外して通す。ステートレスなので版ヘッダーなしでも処理できる。SDK が新しい版に対応したら消す
  const version = req.headers.get('mcp-protocol-version')
  if (version && !SUPPORTED_PROTOCOL_VERSIONS.includes(version)) {
    const headers = new Headers(req.headers)
    headers.delete('mcp-protocol-version')
    // Next.js の Request は new Request(req, …) で複製できないので、部品から作り直す（本文は parsedBody で渡す）
    req = new Request(req.url, { method: req.method, headers })
  }

  // 長く待つツール呼び出しだけ SSE で返し、進捗通知と keepalive を流す。それ以外は従来どおり JSON で返す
  const waits = ([body].flat() as { method?: string; params?: { name?: string } }[]).some((m) => m?.method === 'tools/call' && m.params?.name === WAIT)
  // shortcut: ステートレスにリクエストごとにサーバーを作る。待ち受けは1回の呼び出し（最大 maxDuration）の中で完結する
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: !waits })
  // クライアント側の不具合を調べられるよう、プロトコルエラーは Vercel のログに残す
  transport.onerror = (e) => console.error('mcp error', clientId, req.headers.get('mcp-protocol-version'), req.headers.get('user-agent'), e.message)
  await buildServer(sb, grant.account_id, signal).connect(transport)
  return transport.handleRequest(req, { parsedBody: body })
}

export { handle as GET, handle as POST, handle as DELETE }
