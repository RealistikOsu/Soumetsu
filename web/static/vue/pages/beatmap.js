const beatmapApp = Soumetsu.createApp({
    data() {
        return {
            // Beatmap data
            beatmap: null,
            beatmapSet: null,
            selectedDiff: null,

            // Scores
            scores: [],
            scoresLoading: false,

            // UI state
            loading: true,
            error: null,
            showDiffDropdown: false,

            // Mode/CustomMode selection
            mode: 0,
            customMode: 0,

            // Audio
            isPlaying: false,

            // Config
            beatmapId: window.beatmapId || 0,
            currentUserID: window.currentUserID || 0,
        };
    },

    computed: {
        sortedDifficulties() {
            if (!this.beatmapSet?.ChildrenBeatmaps) {return [];}
            return [...this.beatmapSet.ChildrenBeatmaps].sort((a, b) => {
                if (a.Mode !== b.Mode) {return a.Mode - b.Mode;}
                return a.DifficultyRating - b.DifficultyRating;
            });
        },

        audioUrl() {
            if (!this.beatmapSet?.SetID) {return '';}
            return `https://b.ppy.sh/preview/${this.beatmapSet.SetID}.mp3`;
        },

        coverUrl() {
            if (!this.beatmapSet?.SetID) {return '';}
            return `https://assets.ppy.sh/beatmaps/${this.beatmapSet.SetID}/covers/cover.jpg`;
        },

        thumbUrl() {
            if (!this.beatmapSet?.SetID) {return '';}
            return `https://b.ppy.sh/thumb/${this.beatmapSet.SetID}l.jpg`;
        },

        // Check if mode menu should be shown (only for std mode maps)
        showModeMenu() {
            return this.selectedDiff?.Mode === 0;
        },
    },

    async created() {
        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        this.mode = parseInt(params.get('mode')) || 0;
        this.customMode = parseInt(params.get('cm')) || 0;

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.diff-dropdown-container')) {
                this.showDiffDropdown = false;
            }
        });

        await this.loadBeatmapData();
    },

    methods: {
        async loadBeatmapData() {
            this.loading = true;
            this.error = null;

            try {
                // Fetch beatmap from Cheesegull API
                this.beatmap = await SoumetsuAPI.beatmaps.get(this.beatmapId);

                if (!this.beatmap?.ParentSetID) {
                    this.error = 'Beatmap not found';
                    this.loading = false;
                    return;
                }

                // Fetch beatmap set
                this.beatmapSet = await SoumetsuAPI.beatmaps.getSet(this.beatmap.ParentSetID);

                if (!this.beatmapSet?.SetID) {
                    this.error = 'Beatmap set not found';
                    this.loading = false;
                    return;
                }

                // Set the selected difficulty
                this.selectedDiff = this.beatmap;

                // Update page title
                document.title = `${this.beatmapSet.Artist} - ${this.beatmapSet.Title} :: RealistikOsu!`;

                // Load scores
                await this.loadScores();

            } catch (err) {
                console.error('Error loading beatmap:', err);
                this.error = 'Failed to load beatmap data';
            }

            this.loading = false;
        },

        async loadScores() {
            if (this.scoresLoading) {return;}

            this.scoresLoading = true;
            this.scores = [];

            try {
                // Use score sort for vanilla, pp sort for relax/autopilot
                const sortField = this.customMode === 0 ? 'score,desc' : 'pp,desc';

                const resp = await SoumetsuAPI.beatmaps.getScores(
                    this.selectedDiff.BeatmapID,
                    this.mode,
                    this.customMode,
                    1,
                    50,
                    sortField
                );

                this.scores = resp || [];
            } catch (err) {
                console.error('Error loading scores:', err);
            }

            this.scoresLoading = false;
        },

        selectDifficulty(diff) {
            this.selectedDiff = diff;
            this.mode = diff.Mode;
            this.showDiffDropdown = false;
            this.updateURL();
            this.loadScores();
        },

        setCustomMode(cm) {
            if (this.customMode === cm) {return;}
            this.customMode = cm;
            this.updateURL();
            this.loadScores();
        },

        setMode(m) {
            if (this.mode === m) {return;}
            this.mode = m;
            this.updateURL();
            this.loadScores();
        },

        updateURL() {
            const url = new URL(window.location.href);
            url.pathname = `/beatmaps/${this.selectedDiff.BeatmapID}`;
            url.searchParams.set('mode', this.mode);
            url.searchParams.set('cm', this.customMode);
            window.history.replaceState({}, '', url);
        },

        toggleAudio() {
            const audio = this.$refs.audio;
            if (!audio) {return;}

            if (this.isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }
        },

        onAudioPlay() {
            this.isPlaying = true;
        },

        onAudioPause() {
            this.isPlaying = false;
        },

        onAudioEnded() {
            this.isPlaying = false;
        },

        // Helper: Format time in mm:ss (beatmap-specific, keep local)
        timeFormat(seconds) {
            if (!seconds) { return '0:00'; }
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },

        // Helper: Time since (short format for beatmap page)
        timeSince(dateStr) {
            const date = new Date(dateStr);
            const seconds = Math.floor((new Date() - date) / 1000);

            const intervals = [
                { value: 31536000, label: 'y' },
                { value: 2592000, label: 'mo' },
                { value: 86400, label: 'd' },
                { value: 3600, label: 'h' },
                { value: 60, label: 'min' },
            ];

            for (const interval of intervals) {
                const count = Math.floor(seconds / interval.value);
                if (count >= 1) {
                    return `${count}${interval.label}`;
                }
            }
            return 'now';
        },

        // Helper: Get score mods as array (uses extended mods for mania)
        getScoreMods(n) {
            return SoumetsuGameHelpers.getScoreModsArray(n, true);
        },

        // Delegate to shared helpers
        addCommas: SoumetsuHelpers.addCommas,
        formatAccuracy: SoumetsuHelpers.formatAccuracy,
        escapeHTML: SoumetsuHelpers.escapeHTML,

        // Delegate to shared game helpers
        getRank: SoumetsuGameHelpers.getRank,
        getRankClass: SoumetsuGameHelpers.getRankClass,
        modeName: SoumetsuGameHelpers.getModeName,
    },
});

beatmapApp.mount('#beatmap-app');
