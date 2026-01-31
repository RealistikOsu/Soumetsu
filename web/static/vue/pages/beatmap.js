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

      // Rank request
      rankRequestStatus: null,
      rankRequestSubmitting: false,
      rankRequestMessage: '',
      rankRequestSuccess: false,
      alreadyRequested: false,

      // Local ranked status from server
      localRankedStatus: null,
    };
  },

  computed: {
    isUnranked() {
      // Use local status if available, fall back to Cheesegull status
      // Local status: 2,3,4,5 = ranked; <=1 = unranked
      if (this.localRankedStatus !== null) {
        return this.localRankedStatus <= 1;
      }
      return this.beatmapSet?.RankedStatus <= 0;
    },
    rankedStatusDisplay() {
      // Display the local ranked status with appropriate styling
      // Status values: -2=Graveyard, -1=WIP, 0=Pending, 1=Need Update, 2=Ranked, 3=Approved, 4=Qualified, 5=Loved
      const status = this.localRankedStatus;
      if (status === null) {
        return null;
      }
      const statusMap = {
        '-2': {
          text: 'Graveyard',
          icon: 'fa-skull',
          class: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        },
        '-1': {
          text: 'WIP',
          icon: 'fa-hammer',
          class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        },
        0: {
          text: 'Pending',
          icon: 'fa-clock',
          class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        },
        1: {
          text: 'Needs Update',
          icon: 'fa-sync',
          class: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        },
        2: {
          text: 'Ranked',
          icon: 'fa-angle-double-up',
          class: 'bg-green-500/20 text-green-400 border-green-500/30',
        },
        3: {
          text: 'Approved',
          icon: 'fa-check',
          class: 'bg-green-500/20 text-green-400 border-green-500/30',
        },
        4: {
          text: 'Qualified',
          icon: 'fa-certificate',
          class: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        },
        5: {
          text: 'Loved',
          icon: 'fa-heart',
          class: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        },
      };
      return (
        statusMap[String(status)] || {
          text: 'Unknown',
          icon: 'fa-question',
          class: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        }
      );
    },
    canRequestRanking() {
      return (
        this.isUnranked &&
        this.rankRequestStatus?.can_submit &&
        !this.rankRequestSubmitting &&
        !this.alreadyRequested
      );
    },
    sortedDifficulties() {
      if (!this.beatmapSet?.ChildrenBeatmaps) {
        return [];
      }
      return [...this.beatmapSet.ChildrenBeatmaps].sort((a, b) => {
        if (a.Mode !== b.Mode) {
          return a.Mode - b.Mode;
        }
        return a.DifficultyRating - b.DifficultyRating;
      });
    },

    audioUrl() {
      if (!this.beatmapSet?.SetID) {
        return '';
      }
      return `https://b.ppy.sh/preview/${this.beatmapSet.SetID}.mp3`;
    },

    coverUrl() {
      if (!this.beatmapSet?.SetID) {
        return '';
      }
      return `https://assets.ppy.sh/beatmaps/${this.beatmapSet.SetID}/covers/cover.jpg`;
    },

    thumbUrl() {
      if (!this.beatmapSet?.SetID) {
        return '';
      }
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
    this.fetchRankRequestStatus();
  },

  methods: {
    async fetchRankRequestStatus() {
      try {
        this.rankRequestStatus = await SoumetsuAPI.beatmaps.rankRequestStatus();
        await this.checkAlreadyRequested();
      } catch (err) {
        console.error('Error fetching rank request status:', err);
      }
    },

    async checkAlreadyRequested() {
      if (!this.beatmapSet?.SetID) return;
      try {
        const result = await SoumetsuAPI.beatmaps.checkRankRequest(this.beatmapSet.SetID);
        this.alreadyRequested = result.requested === true;
      } catch (err) {
        // If endpoint fails, assume not requested
        this.alreadyRequested = false;
      }
    },

    async fetchLocalRankedStatus() {
      if (!this.beatmapSet?.SetID) return;
      try {
        const beatmaps = await SoumetsuAPI.beatmaps.getSetLocal(this.beatmapSet.SetID);
        if (beatmaps && beatmaps.length > 0) {
          // Use the ranked status from the first beatmap in set
          this.localRankedStatus = beatmaps[0].ranked;
        }
      } catch (err) {
        console.error('Error fetching local ranked status:', err);
      }
    },

    async submitRankRequest() {
      if (!this.canRequestRanking) return;

      this.rankRequestSubmitting = true;
      this.rankRequestMessage = '';

      try {
        const url = `https://osu.ppy.sh/beatmapsets/${this.beatmapSet.SetID}`;
        await SoumetsuAPI.beatmaps.submitRankRequest(url);

        this.rankRequestSuccess = true;
        this.rankRequestMessage = 'Request submitted!';
        this.alreadyRequested = true;
        await this.fetchRankRequestStatus();
      } catch (err) {
        this.rankRequestSuccess = false;
        this.rankRequestMessage = err.message || 'Request failed';
      } finally {
        this.rankRequestSubmitting = false;
      }
    },

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

        // Fetch local ranked status
        await this.fetchLocalRankedStatus();

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
      if (this.scoresLoading) {
        return;
      }

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

        // Ensure we have an array and filter out invalid scores
        if (Array.isArray(resp)) {
          this.scores = resp.filter((s) => s && s.player);
        } else {
          this.scores = [];
        }
      } catch (err) {
        console.error('Error loading scores:', err);
        this.scores = [];
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
      if (this.customMode === cm) {
        return;
      }
      this.customMode = cm;
      this.updateURL();
      this.loadScores();
    },

    setMode(m) {
      if (this.mode === m) {
        return;
      }
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
      if (!audio) {
        return;
      }

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
      if (!seconds) {
        return '0:00';
      }
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // Helper: Time since (short format for beatmap page)
    timeSince(timestamp) {
      // Handle Unix timestamp (seconds) or date string
      const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
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

    // Helper: Get difficulty colour class based on star rating
    getDifficultyColor(stars) {
      if (stars < 2) {
        return 'text-green-400';
      }
      if (stars < 2.7) {
        return 'text-sky-400';
      }
      if (stars < 4) {
        return 'text-yellow-400';
      }
      if (stars < 5.3) {
        return 'text-pink-400';
      }
      if (stars < 6.5) {
        return 'text-fuchsia-400';
      }
      if (stars < 8) {
        return 'text-violet-400';
      }
      return 'text-gray-300';
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
