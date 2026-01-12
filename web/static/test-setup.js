/**
 * Test setup file for Vitest
 * This file runs before each test file
 */

// Mock window.soumetsuConf
global.window = global.window || {};
window.soumetsuConf = {
    baseAPI: 'http://localhost:2018',
    avatars: 'http://localhost:2018/avatars',
    cheesegullAPI: 'http://localhost:8080',
    banchoAPI: 'http://localhost:2018/bancho',
};

// Mock currentUserID
window.currentUserID = 0;

// Mock fetch for API calls
global.fetch = global.fetch || function mockFetch(url, options) {
    console.warn('Unmocked fetch called:', url);
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    });
};

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = String(value);
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    },
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = { ...localStorageMock, store: {} };

// Mock console methods to reduce noise in tests (optional)
// Uncomment if needed:
// console.warn = () => {};
// console.error = () => {};
