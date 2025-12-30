const CACHE_NAME = 'cifras-icnv-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './assets/icon.svg',
    './src/main.js',
    './src/config.js',
    './src/ui/AppUI.js',
    './src/services/AuthService.js',
    './src/services/DriveService.js',
    './src/services/LocalFileService.js',
    './src/services/StorageService.js',
    './src/utils/Transposer.js'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    // Ignorar requisições do Google API e Google Drive (lidamos online)
    // a menos que queiramos cachear imagens do drive (complexo com Auth)
    const url = new URL(event.request.url);

    // Não cachear chamadas de API ou scripts externos dinâmicos por padrão sem estratégia específica
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('cdn.tailwindcss.com')) {
        // Para CDNs, podemos tentar StaleWhileRevalidate ou NetworkFirst
        // Mas para simplificar, vamos deixar o browser lidar com cache HTTP normal para CDNs
        return;
    }

    // Cache First for App Shell
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
