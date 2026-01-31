const beatmapSearchApp = Soumetsu.createApp({
  data() {
    return {
      // Search state
      searchQuery: '',
      selectedMode: '',
      selectedStatus: '1',

      // Results
      beatmaps: [],
      offset: 0,
      amount: 20,

      // UI state
      loading: false,
      hasMore: true,

      // Audio state
      beatmapAudios: [],
      currentlyPlaying: null,
      beatmapTimer: null,

      // Constants
      mirror_api: 'https://catboy.best/api',
      statusMap: {
        '-2': 'Graveyard',
        '-1': 'WIP',
        0: 'Pending',
        1: 'Ranked',
        3: 'Qualified',
        4: 'Loved',
      },
      statusColors: {
        1: 'bg-green-500/20 border-green-500/50 text-green-400',
        3: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
        4: 'bg-pink-500/20 border-pink-500/50 text-pink-400',
        0: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
        '-1': 'bg-orange-500/20 border-orange-500/50 text-orange-400',
        '-2': 'bg-gray-500/20 border-gray-500/50 text-gray-400',
      },
      difficultyColors: {
        '138, 174, 23': [0.0, 1.99], // Green Easy
        '154, 212, 223': [2.0, 2.69], // Blue Normal
        '222, 179, 42': [2.7, 3.99], // Yellow Hard
        '235, 105, 164': [4.0, 5.29], // Pink Insane
        '114, 100, 181': [5.3, 6.49], // Purple Expert
        '5, 5, 5': [6.5, Infinity], // Black Expert+
      },
      modeNames: ['osu', 'taiko', 'fruits', 'mania'],
    };
  },

  created() {
    // Initial search on page load
    this.searchBeatmaps(true);
    this.setupScrollListener();
  },

  methods: {
    async searchBeatmaps(reset = true) {
      if (reset) {
        this.offset = 0;
        this.beatmaps = [];
        this.hasMore = true;
      }

      this.loading = true;

      try {
        let url = `${this.mirror_api}/search?offset=${this.offset}&amount=${this.amount}&query=${encodeURIComponent(this.searchQuery)}`;

        if (this.selectedMode !== '' && this.selectedMode !== 'NaN') {
          url += `&mode=${this.selectedMode}`;
        }

        if (this.selectedStatus !== 'NaN') {
          url += `&status=${this.selectedStatus}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (reset) {
          this.beatmaps = [];
        }

        if (data && data.length > 0) {
          this.beatmaps.push(...data);
          this.offset += data.length;
          this.hasMore = data.length === this.amount;
        } else {
          this.hasMore = false;
        }
      } catch (error) {
        console.error('Error searching beatmaps:', error);
      } finally {
        this.loading = false;
      }
    },

    setupScrollListener() {
      let searchDebounce;
      window.addEventListener('scroll', () => {
        if (this.loading || !this.hasMore) {
          return;
        }

        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
          clearTimeout(searchDebounce);
          searchDebounce = setTimeout(() => {
            this.searchBeatmaps(false);
          }, 200);
        }
      });
    },

    selectMode(mode) {
      this.selectedMode = mode;
      this.searchBeatmaps();
    },

    selectStatus(status) {
      this.selectedStatus = status;
      this.searchBeatmaps();
    },

    getDifficultyColor(sr) {
      for (const color in this.difficultyColors) {
        const [min, max] = this.difficultyColors[color];
        if (sr >= min && sr <= max) {
          return color;
        }
      }
      return '5, 5, 5';
    },

    getStatusInfo(status) {
      return {
        name: this.statusMap[status] || 'Unknown',
        color: this.statusColors[status] || 'bg-gray-500/20 border-gray-500/50 text-gray-400',
      };
    },

    sortDifficulties(diffs) {
      return [...diffs].sort((a, b) => a.DifficultyRating - b.DifficultyRating);
    },

    async togglePlayback(setId, event) {
      // Stop all other playing beatmaps
      if (this.currentlyPlaying && this.currentlyPlaying !== setId) {
        await this.stopPlayback(this.currentlyPlaying);
      }

      // Find or create audio
      let audioObj = this.beatmapAudios.find((a) => a.id === setId);
      if (!audioObj) {
        const audio = new Audio(`https://b.ppy.sh/preview/${setId}.mp3`);
        audio.volume = 0.2;
        audioObj = { id: setId, audio: audio, playing: false };
        this.beatmapAudios.push(audioObj);
      }

      if (audioObj.playing) {
        await this.stopPlayback(setId);
      } else {
        await this.startPlayback(setId, audioObj, event);
      }
    },

    async startPlayback(setId, audioObj, event) {
      try {
        audioObj.audio.currentTime = 0;
        await audioObj.audio.play();
        audioObj.playing = true;
        this.currentlyPlaying = setId;

        // Update play button
        if (event && event.target) {
          event.target.innerHTML = '<i class="fas fa-stop text-white text-2xl"></i>';
        }

        // Add playing class to card
        const card = event?.target?.closest('.beatmap-card-compact');
        if (card) {
          card.classList.add('musicPlaying');
        }

        // Progress tracking
        if (this.beatmapTimer) {
          clearInterval(this.beatmapTimer);
        }
        this.beatmapTimer = setInterval(() => {
          if (!audioObj.playing || !audioObj.audio) {
            clearInterval(this.beatmapTimer);
            return;
          }

          if (audioObj.audio.duration) {
            const played = (audioObj.audio.currentTime / audioObj.audio.duration) * 100;
            if (card) {
              card.style.setProperty('--progress', played + '%');
            }
          }

          if (audioObj.audio.ended) {
            this.stopPlayback(setId);
          }
        }, 100);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    },

    async stopPlayback(setId) {
      const audioObj = this.beatmapAudios.find((a) => a.id === setId);
      if (audioObj) {
        audioObj.audio.pause();
        audioObj.audio.currentTime = 0;
        audioObj.playing = false;
      }

      if (this.currentlyPlaying === setId) {
        this.currentlyPlaying = null;
      }

      // Remove playing class from all cards
      document.querySelectorAll('.musicPlaying').forEach((card) => {
        card.classList.remove('musicPlaying');
      });

      // Reset play buttons
      document.querySelectorAll('.beatmapPlay').forEach((btn) => {
        btn.innerHTML = '<i class="fas fa-play text-white text-2xl"></i>';
      });

      if (this.beatmapTimer) {
        clearInterval(this.beatmapTimer);
        this.beatmapTimer = null;
      }
    },

    onSearchInput() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.searchBeatmaps();
      }, 800);
    },
  },
});

beatmapSearchApp.mount('#beatmap-search-app');
