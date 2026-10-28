// Web Push を受けて通知を出し、タップでそのスレッドを開く
self.addEventListener('push', (e) => {
  const { title, body, url } = e.data.json()
  e.waitUntil(self.registration.showNotification(title, { body, data: url, tag: url }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow(e.notification.data))
})
