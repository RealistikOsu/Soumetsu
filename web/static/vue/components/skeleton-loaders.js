/**
 * Skeleton Loader Components
 *
 * Animated placeholder components shown while content is loading.
 * Used across leaderboards, comments, achievements, and player cards.
 */

/**
 * Table Row Skeleton
 * For leaderboard tables and similar list views
 */
const TableRowSkeletonComponent = {
    name: 'TableRowSkeleton',
    props: {
        count: {
            type: Number,
            default: 5
        },
        showRank: {
            type: Boolean,
            default: true
        },
        showStats: {
            type: Boolean,
            default: true
        }
    },
    template: `
        <div class="space-y-2">
            <div v-for="i in count" :key="i"
                class="bg-dark-card/50 rounded-lg p-3 border border-dark-border animate-pulse">
                <div class="flex items-center gap-3">
                    <div v-if="showRank" class="w-10 h-5 bg-dark-border rounded"></div>
                    <div class="w-10 h-10 rounded-lg bg-dark-border"></div>
                    <div class="flex-1 min-w-0 space-y-2">
                        <div class="h-4 bg-dark-border rounded w-1/3"></div>
                        <div class="h-3 bg-dark-border rounded w-1/4"></div>
                    </div>
                    <div v-if="showStats" class="flex-shrink-0 space-y-2 text-right">
                        <div class="h-5 bg-dark-border rounded w-16 ml-auto"></div>
                        <div class="h-3 bg-dark-border rounded w-12 ml-auto"></div>
                    </div>
                </div>
            </div>
        </div>
    `
};

/**
 * Player Card Skeleton
 * For featured player cards (top 3 leaderboard)
 */
const PlayerCardSkeletonComponent = {
    name: 'PlayerCardSkeleton',
    props: {
        count: {
            type: Number,
            default: 3
        },
        variant: {
            type: String,
            default: 'featured',
            validator: (v) => ['featured', 'compact', 'member'].includes(v)
        }
    },
    computed: {
        containerClass() {
            switch (this.variant) {
                case 'featured':
                    return 'bg-dark-card/80 rounded-xl p-4 border border-dark-border animate-pulse';
                case 'compact':
                    return 'bg-dark-card/50 rounded-lg p-2 animate-pulse';
                case 'member':
                    return 'bg-dark-card/50 rounded-lg p-3 border border-dark-border animate-pulse';
                default:
                    return 'bg-dark-card/50 rounded-lg p-3 animate-pulse';
            }
        }
    },
    template: `
        <div class="space-y-3">
            <!-- Featured variant -->
            <template v-if="variant === 'featured'">
                <div v-for="i in count" :key="i" :class="containerClass">
                    <div class="flex flex-col items-center">
                        <div class="w-20 h-20 rounded-full bg-dark-border mb-3"></div>
                        <div class="h-5 bg-dark-border rounded w-24 mb-2"></div>
                        <div class="h-4 bg-dark-border rounded w-16 mb-2"></div>
                        <div class="h-6 bg-dark-border rounded w-20"></div>
                    </div>
                </div>
            </template>

            <!-- Compact variant -->
            <template v-else-if="variant === 'compact'">
                <div v-for="i in count" :key="i" :class="containerClass">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-md bg-dark-border"></div>
                        <div class="h-4 bg-dark-border rounded w-20 flex-1"></div>
                        <div class="w-4 h-3 bg-dark-border rounded"></div>
                    </div>
                </div>
            </template>

            <!-- Member variant -->
            <template v-else-if="variant === 'member'">
                <div v-for="i in count" :key="i" :class="containerClass">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-lg bg-dark-border"></div>
                        <div class="flex-1 space-y-2">
                            <div class="h-4 bg-dark-border rounded w-1/2"></div>
                            <div class="h-3 bg-dark-border rounded w-1/4"></div>
                        </div>
                        <div class="h-5 bg-dark-border rounded w-16"></div>
                    </div>
                </div>
            </template>
        </div>
    `
};

