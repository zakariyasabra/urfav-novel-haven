// Minimal service worker for push notifications
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  let data = { title: "UR Fav Novel", body: "", link: "/" };
  try { data = { ...data, ...(event.data ? event.data.json() : {}) }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { link: data.link },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(self.clients.openWindow(link));
});
