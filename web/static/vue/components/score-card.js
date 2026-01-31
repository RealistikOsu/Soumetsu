/**
 * Reusable Score Card Component
 *
 * Props:
 *   - score: Score object with beatmap, pp, accuracy, mods, etc.
 *   - mode: Game mode (0-3)
 *   - variant: 'default' | 'failed' | 'first' | 'pinned'
 *   - showPinButton: Boolean to show pin button
 *   - showTrophy: Boolean to show trophy icon (for first places)
 *
 * Events:
 *   - @click: Emitted when card is clicked
 *   - @pin: Emitted when pin button is clicked
 */

const ScoreCardComponent = {
  name: 'ScoreCard',
  props: {
    score: {
      type: Object,
      required: true,
    },
    mode: {
      type: Number,
      default: 0,
    },
    variant: {
      type: String,
      default: 'default',
      validator: (v) => ['default', 'failed', 'first', 'pinned'].includes(v),
    },
    showPinButton: {
      type: Boolean,
      default: false,
    },
    showTrophy: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click', 'pin'],
  computed: {
    cardClass() {
      const base =
        'score-card-compact group relative rounded-lg overflow-hidden cursor-pointer border transition-all duration-200';
      switch (this.variant) {
        case 'failed':
          return `${base} border-red-500/30 hover:border-red-500/50`;
        case 'first':
          return `${base} border-yellow-500/30 hover:border-yellow-500/50`;
        default:
          return `${base} border-dark-border hover:border-primary/50`;
      }
    },
    overlayClass() {
      const base = 'score-card-overlay-compact';
      switch (this.variant) {
        case 'failed':
          return `${base} score-card-overlay-failed`;
        case 'first':
          return `${base} score-card-overlay-first`;
        default:
          return base;
      }
    },
    backgroundStyle() {
      const beatmapsetId = this.score.beatmap?.beatmapset_id;
      if (!beatmapsetId) return {};
      return {
        backgroundImage: `url(https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover.jpg)`,
      };
    },
    rankGrade() {
      return this.getRank(
        this.mode,
        this.score.mods,
        this.score.accuracy,
        this.score.count_300,
        this.score.count_100,
        this.score.count_50,
        this.score.count_misses,
        this.score.completed
      );
    },
    rankClass() {
      const grade = this.rankGrade.toLowerCase().replace('+', 'h');
      return `rank-badge-compact flex-shrink-0 rank-${grade}`;
    },
  },
  methods: {
    // Delegate to shared game helpers
    getRank(mode, mods, acc, c300, c100, c50, cmiss, completed) {
      return SoumetsuGameHelpers.getRank(mode, mods, acc, c300, c100, c50, cmiss, completed);
    },
    getScoreMods(mods) {
      return SoumetsuGameHelpers.getScoreMods(mods);
    },

    // Delegate to shared helpers
    addCommas(num) {
      return SoumetsuHelpers.addCommas(num);
    },
    formatAccuracy(acc) {
      return SoumetsuHelpers.formatAccuracy(acc);
    },
    timeAgo(dateStr) {
      return SoumetsuHelpers.timeAgo(dateStr);
    },
    ppOrScore(pp, score, ranked) {
      return SoumetsuHelpers.ppOrScore(pp, score, ranked);
    },
    escapeHTML(str) {
      return SoumetsuHelpers.escapeHTML(str);
    },

    handleClick() {
      this.$emit('click', this.score);
    },
    handlePin(e) {
      e.stopPropagation();
      this.$emit('pin', this.score);
    },
  },
  template: `
        <div :class="cardClass" @click="handleClick">
            <div class="score-card-bg" :style="backgroundStyle"></div>
            <div :class="overlayClass"></div>
            <div class="relative p-3 flex items-center gap-3">
                <div v-if="showTrophy" class="absolute top-2 right-2">
                    <i class="fas fa-trophy text-yellow-400 text-sm"></i>
                </div>
                <div :class="rankClass">
                    [[ rankGrade ]]
                </div>
                <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                    <p class="text-white font-medium text-sm truncate leading-tight">
                        <a :href="'/b/' + score.beatmap.beatmap_id"
                            class="hover:text-primary transition-colors" @click.stop>
                            [[ escapeHTML(score.beatmap.song_name) ]]
                        </a>
                    </p>
                    <div class="flex items-center gap-2 text-xs text-gray-300">
                        <span>[[ addCommas(score.score) ]]</span>
                        <span class="text-gray-500">•</span>
                        <span>[[ addCommas(score.max_combo) ]]x</span>
                        <span class="text-gray-500">•</span>
                        <span class="font-medium text-gray-200">[[ getScoreMods(score.mods) ]]</span>
                    </div>
                    <p class="text-gray-400 text-xs">
                        [[ timeAgo(score.submitted_at) ]]
                    </p>
                </div>
                <div class="flex-shrink-0 text-right flex flex-col justify-center gap-1">
                    <div class="text-primary font-bold text-base leading-none">
                        [[ ppOrScore(score.pp, score.score, score.beatmap.ranked) ]]
                    </div>
                    <div class="text-gray-300 text-xs font-medium">
                        [[ formatAccuracy(score.accuracy) ]]%
                    </div>
                </div>
                <div v-if="showPinButton" class="flex-shrink-0 ml-1">
                    <button @click="handlePin"
                        class="text-gray-400 hover:text-yellow-400 p-1.5 rounded transition-colors"
                        title="Pin Score"
                        aria-label="Pin this score">
                        <i class="fas fa-thumbtack text-sm"></i>
                    </button>
                </div>
            </div>
        </div>
    `,
};

/**
 * Score Card Skeleton Loader Component
 * Shows animated placeholder while scores are loading
 */
const ScoreCardSkeletonComponent = {
  name: 'ScoreCardSkeleton',
  props: {
    count: {
      type: Number,
      default: 3,
    },
  },
  template: `
        <div class="space-y-2">
            <div v-for="i in count" :key="i"
                class="score-card-compact rounded-lg border border-dark-border bg-dark-card animate-pulse">
                <div class="p-3 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-dark-border"></div>
                    <div class="flex-1 min-w-0 space-y-2">
                        <div class="h-4 bg-dark-border rounded w-3/4"></div>
                        <div class="h-3 bg-dark-border rounded w-1/2"></div>
                        <div class="h-3 bg-dark-border rounded w-1/4"></div>
                    </div>
                    <div class="flex-shrink-0 text-right space-y-2">
                        <div class="h-5 bg-dark-border rounded w-16"></div>
                        <div class="h-3 bg-dark-border rounded w-12"></div>
                    </div>
                </div>
            </div>
        </div>
    `,
};

/**
 * Score Section Component
 * Wraps score cards with header, skeleton loading, empty state, and load more button
 */
const ScoreSectionComponent = {
  name: 'ScoreSection',
  components: {
    'score-card': ScoreCardComponent,
    'score-card-skeleton': ScoreCardSkeletonComponent,
  },
  props: {
    title: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: 'fa-music',
    },
    iconColor: {
      type: String,
      default: 'text-primary',
    },
    scores: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    hasMore: {
      type: Boolean,
      default: false,
    },
    total: {
      type: Number,
      default: null,
    },
    mode: {
      type: Number,
      default: 0,
    },
    variant: {
      type: String,
      default: 'default',
    },
    showPinButton: {
      type: Boolean,
      default: false,
    },
    showTrophy: {
      type: Boolean,
      default: false,
    },
    emptyMessage: {
      type: String,
      default: 'No scores have been found',
    },
    skeletonCount: {
      type: Number,
      default: 3,
    },
    headerExtra: {
      type: String,
      default: null,
    },
  },
  emits: ['load-more', 'score-click', 'score-pin'],
  computed: {
    showEmpty() {
      return this.scores.length === 0 && !this.loading;
    },
    showScores() {
      return this.scores.length > 0 || this.loading;
    },
    showLoadMore() {
      return this.hasMore && this.scores.length > 0;
    },
    titleWithTotal() {
      if (this.total !== null && this.total > 0) {
        return `${this.title} (${this.total})`;
      }
      return this.title;
    },
  },
  methods: {
    getScoreVariant(score) {
      if (this.variant === 'first') return 'first';
      if (score.completed < 2) return 'failed';
      return 'default';
    },
  },
  template: `
        <div class="card" :data-section="title.toLowerCase().replace(/\\s+/g, '-')">
            <div class="flex items-center gap-3 mb-4 pb-4 border-b border-dark-border">
                <i :class="'fas ' + icon + ' ' + iconColor"></i>
                <h3 class="text-xl font-display font-bold text-white">[[ titleWithTotal ]]</h3>
                <slot name="header-extra"></slot>
            </div>

            <!-- Skeleton Loading State -->
            <score-card-skeleton v-if="loading && scores.length === 0" :count="skeletonCount" />

            <!-- Empty State -->
            <div v-else-if="showEmpty" class="py-8 text-center">
                <i class="fas fa-inbox text-gray-500 text-4xl mb-4"></i>
                <p class="text-gray-400">[[ emptyMessage ]]</p>
            </div>

            <!-- Score List -->
            <div v-else class="space-y-2">
                <score-card
                    v-for="score in scores"
                    :key="score.id"
                    :score="score"
                    :mode="mode"
                    :variant="getScoreVariant(score)"
                    :show-pin-button="showPinButton && score.completed >= 2"
                    :show-trophy="showTrophy"
                    @click="$emit('score-click', $event)"
                    @pin="$emit('score-pin', $event)"
                />
            </div>

            <!-- Load More Button -->
            <div v-if="showLoadMore" class="mt-4 text-center">
                <button @click="$emit('load-more')" :disabled="loading" class="btn-secondary">
                    <span v-if="loading"><i class="fas fa-spinner fa-spin mr-2"></i></span>
                    Load more
                </button>
            </div>
        </div>
    `,
};

// Export components for use
window.ScoreCardComponent = ScoreCardComponent;
window.ScoreCardSkeletonComponent = ScoreCardSkeletonComponent;
window.ScoreSectionComponent = ScoreSectionComponent;
