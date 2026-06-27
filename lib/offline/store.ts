// OutboxStore implementations: in-memory (tests/SSR-safe) and IndexedDB (browser).

import type { OutboxItem, OutboxStore } from './types'

/** In-memory store — used by unit tests and as an SSR-safe no-network fallback. */
export function createMemoryStore(initial: OutboxItem[] = []): OutboxStore {
    const map = new Map<string, OutboxItem>(initial.map((i) => [i.id, i]))
    return {
        async getAll() {
            return [...map.values()]
        },
        async put(item) {
            map.set(item.id, item)
        },
        async delete(id) {
            map.delete(id)
        },
    }
}

const DB_NAME = 'kurimasense-outbox'
const STORE_NAME = 'items'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

function tx<T>(
    db: IDBDatabase,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_NAME, mode)
        const req = fn(t.objectStore(STORE_NAME))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

/** IndexedDB-backed store. Only call in the browser (guards against SSR). */
export function createIdbStore(): OutboxStore {
    const available = typeof indexedDB !== 'undefined'
    if (!available) return createMemoryStore()

    return {
        async getAll() {
            const db = await openDb()
            try {
                return (await tx<OutboxItem[]>(db, 'readonly', (s) => s.getAll())) ?? []
            } finally {
                db.close()
            }
        },
        async put(item) {
            const db = await openDb()
            try {
                await tx(db, 'readwrite', (s) => s.put(item))
            } finally {
                db.close()
            }
        },
        async delete(id) {
            const db = await openDb()
            try {
                await tx(db, 'readwrite', (s) => s.delete(id))
            } finally {
                db.close()
            }
        },
    }
}
