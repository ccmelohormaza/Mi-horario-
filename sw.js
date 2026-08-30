"use strict";

/**
 * ============================================================
 * SERVICE WORKER
 * ============================================================
 */

const CACHE_NAME =
    "mis-horarios-v1";


const FILES_TO_CACHE = [

    "./",

    "./index.html",

    "./styles.css",

    "./app.js",

    "./supabase.js",

    "./manifest.json"

];


/*
 * Instalación del Service Worker.
 */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(
                    cache =>
                        cache.addAll(
                            FILES_TO_CACHE
                        )
                )
        );

        self.skipWaiting();
    }
);


/*
 * Activación.
 */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(
                    keys =>

                        Promise.all(

                            keys
                                .filter(
                                    key =>
                                        key !==
                                        CACHE_NAME
                                )

                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )
                        )
                )
        );

        self.clients.claim();
    }
);


/*
 * Interceptar solicitudes.
 */

self.addEventListener(
    "fetch",
    event => {

        event.respondWith(

            fetch(event.request)
                .catch(
                    () =>
                        caches.match(
                            event.request
                        )
                )
        );
    }
);