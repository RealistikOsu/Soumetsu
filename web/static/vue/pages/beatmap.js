const beatmapApp = Vue.createApp({
    compilerOptions: {
        delimiters: ["<%", "%>"]
    },
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

            // Mode/Relax selection
            mode: 0,
            relax: 0,

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
        this.relax = parseInt(params.get('rx')) || 0;

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
                const sortField = this.relax === 0 ? 'score,desc' : 'pp,desc';

                const resp = await SoumetsuAPI.beatmaps.getScores(
                    this.selectedDiff.BeatmapID,
                    this.mode,
                    this.relax,
                    1,
                    50,
                    sortField
                );

                this.scores = resp.scores || [];
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

        setRelax(rx) {
            if (this.relax === rx) {return;}
            this.relax = rx;
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
            url.searchParams.set('rx', this.relax);
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

        // Helper: Format time in mm:ss
        timeFormat(seconds) {
            if (!seconds) {return '0:00';}
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
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

        // Helper: Time since (relative)
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

        // Helper: Get score mods as array
        getScoreMods(n) {
            const modsObj = {
                "NF": 1, "EZ": 2, "TD": 4, "HD": 8, "HR": 16,
                "SD": 32, "DT": 64, "RX": 128, "HT": 256,
                "NC": 512, "FL": 1024, "AU": 2048, "AP": 8192,
                "PF": 16384, "SO": 4096, "K4": 32768, "K5": 65536,
                "K6": 131072, "K7": 262144, "K8": 524288, "FI": 1048576,
                "RN": 2097152, "LM": 4194304, "K9": 16777216, "K1": 33554432,
                "K3": 67108864, "K2": 134217728, "S2": 536870912, "MR": 1073741824
            };

            const mods = { ...modsObj };
            const playmods = [];

            // NC includes DT
            if (n & mods.NC) {
                playmods.push("NC");
                mods.NC = 0;
                mods.DT = 0;
            } else if (n & mods.DT) {
                playmods.push("DT");
                mods.NC = 0;
                mods.DT = 0;
            }

            // PF includes SD
            if (n & mods.PF) {
                playmods.push("PF");
                mods.PF = 0;
                mods.SD = 0;
            } else if (n & mods.SD) {
                playmods.push("SD");
                mods.PF = 0;
                mods.SD = 0;
            }

            for (const [mod, value] of Object.entries(mods)) {
                if (value !== 0 && (n & value)) {
                    playmods.push(mod);
                }
            }

            return playmods;
        },

        // Helper: Get rank letter from score
        getRank(gameMode, mods, acc, c300, c100, c50, cmiss) {
            const total = c300 + c100 + c50 + cmiss;
            const hdfl = (mods & 1049608) > 0; // HD | FL | FI

            const ss = hdfl ? "SS+" : "SS";
            const s = hdfl ? "S+" : "S";

            switch (gameMode) {
                case 0:
                case 1: {
                    const ratio300 = c300 / total;
                    const ratio50 = c50 / total;

                    if (ratio300 === 1) {return ss;}
                    if (ratio300 > 0.9 && ratio50 <= 0.01 && cmiss === 0) {return s;}
                    if ((ratio300 > 0.8 && cmiss === 0) || ratio300 > 0.9) {return "A";}
                    if ((ratio300 > 0.7 && cmiss === 0) || ratio300 > 0.8) {return "B";}
                    if (ratio300 > 0.6) {return "C";}
                    return "D";
                }
                case 2: {
                    if (acc === 100) {return ss;}
                    if (acc > 98) {return s;}
                    if (acc > 94) {return "A";}
                    if (acc > 90) {return "B";}
                    if (acc > 85) {return "C";}
                    return "D";
                }
                case 3: {
                    if (acc === 100) {return ss;}
                    if (acc > 95) {return s;}
                    if (acc > 90) {return "A";}
                    if (acc > 80) {return "B";}
                    if (acc > 70) {return "C";}
                    return "D";
                }
                default:
                    return "D";
            }
        },

        // Helper: Get rank CSS class
        getRankClass(rank) {
            return `rank-${rank.toLowerCase().replace('+', 'h')}`;
        },

        // Mode name
        modeName(m) {
            return ['Standard', 'Taiko', 'Catch', 'Mania'][m] || 'Unknown';
        },

        // Escape HTML
        escapeHTML(str) {
            if (!str) {return '';}
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },
    },
});

beatmapApp.mount('#beatmap-app');
