const CACHE_NAME = "touch-grass-v1";

const APP_FILES = [
    "/",
    "/index.html",
    "/app.js",
    "/demo-data.js",
    "/style.css",
    "/manifest.json"
];


self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(cache =>
                    cache.addAll(APP_FILES)
                )
        );

        self.skipWaiting();
    }
);


self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches.keys()
                .then(keys =>
                    Promise.all(

                        keys.map(key => {

                            if (
                                key !== CACHE_NAME
                            ) {
                                return caches.delete(key);
                            }

                        })
                    )
                )
        );

        self.clients.claim();
    }
);


self.addEventListener(
    "fetch",
    event => {

        event.respondWith(

            caches.match(event.request)
                .then(cached => {

                    if (cached) {
                        return cached;
                    }

                    return fetch(event.request);

                })
        );
    }
);
