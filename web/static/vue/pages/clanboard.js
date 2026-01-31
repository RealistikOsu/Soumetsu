const clanboardApp = Soumetsu.createApp({
    data() {
        return {
            data: [],
            mode: window.mode || 'std',
            customMode: window.customMode || 'vn',
            customModeInt: 0,
            modeInt: 0,
            loading: true,
            page: window.page || 1,
            totalClans: 0,
            totalPages: 1,
        }
    },
    computed: {
    },
    created() {
        this.loadClanboardData(
            window.mode || 'std',
            window.customMode || 'vn',
            window.page || 1
        )
    },
    methods: {
        async fetchTotalClans() {
            try {
                const response = await SoumetsuAPI.get('clans/leaderboard/total');
                this.totalClans = response.total || 0;
                this.totalPages = Math.max(1, Math.ceil(this.totalClans / 50));
            } catch (error) {
                console.error('Total clans error:', error);
                this.totalClans = 0;
                this.totalPages = 1;
            }
        },

        async loadClanboardData(mode, customMode, page) {
            if (window.event) {
                window.event.preventDefault();
            }
            this.loading = true;

            if (mode) { this.mode = mode; }
            if (customMode) { this.customMode = customMode; }

            // Use shared game helpers for mode conversion
            this.modeInt = SoumetsuGameHelpers.getModeIndex(mode);
            this.customModeInt = SoumetsuGameHelpers.getCustomModeIndex(customMode);

            this.page = page;
            if (this.page <= 0 || this.page == null) { this.page = 1; }
            window.history.replaceState('', document.title, `/clans/leaderboard?mode=${this.mode}&cm=${this.customMode}&p=${this.page}`);

            // Fetch total clans for pagination
            await this.fetchTotalClans();

            try {
                const response = await SoumetsuAPI.get('clans/leaderboard', {
                    mode: this.modeInt,
                    custom_mode: this.customModeInt,
                    page: this.page,
                    limit: 50,
                });
                this.data = response || [];
            } catch (error) {
                console.error('Clanboard error:', error);
                this.data = [];
            }
            this.loading = false;
        },

        navigateTo(url) {
            window.location.href = url;
        },
        formatNumber: SoumetsuHelpers.addCommas,
        addCommas: SoumetsuHelpers.addCommas,
        convertIntToLabel: SoumetsuHelpers.humanizeLabel,
        addOne: SoumetsuHelpers.addOne,
        mobileCheck: SoumetsuHelpers.isMobile,
        safeValue: SoumetsuHelpers.safeValue
    }
});

clanboardApp.mount('#app');
