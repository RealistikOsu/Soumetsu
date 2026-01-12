const clanApp = Vue.createApp({
    compilerOptions: {
        delimiters: ["<%", "%>"]
    },
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

            // Mode/Relax selection
            mode: 0,
            relax: 0,

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
        this.relax = parseInt(params.get('rx')) || 0;

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
                const resp = await SoumetsuAPI.clans.getStats(this.clanId, this.mode, this.relax);
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

        setRelax(rx) {
            if (this.relax === rx) {return;}
            this.relax = rx;
            this.updateURL();
            this.loadStats();
        },

        updateURL() {
            const url = new URL(window.location.href);
            url.searchParams.set('mode', this.mode);
            url.searchParams.set('rx', this.relax);
            window.history.replaceState({}, '', url);
        },

        // Mode compatibility checks
        isRelaxDisabled(rx) {
            if (rx === 1 && this.mode === 3) {return true;} // No relax for mania
            if (rx === 2 && this.mode !== 0) {return true;} // Autopilot only for std
            return false;
        },

        isModeDisabled(m) {
            if (this.relax === 1 && m === 3) {return true;} // No mania for relax
            if (this.relax === 2 && m !== 0) {return true;} // Autopilot only for std
            return false;
        },

        // Helper: Add commas to numbers
        addCommas(num) {
            if (num === undefined || num === null) {return '0';}
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },

        // Helper: Format accuracy
        formatAccuracy(acc) {
            if (acc === undefined || acc === null) {return '0.00';}
            return parseFloat(acc).toFixed(2);
        },

        // Helper: Escape HTML
        escapeHTML(str) {
            if (!str) {return '';}
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },
    },
});

clanApp.mount('#clan-app');