/**
 * Comment Skeleton
 * For profile comments section
 */
const CommentSkeletonComponent = {
    name: 'CommentSkeleton',
    props: {
        count: {
            type: Number,
            default: 3
        }
    },
    template: `
        <div class="space-y-4">
            <div v-for="i in count" :key="i"
                class="bg-dark-card/50 rounded-lg p-4 border border-dark-border animate-pulse">
                <div class="flex gap-3">
                    <div class="w-10 h-10 rounded-full bg-dark-border flex-shrink-0"></div>
                    <div class="flex-1 space-y-3">
                        <div class="flex items-center gap-2">
                            <div class="h-4 bg-dark-border rounded w-24"></div>
                            <div class="h-3 bg-dark-border rounded w-16"></div>
                        </div>
                        <div class="space-y-2">
                            <div class="h-3 bg-dark-border rounded w-full"></div>
                            <div class="h-3 bg-dark-border rounded w-3/4"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

/**
 * Achievement Skeleton
 * For achievements grid on profile
 */
const AchievementSkeletonComponent = {
    name: 'AchievementSkeleton',
    props: {
        count: {
            type: Number,
            default: 8
        }
    },
    template: `
        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            <div v-for="i in count" :key="i"
                class="aspect-square rounded-lg bg-dark-border animate-pulse">
            </div>
        </div>
    `
};

/**
 * Stats Card Skeleton
 * For statistics cards
 */
const StatsCardSkeletonComponent = {
    name: 'StatsCardSkeleton',
    props: {
        count: {
            type: Number,
            default: 4
        }
    },
    template: `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="i in count" :key="i"
                class="bg-dark-card/50 rounded-lg p-4 border border-dark-border animate-pulse">
                <div class="h-3 bg-dark-border rounded w-1/2 mb-2"></div>
                <div class="h-6 bg-dark-border rounded w-3/4"></div>
            </div>
        </div>
    `
};

/**
 * Beatmap Card Skeleton
 * For beatmap listings
 */
const BeatmapCardSkeletonComponent = {
    name: 'BeatmapCardSkeleton',
    props: {
        count: {
            type: Number,
            default: 3
        }
    },
    template: `
        <div class="space-y-3">
            <div v-for="i in count" :key="i"
                class="bg-dark-card/50 rounded-lg overflow-hidden border border-dark-border animate-pulse">
                <div class="flex">
                    <div class="w-24 h-20 bg-dark-border flex-shrink-0"></div>
                    <div class="flex-1 p-3 space-y-2">
                        <div class="h-4 bg-dark-border rounded w-3/4"></div>
                        <div class="h-3 bg-dark-border rounded w-1/2"></div>
                        <div class="flex gap-2">
                            <div class="h-3 bg-dark-border rounded w-12"></div>
                            <div class="h-3 bg-dark-border rounded w-12"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

// Export all skeleton components
window.SkeletonComponents = {
    TableRowSkeleton: TableRowSkeletonComponent,
    PlayerCardSkeleton: PlayerCardSkeletonComponent,
    CommentSkeleton: CommentSkeletonComponent,
    AchievementSkeleton: AchievementSkeletonComponent,
    StatsCardSkeleton: StatsCardSkeletonComponent,
    BeatmapCardSkeleton: BeatmapCardSkeletonComponent
};

// Also export individually for direct access
window.TableRowSkeletonComponent = TableRowSkeletonComponent;
window.PlayerCardSkeletonComponent = PlayerCardSkeletonComponent;
window.CommentSkeletonComponent = CommentSkeletonComponent;
window.AchievementSkeletonComponent = AchievementSkeletonComponent;
window.StatsCardSkeletonComponent = StatsCardSkeletonComponent;
window.BeatmapCardSkeletonComponent = BeatmapCardSkeletonComponent;
