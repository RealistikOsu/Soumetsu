const clanApp = Soumetsu.createApp({
    data() {
        return {
            // Clan data
            clan: null,
            members: [],
            owner: null,
            stats: null,

            // UI state
            loading: true,
            error: null,
            statsLoading: false,

            // Mode/CustomMode selection
            mode: 0,
            customMode: 0,

            // User clan status
            userClanInfo: null, // { clan: id, perms: int }
            isCurrentUserInThisClan: false,
            isCurrentUserOwner: false,

            // Config
            clanId: window.clanId || 0,
            clanParam: window.clanParam || '',
            currentUserID: window.currentUserID || 0,
            avatarURL: window.soumetsuConf?.avatars || '',
        };
    },

    computed: {
        canJoin() {
            return this.currentUserID > 0 && !this.userClanInfo;
        },

        canLeave() {
            return this.isCurrentUserInThisClan && !this.isCurrentUserOwner;
        },

        canDisband() {
            return this.isCurrentUserOwner;
        },

        modeNames() {
            return ['Standard', 'Taiko', 'Catch', 'Mania'];
        },
    },

    async created() {
        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        this.mode = parseInt(params.get('mode')) || 0;
        this.customMode = parseInt(params.get('cm')) || 0;

        await this.loadClanData();
    },

    methods: {
        async loadClanData() {
            this.loading = true;
            this.error = null;

            try {
                // Load clan info - try by ID first, then by name
                let clanResp;
                if (this.clanId > 0) {
                    clanResp = await SoumetsuAPI.clans.get(this.clanId);
                } else if (this.clanParam) {
                    // API might support name lookup - try with the param
                    clanResp = await SoumetsuAPI.get('clans', { name: this.clanParam });
                }

                if (!clanResp?.clans?.length) {
                    this.error = 'Clan not found';
                    this.loading = false;
                    return;
                }

                this.clan = clanResp.clans[0];
                this.clanId = this.clan.id; // Update with resolved ID

                // Update page title
                document.title = `${this.clan.name}'s Clan Page :: RealistikOsu!`;

                // Load members, owner, and stats in parallel
                await Promise.all([
                    this.loadMembers(),
                    this.loadOwner(),
                    this.loadStats(),
                    this.checkUserClanStatus(),
                ]);

            } catch (err) {
                console.error('Error loading clan:', err);
                this.error = 'Failed to load clan data';
            }

            this.loading = false;
        },

        async loadMembers() {
            try {
                const resp = await SoumetsuAPI.clans.getMembers(this.clanId, 1);
                this.members = resp.members || [];
            } catch (err) {
                console.error('Error loading members:', err);
            }
        },

        async loadOwner() {
            try {
                const resp = await SoumetsuAPI.clans.getMembers(this.clanId, 8);
                this.owner = resp.members?.[0] || null;
            } catch (err) {
                console.error('Error loading owner:', err);
            }
        },

        async loadStats() {
            this.statsLoading = true;

            try {
                const resp = await SoumetsuAPI.clans.getStats(this.clanId, this.mode, this.customMode);
                this.stats = resp;
            } catch (err) {
                console.error('Error loading stats:', err);
            }

            this.statsLoading = false;
        },

        async checkUserClanStatus() {
            if (this.currentUserID <= 0) {return;}

            try {
                const resp = await SoumetsuAPI.clans.isInClan(this.currentUserID);
                if (resp.clan?.clan) {
                    this.userClanInfo = resp.clan;
                    this.isCurrentUserInThisClan = resp.clan.clan === this.clanId;
                    this.isCurrentUserOwner = resp.clan.perms === 8 && this.isCurrentUserInThisClan;
                }
            } catch (err) {
                console.error('Error checking clan status:', err);
            }
        },

        setMode(m) {
            if (this.mode === m) {return;}
            this.mode = m;
            this.updateURL();
            this.loadStats();
        },

        setCustomMode(rx) {
            if (this.customMode === rx) {return;}
            this.customMode = rx;
            this.updateURL();
            this.loadStats();
        },

        updateURL() {
            const url = new URL(window.location.href);
            url.searchParams.set('mode', this.mode);
            url.searchParams.set('cm', this.customMode);
            window.history.replaceState({}, '', url);
        },

        // Mode compatibility checks - delegate to shared helpers
        isCustomModeDisabled(rx) {
            return SoumetsuGameHelpers.isCustomModeDisabled(rx, this.mode);
        },

        isModeDisabled(m) {
            return SoumetsuGameHelpers.isModeDisabled(m, this.customMode);
        },

        // Delegate to shared helpers
        addCommas: SoumetsuHelpers.addCommas,
        formatAccuracy: SoumetsuHelpers.formatAccuracy,
        escapeHTML: SoumetsuHelpers.escapeHTML,
    },
});

clanApp.mount('#clan-app');
