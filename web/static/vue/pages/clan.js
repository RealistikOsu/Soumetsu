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

            // Top plays
            topPlays: [],
            topPlaysLoading: false,

            // Member leaderboard
            memberLeaderboard: [],
            leaderboardLoading: false,

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

            // Banner gradient colors extracted from member avatars
            memberBannerColors: {},
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
                // Load clan info by ID
                let clan;
                if (this.clanId > 0) {
                    clan = await SoumetsuAPI.clans.get(this.clanId);
                }

                if (!clan || !clan.id) {
                    this.error = 'Clan not found';
                    this.loading = false;
                    return;
                }

                this.clan = clan;
                this.clanId = this.clan.id;

                // Update page title
                document.title = `${this.clan.name}'s Clan Page :: RealistikOsu!`;

                // Load members and mode-specific data in parallel
                await Promise.all([
                    this.loadMembers(),
                    this.loadModeData(),
                ]);

                // Check user clan status after members are loaded
                this.checkUserClanStatus();

            } catch (err) {
                console.error('Error loading clan:', err);
                this.error = 'Failed to load clan data';
            }

            this.loading = false;
        },

        async loadMembers() {
            try {
                const members = await SoumetsuAPI.clans.getMembers(this.clanId);
                this.members = (members || []).map(m => ({ ...m, id: m.user_id }));
                // Find owner from members list
                this.owner = this.members.find(m => m.is_owner) || null;
            } catch (err) {
                console.error('Error loading members:', err);
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

        async loadModeData() {
            await Promise.all([
                this.loadStats(),
                this.loadTopPlays(),
                this.loadMemberLeaderboard(),
            ]);
        },

        async loadTopPlays() {
            this.topPlaysLoading = true;

            try {
                const data = await SoumetsuAPI.clans.getTopScores(this.clanId, this.mode, this.customMode, 4);
                this.topPlays = data || [];
            } catch (err) {
                console.error('Error loading top plays:', err);
                this.topPlays = [];
            }

            this.topPlaysLoading = false;
        },

        async loadMemberLeaderboard() {
            this.leaderboardLoading = true;

            try {
                const data = await SoumetsuAPI.clans.getMemberLeaderboard(this.clanId, this.mode, this.customMode);
                this.memberLeaderboard = data || [];
            } catch (err) {
                console.error('Error loading member leaderboard:', err);
                this.memberLeaderboard = [];
            }

            this.leaderboardLoading = false;
        },

        async checkUserClanStatus() {
            if (this.currentUserID <= 0) {return;}

            // Check from loaded members list
            const currentMember = this.members.find(m => m.user_id === this.currentUserID);
            if (currentMember) {
                this.userClanInfo = { clan: this.clanId };
                this.isCurrentUserInThisClan = true;
                this.isCurrentUserOwner = currentMember.is_owner;
            }
        },

        setMode(m) {
            if (this.mode === m) {return;}
            this.mode = m;
            this.updateURL();
            this.loadModeData();
        },

        setCustomMode(rx) {
            if (this.customMode === rx) {return;}
            this.customMode = rx;
            this.updateURL();
            this.loadModeData();
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

        extractMemberBannerColors(event, memberId) {
            const img = event.target;
            if (!window.BannerGradient) {return;}
            window.BannerGradient.extract(img, (colors) => {
                if (colors && colors.colour1 && colors.colour2) {
                    this.memberBannerColors[memberId] = colors;
                }
            });
        },

        memberBannerGradient(memberId) {
            const colors = this.memberBannerColors[memberId];
            if (colors && colors.colour1 && colors.colour2) {
                const c1 = colors.colour1.replace('rgb', 'rgba').replace(')', ', 0.2)');
                const c2 = colors.colour2.replace('rgb', 'rgba').replace(')', ', 0.2)');
                return { background: `linear-gradient(to bottom right, ${c1}, ${c2})` };
            }
            return {};
        },

        goToUser(id) {
            window.location.href = '/users/' + id;
        },

        // Delegate to shared helpers
        addCommas: SoumetsuHelpers.addCommas,
        formatAccuracy: SoumetsuHelpers.formatAccuracy,
        escapeHTML: SoumetsuHelpers.escapeHTML,
    },
});

clanApp.mount('#clan-app');
