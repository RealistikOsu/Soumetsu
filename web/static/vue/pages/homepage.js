const homepageApp = Soumetsu.createApp({
  data() {
    return {
      // Stats (passed from server via window)
      onlineUsers: window.onlineUsers || 0,
      registeredUsers: window.registeredUsers || 0,

      // Dynamic data from API
      topPlays: [],
      onlineHistory: [],
      maxOnline: 0,

      // UI state
      loading: true,

      // Config
      currentUserID: window.currentUserID || 0,
      avatarURL: window.soumetsuConf?.avatars || '',
    };
  },

  computed: {
    isLoggedIn() {
      return this.currentUserID > 0;
    },
  },

  async created() {
    await this.loadHomepageData();
  },

  methods: {
    getModeBadge(play) {
      const cm = ['Vanilla', 'Relax', 'Autopilot'][play.custom_mode] || 'Vanilla';
      const mode = ['Standard', 'Taiko', 'Catch', 'Mania'][play.mode] || 'Standard';
      return `${cm} ${mode}`;
    },

    async loadHomepageData() {
      this.loading = true;

      try {
        const stats = await SoumetsuAPI.statistics.homepage();

        if (stats?.data) {
          this.topPlays = (stats.data.top_scores || []).slice(0, 8);
          this.onlineHistory = stats.data.online_history || [];

          // Calculate max online from history
          if (this.onlineHistory.length > 0) {
            this.maxOnline = Math.max(...this.onlineHistory.map((x) => parseInt(x) || 0));
          }
        }
      } catch (err) {
        console.error('Error loading homepage data:', err);
      }

      this.loading = false;
    },

    // Delegate to shared helpers
    addCommas: SoumetsuHelpers.addCommas,
  },
});

homepageApp.mount('#homepage-app');
