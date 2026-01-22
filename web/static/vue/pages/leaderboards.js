const leaderboardApp = Soumetsu.createApp({
    data() {
        return {
            data: [],
            mode: window.mode || 'std',
            customMode: window.customMode || 'vn',
            customModeInt: 0,
            modeInt: 0,
            sort: window.sort || 'pp',
            load: true,
            page: window.page || 1,
            country: window.country || '',
            soumetsuConf: window.soumetsuConf || {},
        }
    },
    computed: {
    },
    created() {
        // Use window variables set by Go template
        this.loadLeaderboardData(
            window.sort || 'pp',
            window.mode || 'std',
            window.customMode || 'vn',
            window.page || 1,
            window.country || ''
        )
    },
    methods: {
        async loadLeaderboardData(sort, mode, customMode, page, country) {
            if (window.event) {
                window.event.preventDefault();
            }
            this.load = true;
            this.mode = mode;
            this.customMode = customMode;

            // Use shared game helpers for mode conversion
            this.modeInt = SoumetsuGameHelpers.getModeIndex(mode);
            this.customModeInt = SoumetsuGameHelpers.getCustomModeIndex(customMode);

            this.sort = sort;
            this.page = page;
            if (country == null) { this.country = ''; }
            else { this.country = country.toUpperCase(); }
            if (this.page <= 0 || this.page == null) { this.page = 1; }
            window.history.replaceState('', document.title, `/leaderboard?m=${this.mode}&cm=${this.customMode}&sort=${this.sort}&p=${this.page}&c=${this.country}`);

            try {
                const response = await SoumetsuAPI.leaderboard.get(
                    this.modeInt,
                    this.customModeInt,
                    this.sort,
                    this.page,
                    this.country
                );
                this.data = response.users || [];
            } catch (error) {
                console.error('Leaderboard error:', error);
                this.data = [];
            }
            this.load = false;
        },

        // Delegate to shared helpers
        addCommas: SoumetsuHelpers.addCommas,
        convertIntToLabel: SoumetsuHelpers.humanizeLabel,
        addOne: SoumetsuHelpers.addOne,
        mobileCheck: SoumetsuHelpers.isMobile,
        countryName: SoumetsuHelpers.getCountryName,
        formatAccuracy: SoumetsuHelpers.formatAccuracy,
        safeValue: SoumetsuHelpers.safeValue,
        getPlayerRole: SoumetsuHelpers.getPlayerRole
    }
});

leaderboardApp.mount('#app');
