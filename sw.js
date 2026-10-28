// Tapestry's service worker: phone notifications, nothing else - no page is
// kept or served from here. A push (platform/bin/send-push, from
// backend.sql, "phone notifications") is shown as a notification; pressed,
// it opens Tapestry where it points (Notices), in the tab already open if
// there is one.

self.addEventListener("push", (event) => {
  let said = {};
  try { said = event.data ? event.data.json() : {}; } catch { said = { body: event.data?.text() ?? "" }; }
  event.waitUntil(self.registration.showNotification(said.title || "Tapestry", {
    body: said.body || "Something new for you on Tapestry",
    icon: "icon-192.png",
    tag: "tapestry", // one at a time: a newer one takes the older's place
    renotify: true,
    data: { url: said.url || new URL("./#notices", self.registration.scope).href },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || new URL("./#notices", self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((open) => {
    const tab = open.find((client) => client.url.startsWith(self.registration.scope));
    if (!tab) return self.clients.openWindow(url);
    // the open tab goes there itself (phone.js), keeping everything it has
    tab.postMessage({ opens: url });
    return tab.focus();
  }));
});
