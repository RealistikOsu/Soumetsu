/**
 * Friends Page Vue App
 *
 * Displays friends as visually rich cards inspired by user-cards.js hover design.
 * Each card shows gradient banner, avatar, stats, online status, and action buttons.
 */

const friendsApp = Soumetsu.createApp({
  data() {
    return {
      // Friends data
      friends: [],
      mutualIds: new Set(),

      // UI state
      loading: true,
      error: null,
      page: 1,
      limit: 40,
      hasMore: true,
      loadingMore: false,

      // Removing friend
      removingId: null,

      // Config
      avatarURL: window.soumetsuConf?.avatars || 'https://a.ussr.pl',
      baseAPI: window.soumetsuConf?.baseAPI || '',
      banchoAPI: window.soumetsuConf?.banchoAPI || '',
    };
  },
  computed: {
    sortedFriends() {
      return this.friends.slice().sort((a, b) => {
        if (a.is_online !== b.is_online) {
          return b.is_online ? 1 : -1;
        }
        return a.username.localeCompare(b.username);
      });
    },
  },
  async created() {
    await this.loadFriends();
  },
  methods: {
    async api(endpoint, params = {}) {
      const base = this.baseAPI || '';
      let urlStr = `${base}/api/v2/${endpoint}`;
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.set(k, v);
        }
      });
      const queryStr = searchParams.toString();
      if (queryStr) {
        urlStr += (urlStr.includes('?') ? '&' : '?') + queryStr;
      }

      const headers = {};
      const authToken = window.soumetsuConf?.apiToken;
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const resp = await fetch(urlStr, { headers });
      const json = await resp.json();
      return json.data !== undefined ? json.data : json;
    },

    async loadFriends() {
      this.loading = true;
      this.error = null;

      try {
        // Load relationships to get mutual friends
        const relationships = await this.api('users/me/friends/relationships', {
          page: 1,
          limit: 100,
        });

        if (relationships?.mutual) {
          this.mutualIds = new Set(relationships.mutual);
        }

        // Load friends list
        const friends = await this.api('users/me/friends', {
          page: this.page,
          limit: this.limit,
        });

        if (!friends || !Array.isArray(friends)) {
          this.friends = [];
          this.hasMore = false;
        } else {
          // Load detailed card data for each friend
          const cardPromises = friends.map((f) => this.loadFriendCard(f));
          this.friends = await Promise.all(cardPromises);
          this.hasMore = friends.length === this.limit;
        }
      } catch (err) {
        console.error('Error loading friends:', err);
        this.error = 'Failed to load friends';
      }

      this.loading = false;
    },

    async loadFriendCard(friend) {
      try {
        const card = await this.api(`users/${friend.user_id}/card`);
        return {
          ...card,
          is_mutual: this.mutualIds.has(friend.user_id),
          bannerColors: null,
        };
      } catch (err) {
        return {
          id: friend.user_id,
          username: friend.username,
          country: friend.country,
          privileges: 1,
          global_rank: 0,
          country_rank: 0,
          is_online: false,
          pp: 0,
          accuracy: 0,
          mode: 0,
          custom_mode: 0,
          is_mutual: this.mutualIds.has(friend.user_id),
          bannerColors: null,
        };
      }
    },

    async loadMore() {
      if (this.loadingMore || !this.hasMore) {
        return;
      }

      this.loadingMore = true;
      this.page++;

      try {
        const friends = await this.api('users/me/friends', {
          page: this.page,
          limit: this.limit,
        });

        if (friends && Array.isArray(friends) && friends.length > 0) {
          const cardPromises = friends.map((f) => this.loadFriendCard(f));
          const newFriends = await Promise.all(cardPromises);
          this.friends.push(...newFriends);
          this.hasMore = friends.length === this.limit;
        } else {
          this.hasMore = false;
        }
      } catch (err) {
        console.error('Error loading more friends:', err);
      }

      this.loadingMore = false;
    },

    async removeFriend(userId) {
      if (this.removingId) {
        return;
      }

      this.removingId = userId;

      try {
        await SoumetsuAPI.friends.remove(userId);
        this.friends = this.friends.filter((f) => f.id !== userId);
      } catch (err) {
        console.error('Error removing friend:', err);
      }

      this.removingId = null;
    },

    extractBannerColors(event, friendId) {
      const img = event.target;
      if (!window.BannerGradient) {
        return;
      }

      window.BannerGradient.extract(img, (colors) => {
        const friend = this.friends.find((f) => f.id === friendId);
        if (friend && colors) {
          friend.bannerColors = colors;
        }
      });
    },

    getBannerStyle(friend) {
      if (friend.bannerColors?.colour1 && friend.bannerColors?.colour2) {
        const colour1RGBA = friend.bannerColors.colour1
          .replace('rgb', 'rgba')
          .replace(')', ', 0.25)');
        const colour2RGBA = friend.bannerColors.colour2
          .replace('rgb', 'rgba')
          .replace(')', ', 0.25)');
        return {
          background: `linear-gradient(to bottom right, ${colour1RGBA}, ${colour2RGBA})`,
        };
      }
      return {
        background:
          'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)',
      };
    },

    getRoleBadges(privileges) {
      const badges = [];
      if (privileges & 8192) {
        badges.push({ icon: 'fas fa-gavel', color: 'text-red-400', title: 'Admin' });
      } else if (privileges & 4096) {
        badges.push({ icon: 'fas fa-shield-alt', color: 'text-purple-400', title: 'Moderator' });
      }
      if (privileges & 4) {
        badges.push({ icon: 'fas fa-heart', color: 'text-yellow-400', title: 'Supporter' });
      }
      return badges;
    },

    isRestricted(privileges) {
      return !(privileges & 1);
    },

    handleAvatarError(event, userId) {
      const img = event.target;
      const currentSrc = img.src;

      if (!currentSrc.endsWith('.png')) {
        img.src = this.avatarURL + '/' + userId + '.png';
        return;
      }

      const svgData = encodeURIComponent(
        `
                <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <rect width="256" height="256" fill="#1E293B"/>
                    <circle cx="128" cy="96" r="48" fill="#475569"/>
                    <path d="M64 208C64 176 96 160 128 160C160 160 192 176 192 208V224H64V208Z" fill="#475569"/>
                </svg>
            `.trim()
      );

      img.src = 'data:image/svg+xml,' + svgData;
      img.onerror = null;
    },

    // Delegate to shared helpers
    addCommas: SoumetsuHelpers.addCommas,
    formatAccuracy: SoumetsuHelpers.formatAccuracy,
    getCountryName: SoumetsuHelpers.getCountryName,
    escapeHTML: SoumetsuHelpers.escapeHTML,
  },
});

friendsApp.mount('#friends-app');
