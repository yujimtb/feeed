import type { MetadataRoute } from 'next'

// iOS は「ホーム画面に追加」した Web アプリでしか Web Push を受け取れない
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'feeed', short_name: 'feeed', start_url: '/', display: 'standalone' }
}
