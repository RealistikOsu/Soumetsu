const SoumetsuAPI = {
    baseURL() {
        return window.soumetsuConf?.baseAPI || '';
    },

    cheesegullURL() {
        return window.soumetsuConf?.cheesegullAPI || '';
    },

    avatarURL() {
        return window.soumetsuConf?.avatars || '';
    },

    banchoURL() {
        return window.soumetsuConf?.banchoAPI || '';
    },

    getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    },

    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseURL()}/api/v2/${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });

        const response = await fetch(url);
        const json = await response.json();
        return json.data !== undefined ? json.data : json;
    },

    async post(endpoint, data = {}) {
        const url = `${this.baseURL()}/api/v2/${endpoint}`;
        const headers = { 'Content-Type': 'application/json' };
        const csrfToken = this.getCSRFToken();
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const response = await fetch(url, {
            method: 'POST',
            headers,
            credentials: 'same-origin',
            body: JSON.stringify(data),
        });
        const json = await response.json();
        return json.data !== undefined ? json.data : json;
    },

    async put(endpoint, data = {}) {
        const url = `${this.baseURL()}/api/v2/${endpoint}`;
        const headers = { 'Content-Type': 'application/json' };
        const csrfToken = this.getCSRFToken();
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const response = await fetch(url, {
            method: 'PUT',
            headers,
            credentials: 'same-origin',
            body: JSON.stringify(data),
        });
        const json = await response.json();
        return json.data !== undefined ? json.data : json;
    },

    async delete(endpoint) {
        const url = `${this.baseURL()}/api/v2/${endpoint}`;
        const headers = {};
        const csrfToken = this.getCSRFToken();
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const response = await fetch(url, {
            method: 'DELETE',
            headers,
            credentials: 'same-origin',
        });
        const json = await response.json();
        return json.data !== undefined ? json.data : json;
    },

    beatmaps: {
        get(id) {
            return fetch(`${SoumetsuAPI.cheesegullURL()}/b/${id}`).then(r => r.json());
        },
        getSet(id) {
            return fetch(`${SoumetsuAPI.cheesegullURL()}/s/${id}`).then(r => r.json());
        },
        getScores(beatmapId, mode = 0, playstyle = 0, page = 1, limit = 50) {
            return SoumetsuAPI.get(`beatmaps/${beatmapId}/scores`, {
                mode,
                playstyle,
                page,
                limit,
            });
        },
    },

    clans: {
        get(id) {
            return SoumetsuAPI.get(`clans/${id}`);
        },
        getMembers(id) {
            return SoumetsuAPI.get(`clans/${id}/members`);
        },
        getStats(id, mode = 0, playstyle = 0) {
            return SoumetsuAPI.get(`clans/${id}/stats`, { mode, playstyle });
        },
        list(page = 1, limit = 50, sort = 'pp') {
            return SoumetsuAPI.get('clans', { page, limit, sort });
        },
    },

    users: {
        get(id, mode = 0, playstyle = 0) {
            return SoumetsuAPI.get(`users/${id}`, { mode, playstyle });
        },
        card(id) {
            return SoumetsuAPI.get(`users/${id}/card`);
        },
        search(query, page = 1, limit = 50) {
            return SoumetsuAPI.get('users/search', { q: query, page, limit });
        },
        resolve(username) {
            return SoumetsuAPI.get('users/resolve', { username });
        },
        me(mode = 0, playstyle = 0) {
            return SoumetsuAPI.get('users/me', { mode, playstyle });
        },
        scores: {
            best(userId, mode = 0, playstyle = 0, page = 1, limit = 50) {
                return SoumetsuAPI.get(`users/${userId}/scores/best`, { mode, playstyle, page, limit });
            },
            recent(userId, mode = 0, playstyle = 0, page = 1, limit = 50) {
                return SoumetsuAPI.get(`users/${userId}/scores/recent`, { mode, playstyle, page, limit });
            },
            firsts(userId, mode = 0, playstyle = 0, page = 1, limit = 50) {
                return SoumetsuAPI.get(`users/${userId}/scores/firsts`, { mode, playstyle, page, limit });
            },
            pinned(userId, mode = 0, playstyle = 0) {
                return SoumetsuAPI.get(`users/${userId}/scores/pinned`, { mode, playstyle });
            },
        },
    },

    scores: {
        get(id) {
            return SoumetsuAPI.get(`scores/${id}`);
        },
        pin(id) {
            return SoumetsuAPI.post(`scores/${id}/pin`);
        },
        unpin(id) {
            return SoumetsuAPI.delete(`scores/${id}/pin`);
        },
    },

    leaderboard: {
        global(mode = 0, playstyle = 0, page = 1, limit = 50) {
            return SoumetsuAPI.get('leaderboard', { mode, playstyle, page, limit });
        },
        country(country, mode = 0, playstyle = 0, page = 1, limit = 50) {
            return SoumetsuAPI.get(`leaderboard/country/${country}`, { mode, playstyle, page, limit });
        },
    },

    friends: {
        list() {
            return SoumetsuAPI.get('users/me/friends');
        },
        add(userId) {
            return SoumetsuAPI.post(`users/me/friends/${userId}`);
        },
        remove(userId) {
            return SoumetsuAPI.delete(`users/me/friends/${userId}`);
        },
    },

    comments: {
        get(userId) {
            return SoumetsuAPI.get(`users/${userId}/comments`);
        },
        create(targetId, content) {
            return SoumetsuAPI.post('comments', { target_id: targetId, content });
        },
        delete(id) {
            return SoumetsuAPI.delete(`comments/${id}`);
        },
    },

    async checkOnline(userId) {
        if (!this.banchoURL()) return false;
        try {
            const resp = await fetch(`${this.banchoURL()}/api/v1/isOnline?u=${userId}`);
            const data = await resp.json();
            return data.status === 200 && data.result === true;
        } catch {
            return false;
        }
    },
};

window.SoumetsuAPI = SoumetsuAPI;
