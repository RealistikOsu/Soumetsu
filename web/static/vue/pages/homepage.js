const homepageApp = Vue.createApp({
    compilerOptions: {
        delimiters: ["<%", "%>"]
    },
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
        async loadHomepageData() {
            this.loading = true;

            try {
                const stats = await SoumetsuAPI.statistics.homepage();

                if (stats?.data) {
                    this.topPlays = (stats.data.top_scores || []).slice(0, 8);
                    this.onlineHistory = stats.data.online_history || [];

                    // Calculate max online from history
                    if (this.onlineHistory.length > 0) {
                        this.maxOnline = Math.max(...this.onlineHistory.map(x => parseInt(x) || 0));
                    }
                }
            } catch (err) {
                console.error('Error loading homepage data:', err);
            }

            this.loading = false;
        },

        // Helper: Add commas to numbers
        addCommas(num) {
            if (num === undefined || num === null) {return '0';}
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
    },
});

homepageApp.mount('#homepage-app');
