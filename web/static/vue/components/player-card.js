/**
 * Reusable Player Card Component
 *
 * For leaderboard rows, clan members, search results, etc.
 *
 * Props:
 *   - player: Player object with id, username, country, privileges, stats
 *   - rank: Optional rank position to display
 *   - showStats: Whether to show PP/accuracy stats
 *   - variant: 'leaderboard-row' | 'featured' | 'compact' | 'member'
 *   - avatarUrl: Base URL for avatars
 *
 * Events:
 *   - @click: Emitted when card is clicked
 */

const PlayerCardComponent = {
  name: 'PlayerCard',
  props: {
    player: {
      type: Object,
      required: true,
    },
    rank: {
      type: Number,
      default: null,
    },
    showStats: {
      type: Boolean,
      default: true,
    },
    variant: {
      type: String,
      default: 'leaderboard-row',
      validator: (v) => ['leaderboard-row', 'featured', 'compact', 'member'].includes(v),
    },
    avatarUrl: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  computed: {
    playerAvatar() {
      const baseUrl = this.avatarUrl || window.soumetsuConf?.avatars || '';
      return `${baseUrl}/${this.player.id}`;
    },
    playerRole() {
      return SoumetsuHelpers.getPlayerRole(this.player.privileges || 0);
    },
    countryName() {
      return SoumetsuHelpers.getCountryName(this.player.country || 'XX');
    },
    formattedPP() {
      const pp = this.player.stats?.pp || this.player.pp || 0;
      return SoumetsuHelpers.addCommas(Math.round(pp));
    },
    formattedAccuracy() {
      const acc = this.player.stats?.accuracy || this.player.accuracy || 0;
      return SoumetsuHelpers.formatAccuracy(acc);
    },
    formattedPlaycount() {
      const pc = this.player.stats?.playcount || this.player.playcount || 0;
      return SoumetsuHelpers.addCommas(pc);
    },
    cardClass() {
      const base = 'transition-all duration-200';
      switch (this.variant) {
        case 'featured':
          return `${base} bg-dark-card/80 hover:bg-dark-card rounded-xl p-4 border border-dark-border hover:border-primary/50 cursor-pointer`;
        case 'compact':
          return `${base} bg-dark-card/50 hover:bg-dark-card/80 rounded-lg p-2 cursor-pointer`;
        case 'member':
          return `${base} bg-dark-card/50 hover:bg-dark-card rounded-lg p-3 border border-dark-border hover:border-primary/30 cursor-pointer`;
        case 'leaderboard-row':
        default:
          return `${base} bg-dark-card/50 hover:bg-dark-card/80 rounded-lg p-3 border border-dark-border`;
      }
    },
    rankClass() {
      if (!this.rank) {
        return '';
      }
      if (this.rank === 1) {
        return 'text-yellow-400 font-bold';
      }
      if (this.rank === 2) {
        return 'text-gray-300 font-bold';
      }
      if (this.rank === 3) {
        return 'text-orange-400 font-bold';
      }
      return 'text-gray-400';
    },
  },
  methods: {
    handleClick() {
      this.$emit('click', this.player);
    },
    handleAvatarError(event) {
      const img = event.target;
      const currentSrc = img.src;

      if (!currentSrc.endsWith('.png')) {
        img.src = this.playerAvatar + '.png';
        return;
      }

      // Fallback to SVG placeholder
      const svgData = encodeURIComponent(
        `
                <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                    <rect width="64" height="64" fill="#1E293B"/>
                    <circle cx="32" cy="24" r="12" fill="#475569"/>
                    <path d="M16 52C16 44 24 40 32 40C40 40 48 44 48 52V56H16V52Z" fill="#475569"/>
                </svg>
            `.trim()
      );

      img.src = 'data:image/svg+xml,' + svgData;
      img.onerror = null;
    },
    escapeHTML(str) {
      return SoumetsuHelpers.escapeHTML(str);
    },
  },
  template: `
        <div :class="cardClass" @click="handleClick">
            <!-- Featured variant (top 3 leaderboard) -->
            <template v-if="variant === 'featured'">
                <div class="flex flex-col items-center text-center">
                    <div class="relative mb-3">
                        <img :src="playerAvatar"
                            @error="handleAvatarError"
                            class="w-20 h-20 rounded-full border-2 border-dark-border"
                            :alt="player.username">
                        <div v-if="rank" class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-dark-card border-2 border-dark-border flex items-center justify-center">
                            <span :class="rankClass" class="text-sm">#[[ rank ]]</span>
                        </div>
                    </div>
                    <a :href="'/users/' + player.id" class="text-white font-semibold hover:text-primary transition-colors mb-1" @click.stop>
                        [[ escapeHTML(player.username) ]]
                    </a>
                    <div class="flex items-center gap-1 text-gray-400 text-sm mb-2">
                        <img :src="'https://osu.ppy.sh/images/flags/' + player.country + '.png'"
                            class="w-5 h-auto"
                            :alt="player.country"
                            :title="countryName">
                        <span>[[ countryName ]]</span>
                    </div>
                    <div v-if="playerRole" class="mb-2">
                        <span :class="[playerRole.bg, playerRole.color]" class="px-2 py-0.5 rounded-full text-xs font-medium">
                            <i :class="'fas ' + playerRole.icon" class="mr-1"></i>[[ playerRole.name ]]
                        </span>
                    </div>
                    <div v-if="showStats" class="text-primary font-bold text-lg">
                        [[ formattedPP ]]pp
                    </div>
                </div>
            </template>

            <!-- Leaderboard row variant -->
            <template v-else-if="variant === 'leaderboard-row'">
                <div class="flex items-center gap-3">
                    <div v-if="rank !== null" class="w-10 text-center">
                        <span :class="rankClass" class="text-sm">#[[ rank ]]</span>
                    </div>
                    <img :src="playerAvatar"
                        @error="handleAvatarError"
                        class="w-10 h-10 rounded-lg border border-dark-border flex-shrink-0"
                        :alt="player.username">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <a :href="'/users/' + player.id" class="text-white font-medium hover:text-primary transition-colors truncate" @click.stop>
                                [[ escapeHTML(player.username) ]]
                            </a>
                            <img :src="'https://osu.ppy.sh/images/flags/' + player.country + '.png'"
                                class="w-5 h-auto flex-shrink-0"
                                :alt="player.country"
                                :title="countryName">
                            <span v-if="playerRole" :class="[playerRole.bg, playerRole.color]" class="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0">
                                [[ playerRole.name ]]
                            </span>
                        </div>
                    </div>
                    <div v-if="showStats" class="flex items-center gap-4 text-sm">
                        <div class="text-right">
                            <div class="text-primary font-bold">[[ formattedPP ]]pp</div>
                            <div class="text-gray-400 text-xs">[[ formattedAccuracy ]]%</div>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Compact variant -->
            <template v-else-if="variant === 'compact'">
                <div class="flex items-center gap-2">
                    <img :src="playerAvatar"
                        @error="handleAvatarError"
                        class="w-8 h-8 rounded-md border border-dark-border"
                        :alt="player.username">
                    <a :href="'/users/' + player.id" class="text-white text-sm hover:text-primary transition-colors truncate flex-1" @click.stop>
                        [[ escapeHTML(player.username) ]]
                    </a>
                    <img :src="'https://osu.ppy.sh/images/flags/' + player.country + '.png'"
                        class="w-4 h-auto"
                        :alt="player.country">
                </div>
            </template>

            <!-- Member variant (for clan members) -->
            <template v-else-if="variant === 'member'">
                <div class="flex items-center gap-3">
                    <img :src="playerAvatar"
                        @error="handleAvatarError"
                        class="w-12 h-12 rounded-lg border border-dark-border"
                        :alt="player.username">
                    <div class="flex-1 min-w-0">
                        <a :href="'/users/' + player.id" class="text-white font-medium hover:text-primary transition-colors block truncate" @click.stop>
                            [[ escapeHTML(player.username) ]]
                        </a>
                        <div class="flex items-center gap-2 text-sm text-gray-400">
                            <img :src="'https://osu.ppy.sh/images/flags/' + player.country + '.png'"
                                class="w-4 h-auto"
                                :alt="player.country">
                            <span v-if="playerRole" :class="playerRole.color" class="text-xs">
                                [[ playerRole.name ]]
                            </span>
                        </div>
                    </div>
                    <div v-if="showStats" class="text-right">
                        <div class="text-primary font-semibold text-sm">[[ formattedPP ]]pp</div>
                    </div>
                </div>
            </template>
        </div>
    `,
};

// Export component
window.PlayerCardComponent = PlayerCardComponent;
