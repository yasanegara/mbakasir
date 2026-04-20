self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Hanya intercept dummy agar Google Chrome mendeteksi PWA valid
  // Semua request diteruskan secara normal ke server
  return; 
});
