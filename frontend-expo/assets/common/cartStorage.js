import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";

const CART_KEY = "cartItems";
const DB_NAME = "revolution_cart.db";

let dbPromise = null;

const normalizeCartItems = (items) => {
    if (!Array.isArray(items)) {
        return [];
    }

    return items.filter((item) => item && typeof item === "object");
};

async function getDb() {
    if (Platform.OS === "web") {
        return null;
    }

    if (!dbPromise) {
        if (typeof SQLite.openDatabaseAsync === "function") {
            dbPromise = SQLite.openDatabaseAsync(DB_NAME);
        } else {
            dbPromise = Promise.resolve(SQLite.openDatabase(DB_NAME));
        }
    }

    return dbPromise;
}

async function ensureTable() {
    const db = await getDb();
    if (!db) {
        return null;
    }

    if (typeof db.execAsync === "function") {
        await db.execAsync(
            "CREATE TABLE IF NOT EXISTS cart_items (id INTEGER PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updatedAt INTEGER NOT NULL);"
        );
        return db;
    }

    await new Promise((resolve, reject) => {
        db.transaction(
            (tx) => {
                tx.executeSql(
                    "CREATE TABLE IF NOT EXISTS cart_items (id INTEGER PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updatedAt INTEGER NOT NULL);"
                );
            },
            reject,
            resolve
        );
    });

    return db;
}

async function loadFromSQLite() {
    try {
        const db = await ensureTable();
        if (!db) {
            return [];
        }

        if (typeof db.getFirstAsync === "function") {
            const row = await db.getFirstAsync("SELECT payload FROM cart_items ORDER BY id DESC LIMIT 1;");
            if (!row?.payload) {
                return [];
            }
            return normalizeCartItems(JSON.parse(row.payload));
        }

        return await new Promise((resolve) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "SELECT payload FROM cart_items ORDER BY id DESC LIMIT 1;",
                    [],
                    (_tx, result) => {
                        const payload = result?.rows?._array?.[0]?.payload;
                        if (!payload) {
                            resolve([]);
                            return;
                        }

                        try {
                            resolve(normalizeCartItems(JSON.parse(payload)));
                        } catch (_error) {
                            resolve([]);
                        }
                    },
                    () => {
                        resolve([]);
                        return false;
                    }
                );
            });
        });
    } catch (_error) {
        return [];
    }
}

async function saveToSQLite(items) {
    try {
        const db = await ensureTable();
        if (!db) {
            return;
        }

        const payload = JSON.stringify(normalizeCartItems(items));
        const now = Date.now();

        if (typeof db.withTransactionAsync === "function" && typeof db.runAsync === "function") {
            await db.withTransactionAsync(async () => {
                await db.runAsync("DELETE FROM cart_items;");
                await db.runAsync("INSERT INTO cart_items (payload, updatedAt) VALUES (?, ?);", payload, now);
            });
            return;
        }

        await new Promise((resolve, reject) => {
            db.transaction(
                (tx) => {
                    tx.executeSql("DELETE FROM cart_items;");
                    tx.executeSql("INSERT INTO cart_items (payload, updatedAt) VALUES (?, ?);", [payload, now]);
                },
                reject,
                resolve
            );
        });
    } catch (_error) {}
}

async function clearSQLite() {
    try {
        const db = await ensureTable();
        if (!db) {
            return;
        }

        if (typeof db.runAsync === "function") {
            await db.runAsync("DELETE FROM cart_items;");
            return;
        }

        await new Promise((resolve, reject) => {
            db.transaction(
                (tx) => {
                    tx.executeSql("DELETE FROM cart_items;");
                },
                reject,
                resolve
            );
        });
    } catch (_error) {}
}

async function loadFromAsyncStorage() {
    try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (!raw) {
            return [];
        }

        return normalizeCartItems(JSON.parse(raw));
    } catch (_error) {
        return [];
    }
}

async function saveToAsyncStorage(items) {
    try {
        await AsyncStorage.setItem(CART_KEY, JSON.stringify(normalizeCartItems(items)));
    } catch (_error) {}
}

async function clearAsyncStorage() {
    try {
        await AsyncStorage.removeItem(CART_KEY);
    } catch (_error) {}
}

export async function loadCartItems() {
    const sqliteItems = await loadFromSQLite();
    if (sqliteItems.length > 0) {
        return sqliteItems;
    }

    const asyncItems = await loadFromAsyncStorage();
    if (asyncItems.length > 0) {
        await saveToSQLite(asyncItems);
    }

    return asyncItems;
}

export async function saveCartItems(items) {
    const safeItems = normalizeCartItems(items);
    await Promise.allSettled([saveToAsyncStorage(safeItems), saveToSQLite(safeItems)]);
}

export async function clearCartItemsStorage() {
    await Promise.allSettled([clearAsyncStorage(), clearSQLite()]);
}
