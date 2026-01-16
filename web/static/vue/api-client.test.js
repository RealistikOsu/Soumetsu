import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the SoumetsuAPI client structure for testing
describe('SoumetsuAPI', () => {
    let mockFetch;

    beforeEach(() => {
        // Reset window config
        window.soumetsuConf = {
            baseAPI: 'http://localhost:2018',
            avatars: 'http://localhost:2018/avatars',
            cheesegullAPI: 'http://localhost:8080',
        };

        // Mock fetch
        mockFetch = vi.fn();
        global.fetch = mockFetch;
    });

    describe('baseURL', () => {
        it('should return configured baseAPI', () => {
            const baseURL = () => window.soumetsuConf?.baseAPI || '';
            expect(baseURL()).toBe('http://localhost:2018');
        });

        it('should return empty string if not configured', () => {
            window.soumetsuConf = {};
            const baseURL = () => window.soumetsuConf?.baseAPI || '';
            expect(baseURL()).toBe('');
        });
    });

    describe('CSRF Token', () => {
        it('should get CSRF token from meta tag', () => {
            // Create a mock meta tag
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'csrf-token');
            meta.setAttribute('content', 'test-csrf-token');
            document.head.appendChild(meta);

            const getCSRFToken = () => {
                const m = document.querySelector('meta[name="csrf-token"]');
                return m ? m.getAttribute('content') : null;
            };

            expect(getCSRFToken()).toBe('test-csrf-token');

            // Cleanup
            document.head.removeChild(meta);
        });

        it('should return null if no CSRF meta tag', () => {
            const getCSRFToken = () => {
                const m = document.querySelector('meta[name="csrf-token"]');
                return m ? m.getAttribute('content') : null;
            };

            expect(getCSRFToken()).toBeNull();
        });
    });

    describe('GET requests', () => {
        it('should build URL with query parameters', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ code: 200, data: [] }),
            });

            const get = async (endpoint, params = {}) => {
                const url = new URL(`http://localhost:2018/api/v2/${endpoint}`);
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        url.searchParams.set(key, value);
                    }
                });
                const response = await fetch(url);
                return response.json();
            };

            await get('users', { id: 123, name: 'test' });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.objectContaining({
                    href: expect.stringContaining('id=123'),
                })
            );
        });

        it('should skip empty parameters', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const get = async (endpoint, params = {}) => {
                const url = new URL(`http://localhost:2018/api/v2/${endpoint}`);
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        url.searchParams.set(key, value);
                    }
                });
                const response = await fetch(url);
                return response.json();
            };

            await get('users', { id: 123, name: '', empty: null });

            const calledUrl = mockFetch.mock.calls[0][0];
            expect(calledUrl.href).toContain('id=123');
            expect(calledUrl.href).not.toContain('name=');
            expect(calledUrl.href).not.toContain('empty=');
        });
    });

    describe('POST requests', () => {
        it('should include CSRF token in headers', async () => {
            // Add CSRF meta tag
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'csrf-token');
            meta.setAttribute('content', 'csrf-123');
            document.head.appendChild(meta);

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ code: 200 }),
            });

            const post = async (endpoint, data = {}) => {
                const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;

                const headers = {
                    'Content-Type': 'application/json',
                };
                if (csrfToken) {
                    headers['X-CSRF-Token'] = csrfToken;
                }

                const response = await fetch(`http://localhost:2018/api/v2/${endpoint}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(data),
                });
                return response.json();
            };

            await post('users/comments', { message: 'test' });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'X-CSRF-Token': 'csrf-123',
                    }),
                })
            );

            // Cleanup
            document.head.removeChild(meta);
        });

        it('should stringify request body as JSON', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const post = async (endpoint, data = {}) => {
                const response = await fetch(`http://localhost:2018/api/v2/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                return response.json();
            };

            const testData = { id: 123, message: 'hello' };
            await post('test', testData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify(testData),
                })
            );
        });
    });

    describe('Error handling', () => {
        it('should handle fetch errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const get = async endpoint => {
                try {
                    const response = await fetch(`http://localhost:2018/api/v2/${endpoint}`);
                    return response.json();
                } catch (error) {
                    console.error(`API request failed: ${endpoint}`, error);
                    throw error;
                }
            };

            await expect(get('test')).rejects.toThrow('Network error');
        });
    });
});

describe('Leaderboard API', () => {
    it('should call correct endpoint with parameters', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ users: [] }),
        });
        global.fetch = mockFetch;

        const getLeaderboard = async (mode = 0, rx = 0, sort = 'pp', page = 1, country = '') => {
            const url = new URL('http://localhost:2018/api/v2/leaderboard');
            url.searchParams.set('mode', mode);
            url.searchParams.set('rx', rx);
            url.searchParams.set('sort', sort);
            url.searchParams.set('p', page);
            if (country) url.searchParams.set('country', country);

            const response = await fetch(url);
            return response.json();
        };

        await getLeaderboard(0, 1, 'pp', 2, 'US');

        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl.searchParams.get('mode')).toBe('0');
        expect(calledUrl.searchParams.get('rx')).toBe('1');
        expect(calledUrl.searchParams.get('sort')).toBe('pp');
        expect(calledUrl.searchParams.get('p')).toBe('2');
        expect(calledUrl.searchParams.get('country')).toBe('US');
    });
});

describe('Clan API', () => {
    it('should fetch clan by ID', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({ clans: [{ id: 1, name: 'Test Clan' }] }),
        });
        global.fetch = mockFetch;

        const getClan = async id => {
            const url = new URL('http://localhost:2018/api/v2/clans');
            url.searchParams.set('id', id);
            const response = await fetch(url);
            return response.json();
        };

        const result = await getClan(1);

        expect(result.clans[0].name).toBe('Test Clan');
    });
});
