/**
 * SoumetsuAPI - Centralized API Client for RealistikOsu Frontend
 *
 * All API calls should flow through this module for consistency
 * and easy adaptation when the API is rewritten.
 */
const SoumetsuAPI = {
    // Configuration getters (lazy evaluation for SSR compatibility)
    baseURL() {
        return window.soumetsuConf?.baseAPI || '';
    },

    cheesegullURL() {
        return window.soumetsuConf?.cheesegullAPI || '';
    },

    avatarURL() {
        return window.soumetsuConf?.avatars || '';
    },

    /**
     * Get CSRF token from meta tag
     * @returns {string|null} CSRF token or null if not present
     */
    getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    },

    /**
     * Core request method - all v1 API calls flow through here
     * @param {string} endpoint - API endpoint (without /api/v1/ prefix)
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} API response
     */
    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseURL()}/api/v1/${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });

        try {
            const response = await fetch(url);
            return response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    },

    /**
     * POST request with CSRF protection
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} API response
     */
    async post(endpoint, data = {}) {
        const url = `${this.baseURL()}/api/v1/${endpoint}`;
        const csrfToken = this.getCSRFToken();

        const headers = {
            'Content-Type': 'application/json',
        };

        // Include CSRF token if available (for authenticated requests)
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                credentials: 'same-origin', // Include cookies for session
                body: JSON.stringify(data),
            });
            return response.json();
        } catch (error) {
            console.error(`API POST failed: ${endpoint}`, error);
            throw error;
        }
    },

    /**
     * PUT request with CSRF protection
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} API response
     */
    async put(endpoint, data = {}) {
        const url = `${this.baseURL()}/api/v1/${endpoint}`;
        const csrfToken = this.getCSRFToken();

        const headers = {
            'Content-Type': 'application/json',
        };

        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers,
                credentials: 'same-origin',
                body: JSON.stringify(data),
            });
            return response.json();
        } catch (error) {
            console.error(`API PUT failed: ${endpoint}`, error);
            throw error;
        }
    },

    /**
     * DELETE request with CSRF protection
     * @param {string} endpoint - API endpoint
     * @returns {Promise<Object>} API response
     */
    async delete(endpoint) {
        const url = `${this.baseURL()}/api/v1/${endpoint}`;
        const csrfToken = this.getCSRFToken();

        const headers = {};

        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers,
                credentials: 'same-origin',
            });
            return response.json();
        } catch (error) {
            console.error(`API DELETE failed: ${endpoint}`, error);
            throw error;
        }
    },

    // Beatmap endpoints (Cheesegull mirror for beatmap data)
    beatmaps: {
        /**
         * Get beatmap by ID from Cheesegull mirror
         */
        get(id) {
            return fetch(`${SoumetsuAPI.cheesegullURL()}/b/${id}`).then(r => r.json());
        },

        /**
         * Get beatmap set by ID from Cheesegull mirror
         */
        getSet(id) {
            return fetch(`${SoumetsuAPI.cheesegullURL()}/s/${id}`).then(r => r.json());
        },

        /**
         * Get scores for a beatmap
         */
        getScores(beatmapId, mode = 0, rx = 0, page = 1, limit = 50, sort = 'pp,desc') {
            return SoumetsuAPI.get('scores', {
                b: beatmapId,
                mode,
                rx,
                p: page,
                l: limit,
                sort,
            });
        },
    },

    // Clan endpoints
    clans: {
        /**
         * Get clan by ID
         */
        get(id) {
            return SoumetsuAPI.get('clans', { id });
        },

        /**
         * Get clan members
         * @param {number} id - Clan ID
         * @param {number} role - Role filter (1=member, 8=owner)
         */
        getMembers(id, role = 1) {
            return SoumetsuAPI.get('clans/members', { id, r: role });
        },

        /**
         * Get clan stats for a mode
         */
        getStats(id, mode = 0, rx = 0) {
            return SoumetsuAPI.get('clans/stats', { id, m: mode, rx });
        },

        /**
         * Check if user is in a clan
         */
        isInClan(userId) {
            return SoumetsuAPI.get('clans/isclan', { uid: userId });
        },
    },

    // User endpoints
    users: {
        /**
         * Get full user profile
         */
        full(params) {
            return SoumetsuAPI.get('users/full', params);
        },

        /**
         * Get current authenticated user
         */
        self() {
            return SoumetsuAPI.get('users/self');
        },

        /**
         * Get user's favourite mode
         */
        favouriteMode() {
            return SoumetsuAPI.get('users/self/favourite_mode');
        },
    },

    // Statistics endpoints
    statistics: {
        /**
         * Get homepage statistics
         */
        homepage() {
            return SoumetsuAPI.get('statistics/homepage');
        },
    },

    // Leaderboard endpoints
    leaderboard: {
        /**
         * Get global leaderboard
         */
        get(mode = 0, rx = 0, sort = 'pp', page = 1, country = '') {
            return SoumetsuAPI.get('leaderboard', {
                mode,
                rx,
                sort,
                p: page,
                country,
            });
        },
    },
};

// Make available globally
window.SoumetsuAPI = SoumetsuAPI;
