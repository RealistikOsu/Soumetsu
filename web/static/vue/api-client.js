const SoumetsuAPI = {
  baseURL() {
    return window.soumetsuConf?.baseAPI || '';
  },

  cheesegullURL() {
    return window.soumetsuConf?.cheesegullAPI || '';
  },

  // Fetch with timeout helper
  async fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw err;
    }
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

  getAuthToken() {
    return window.soumetsuConf?.apiToken || null;
  },

  getAuthHeaders() {
    const headers = {};
    const authToken = this.getAuthToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const csrfToken = this.getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    return headers;
  },

  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseURL()}/api/v2/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    const headers = this.getAuthHeaders();
    const response = await fetch(url, { headers });
    const json = await response.json();
    return json.data !== undefined ? json.data : json;
  },

  async post(endpoint, data = {}) {
    const url = `${this.baseURL()}/api/v2/${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...this.getAuthHeaders() };

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
    const headers = { 'Content-Type': 'application/json', ...this.getAuthHeaders() };

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
    const headers = { ...this.getAuthHeaders() };

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
      return SoumetsuAPI.fetchWithTimeout(`${SoumetsuAPI.cheesegullURL()}/b/${id}`).then((r) =>
        r.json()
      );
    },
    getSet(id) {
      return SoumetsuAPI.fetchWithTimeout(`${SoumetsuAPI.cheesegullURL()}/s/${id}`).then((r) =>
        r.json()
      );
    },
    getSetLocal(setId) {
      return SoumetsuAPI.get(`beatmaps/set/${setId}`);
    },
    getScores(beatmapId, mode = 0, custom_mode = 0, page = 1, limit = 50) {
      return SoumetsuAPI.get(`beatmaps/${beatmapId}/scores`, {
        mode,
        custom_mode,
        page,
        limit,
      });
    },
    rankRequestStatus() {
      return SoumetsuAPI.get('beatmaps/rank-requests/status');
    },
    submitRankRequest(url) {
      return SoumetsuAPI.post('beatmaps/rank-requests', { url });
    },
    checkRankRequest(setId) {
      return SoumetsuAPI.get(`beatmaps/rank-requests/check/${setId}`);
    },
  },

  clans: {
    get(id) {
      return SoumetsuAPI.get(`clans/${id}`);
    },
    getMembers(id) {
      return SoumetsuAPI.get(`clans/${id}/members`);
    },
    getStats(id, mode = 0, custom_mode = 0) {
      return SoumetsuAPI.get(`clans/${id}/stats`, { mode, custom_mode });
    },
    getTopScores(id, mode = 0, custom_mode = 0, limit = 4) {
      return SoumetsuAPI.get(`clans/${id}/scores/top`, { mode, custom_mode, limit });
    },
    getMemberLeaderboard(id, mode = 0, custom_mode = 0) {
      return SoumetsuAPI.get(`clans/${id}/members/leaderboard`, { mode, custom_mode });
    },
    list(page = 1, limit = 50, sort = 'pp') {
      return SoumetsuAPI.get('clans', { page, limit, sort });
    },
  },

  users: {
    get(id, mode = 0, custom_mode = 0) {
      return SoumetsuAPI.get(`users/${id}`, { mode, custom_mode });
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
    me(mode = 0, custom_mode = 0) {
      return SoumetsuAPI.get('users/me', { mode, custom_mode });
    },
    scores: {
      best(userId, mode = 0, custom_mode = 0, page = 1, limit = 50) {
        return SoumetsuAPI.get(`users/${userId}/scores/best`, { mode, custom_mode, page, limit });
      },
      recent(userId, mode = 0, custom_mode = 0, page = 1, limit = 50) {
        return SoumetsuAPI.get(`users/${userId}/scores/recent`, { mode, custom_mode, page, limit });
      },
      firsts(userId, mode = 0, custom_mode = 0, page = 1, limit = 50) {
        return SoumetsuAPI.get(`users/${userId}/scores/firsts`, { mode, custom_mode, page, limit });
      },
      pinned(userId, mode = 0, custom_mode = 0) {
        return SoumetsuAPI.get(`users/${userId}/scores/pinned`, { mode, custom_mode });
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
    async get(mode = 0, custom_mode = 0, sort = 'pp', page = 1, country = '') {
      const limit = 50;
      let data;
      if (country && country !== '') {
        data = await SoumetsuAPI.get(`leaderboard/country/${country}/`, {
          mode,
          custom_mode,
          page,
          limit,
        });
      } else {
        data = await SoumetsuAPI.get('leaderboard/', { mode, custom_mode, page, limit });
      }
      return { users: data };
    },
    global(mode = 0, custom_mode = 0, page = 1, limit = 50) {
      return SoumetsuAPI.get('leaderboard/', { mode, custom_mode, page, limit });
    },
    country(country, mode = 0, custom_mode = 0, page = 1, limit = 50) {
      return SoumetsuAPI.get(`leaderboard/country/${country}/`, { mode, custom_mode, page, limit });
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

  statistics: {
    async homepage() {
      try {
        const topScores = await SoumetsuAPI.get('scores/top/mixed');
        const mapped = (topScores || []).map((s) => ({
          ...s,
          pp_val: s.pp,
          mode: s.play_mode,
        }));
        return {
          data: {
            top_scores: mapped,
            online_history: [],
          },
        };
      } catch {
        return { data: { top_scores: [], online_history: [] } };
      }
    },
  },

  comments: {
    get(userId) {
      return SoumetsuAPI.get(`users/${userId}/comments`);
    },
    create(profileId, message) {
      return SoumetsuAPI.post('comments', { profile_id: profileId, message });
    },
    delete(id) {
      return SoumetsuAPI.delete(`comments/${id}`);
    },
  },

  async checkOnline(userId) {
    if (!this.banchoURL()) return false;
    try {
      const resp = await fetch(`${this.banchoURL()}/api/status/${userId}`);
      const data = await resp.json();
      return data.status === 200;
    } catch {
      return false;
    }
  },
};

window.SoumetsuAPI = SoumetsuAPI;
