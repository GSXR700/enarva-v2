//public/sw.js
self.addEventListener('push', function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/images/light-mobile.PNG', // Logo pour la notification
    badge: '/images/light-mobile.PNG', // Logo pour la barre de statut Android
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});