// Kombinierter Service Worker für Extension (Chrome/Brave) und PWA

if (globalThis.chrome) {
    // ===== Web Extension =====

    // Leitet jeden neuen Tab (brave://newtab) auf die Bonjourr-Startseite um.
    // Wichtig: index.html muss in web_accessible_resources deklariert sein.
    const STORE_ID = 'amflfpakcennfhbnaepmbnfhmjlbcnfk'
    const PAGE_PATH = '/index.html'

    let targetUrl = `chrome-extension://${STORE_ID}${PAGE_PATH}`

    async function resolveBonjourr() {
        try {
            const extensions = await chrome.management.getAll()
            const candidates = extensions.filter(
                (ext) =>
                    ext.enabled &&
                    ext.type === 'extension' &&
                    ext.name.toLowerCase().includes('bonjourr'),
            )
            const bonjourr = candidates.find((ext) => ext.id === STORE_ID) ?? candidates[0]
            if (bonjourr) {
                targetUrl = `chrome-extension://${bonjourr.id}${PAGE_PATH}`
            }
        } catch {
            // Fallback: Store-ID bleibt gesetzt
        }
    }

    resolveBonjourr()

    // Falls Bonjourr später aktiviert/neu geladen wird, Ziel-URL aktualisieren.
    chrome.management.onEnabled.addListener(resolveBonjourr)
    chrome.management.onInstalled.addListener(resolveBonjourr)

    // Erkennt einen frisch geöffneten New-Tab (Brave-eigene Seite).
    const isNewTab = (url) =>
        !!url && (url.startsWith('brave://newtab') || url.startsWith('chrome://newtab'))

    // Fall 1: Der Tab existiert noch nicht, die URL ist aber schon bekannt.
    chrome.tabs.onCreated.addListener((tab) => {
        if (isNewTab(tab.pendingUrl)) {
            chrome.tabs.update(tab.id, { url: targetUrl })
        }
    })

    // Fall 2: Der Tab wurde bereits auf brave://newtab committet.
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (isNewTab(tab.url) || isNewTab(tab.pendingUrl)) {
            chrome.tabs.update(tabId, { url: targetUrl })
        }
    })

    // Bestehende Extension-Logik aus service-worker.js
    chrome.action.onClicked.addListener(createNewTab)
    chrome.runtime.onInstalled.addListener(handleInstalled)
    chrome.runtime.setUninstallURL('https://bonjourr.fr/goodbye')
} else {
    // ===== Progressive Web App =====
    self.addEventListener('activate', updateCache)
    self.addEventListener('fetch', retrieveCache)
}

const CACHE_KEY = '22.3.0'
const API_URLS = ['unsplash.com', 'jsdelivr.net', 'api.bonjourr']

// Web Extension

function createNewTab() {
    const url = chrome.runtime.getURL('index.html')
    chrome.tabs.create({ url })
}

function handleInstalled(details) {
    if (details.reason === 'install') {
        createNewTab()
    }
}

// Progressive Web App

async function updateCache() {
    const keys = await caches.keys()

    for (const key of keys) {
        if (CACHE_KEY !== key) {
            await caches.delete(key)
        }
    }
}

function retrieveCache(event) {
    const url = event.request.url
    const isApi = API_URLS.some((api) => url.includes(api))

    event.respondWith(
        (async () => {
            if (isApi) {
                return fetch(event.request)
            }

            const cachedResponse = await caches.match(event.request)

            if (cachedResponse) {
                return cachedResponse
            }

            const cache = await caches.open(CACHE_KEY)
            cache.add(event.request.url)

            return fetch(event.request)
        })(),
    )
}