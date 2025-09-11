// public/sw.js - SERVICE WORKER FOR PUSH NOTIFICATIONS
self.addEventListener('push', function(event) {
  if (!event.data) return

  const data = event.data.json()
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    tag: 'enarva-notification',
    requireInteraction: true,
    actions: data.actions || [],
    data: {
      url: '/',
      timestamp: data.timestamp
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    )
  }
})