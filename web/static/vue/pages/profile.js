new Vue({
    el: "#profile-app",
    delimiters: ["<%", "%>"],
    filters: {
        badgeIcon(icon) {
            if (!icon) {
                return 'fas fa-question';
            }
            
            // Convert to string and trim
            icon = String(icon).trim();
            
            // If it already has a Font Awesome class prefix (fas, far, fab, etc.), return as is
            if (/^(fas|far|fal|fad|fab|fak)\s+fa-/.test(icon)) {
                return icon;
            }
            
            // Handle cases like "purple fa-star", "yellow fa-heart", "red gift", etc.
            // Extract the icon name part (usually after a space or color word)
            // Look for patterns like: "color fa-iconname" or "color iconname"
            const parts = icon.split(/\s+/);
            let iconPart = icon;
            
            // If there are multiple parts, try to find the one that looks like an icon name
            if (parts.length > 1) {
                // Look for parts that start with "fa-" or are common icon names
                const iconParts = parts.filter(p => 
                    p.startsWith('fa-') || 
                    ['star', 'heart', 'gift', 'desktop', 'beer', 'trophy', 'medal', 'crown'].includes(p.toLowerCase())
                );
                if (iconParts.length > 0) {
                    iconPart = iconParts[0];
                } else {
                    // Take the last part as it's likely the icon name
                    iconPart = parts[parts.length - 1];
                }
            }
            
            // If it starts with "fa-" but no prefix, add "fas"
            if (iconPart.startsWith('fa-')) {
                return 'fas ' + iconPart;
            }
            
            // Handle Font Awesome Unicode values (like "f005", "F005", "\uf005")
            if (/^[fF][0-9a-fA-F]{3}$/.test(iconPart) || /^\\?u?[fF][0-9a-fA-F]{3}$/.test(iconPart)) {
                return 'fas fa-question';
            }
            
            // If it's just the icon name (like "plane", "star", "beer", etc.), add both "fas" and "fa-" prefix
            // Sanitize to only allow alphanumeric and hyphens
            const iconName = iconPart.replace(/^fa-/, '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
            
            if (!iconName) {
                return 'fas fa-question';
            }
            
            return 'fas fa-' + iconName;
        }
    },
    data() {
        return {
            // User data
            user: null,
            userpage: null,
            followers: { subscount: 0, allFriended: 0 },
            discordUser: null,
            commentsInfo: null,
            
            // UI state
            loading: true,
            error: null,
            mode: 0,
            relax: 0,
            
            // Graph
            graphType: 'rank',
            graphData: null,
            chart: null,
            
            // Scores
            scores: {
                pinned: { data: [], page: 0, loading: false, hasMore: true },
                best: { data: [], page: 0, loading: false, hasMore: true },
                recent: { data: [], page: 0, loading: false, hasMore: true },
                first: { data: [], page: 0, loading: false, hasMore: true, total: 0 },
                mostPlayed: { data: [], page: 0, loading: false, hasMore: true, total: 0 }
            },
            filterFailed: false,
            
            // Achievements
            achievements: [],
            achievementsExpanded: false,
            
            // Comments
            comments: [],
            commentPage: 0,
            commentText: '',
            commentLoading: false,
            commentPosting: false,
            hasMoreComments: true,
            
            // Friend status
            friendStatus: 0, // 0 = not friend, 1 = friend, 2 = mutual
            friendLoading: false,
            
            // Score modal
            selectedScore: null,
            showScoreModal: false,
            
            // Pin modal
            pinModalScore: null,
            showPinModal: false,
            pinnedInfo: null,
            
            // Config
            userParam: window.profileUserParam || '',
            userIsNumeric: window.profileIsNumeric || false,
            userID: 0, // Resolved after API call
            currentUserID: window.currentUserID || 0,
            hasAdmin: window.hasAdmin || false,
            avatarURL: window.soumetsuConf?.avatars || 'https://a.ussr.pl',
            baseAPI: window.soumetsuConf?.baseAPI || '',
            
            // Banner colors
            bannerColors: null, // { color1: 'rgb(...)', color2: 'rgb(...)' }
        }
    },
    watch: {
        userID(newVal) {
            if (newVal) {
                // Try to extract colors from avatar if it's already loaded
                this.$nextTick(() => {
                    const avatarImg = this.$refs.profileAvatar;
                    if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
                        this.extractBannerColors({ target: avatarImg });
                    }
                });
            }
        }
    },
    computed: {
        isOwnProfile() {
            return this.currentUserID === this.userID && this.currentUserID !== 0;
        },
        canInteract() {
            return this.currentUserID !== 0 && this.currentUserID !== this.userID;
        },
        currentStats() {
            if (!this.user?.stats) return null;
            const rxKey = ['vn', 'rx', 'ap'][this.relax];
            const modeKey = ['std', 'taiko', 'ctb', 'mania'][this.mode];
            return this.user.stats[rxKey]?.[modeKey] || null;
        },
        mixedMode() {
            let m = this.mode;
            if (this.relax === 1) m += 4;
            else if (this.relax === 2) m += 7;
            return m;
        },
        displayedAchievements() {
            if (!this.achievements.length) return [];
            const achieved = this.achievements.filter(a => a.achieved);
            if (this.achievementsExpanded) {
                return this.isOwnProfile ? this.achievements : achieved;
            }
            return (achieved.length > 0 ? achieved : this.achievements).slice(0, 8);
        },
        hasMoreAchievements() {
            const achieved = this.achievements.filter(a => a.achieved);
            return (this.isOwnProfile ? this.achievements : achieved).length > 8;
        },
        levelPercent() {
            if (!this.currentStats?.level) return 0;
            return Math.round((this.currentStats.level % 1) * 100);
        },
        levelInt() {
            if (!this.currentStats?.level) return 0;
            return Math.floor(this.currentStats.level);
        },
        bannerGradient() {
            if (this.bannerColors && this.bannerColors.color1 && this.bannerColors.color2) {
                // Convert rgb to rgba with 20% opacity (0.2)
                const color1RGBA = this.bannerColors.color1.replace('rgb', 'rgba').replace(')', ', 0.2)');
                const color2RGBA = this.bannerColors.color2.replace('rgb', 'rgba').replace(')', ', 0.2)');
                return {
                    background: `linear-gradient(to bottom right, ${color1RGBA}, ${color2RGBA})`
                };
            }
            return {}; // Fallback to default CSS gradient
        }
    },
    async created() {
        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        this.mode = parseInt(params.get('mode')) || 0;
        this.relax = parseInt(params.get('rx')) || 0;
        
        // Ensure getBadgeIconClass is available
        if (typeof this.getBadgeIconClass !== 'function') {
            console.error('getBadgeIconClass method not found');
        }
        
        await this.loadUserData();
    },
    methods: {
        async loadUserData() {
            this.loading = true;
            this.error = null;
            
            try {
                // Load user data - use id= for numeric, name= for username
                const param = this.userIsNumeric ? `id=${this.userParam}` : `name=${encodeURIComponent(this.userParam)}`;
                const userResp = await this.api(`users/full?${param}`);
                if (userResp.code !== 200 || !userResp.id) {
                    this.error = 'User not found';
                    this.loading = false;
                    return;
                }
                this.user = userResp;
                this.userID = userResp.id; // Store resolved user ID
                
                // Update page title
                document.title = `${this.user.username}'s profile :: RealistikOsu!`;
                
                // Update URL to use numeric ID if we came in via username
                if (!this.userIsNumeric) {
                    const newUrl = `/users/${this.userID}${window.location.search}`;
                    window.history.replaceState({}, '', newUrl);
                }
                
                // Set default mode from user's favourite
                if (!window.location.search.includes('mode=')) {
                    this.mode = this.user.favourite_mode || 0;
                }
                
                // Load additional data in parallel
                await Promise.all([
                    this.loadUserpage(),
                    this.loadFollowers(),
                    this.loadCommentsInfo(),
                    this.loadAchievements(),
                    this.loadFriendStatus(),
                    this.loadDiscordInfo()
                ]);
                
                // Update URL
                this.updateURL();
                
                // Load scores and graph after basic data
                this.loadAllScores();
                this.loadGraph();
                
            } catch (err) {
                console.error('Error loading user data:', err);
                this.error = 'Failed to load profile';
            }
            
            this.loading = false;
        },
        
        async api(endpoint, params = {}) {
            // Use baseAPI from config for proper API routing
            const base = this.baseAPI || '';
            let urlStr = `${base}/api/v1/${endpoint}`;
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') {
                    searchParams.set(k, v);
                }
            });
            const queryStr = searchParams.toString();
            if (queryStr) urlStr += `?${queryStr}`;
            const resp = await fetch(urlStr);
            return resp.json();
        },
        
        async loadUserpage() {
            try {
                const resp = await this.api(`users/userpage?id=${this.userID}`);
                if (resp.userpage && window.parseBBCode) {
                    this.userpage = window.parseBBCode(resp.userpage);
                } else {
                    this.userpage = resp.userpage || null;
                }
            } catch (err) {
                console.error('Error loading userpage:', err);
            }
        },
        
        async loadFollowers() {
            try {
                const resp = await this.api(`users/followers?userid=${this.userID}`);
                this.followers = resp;
            } catch (err) {
                console.error('Error loading followers:', err);
            }
        },
        
        async loadCommentsInfo() {
            try {
                const resp = await this.api(`users/comments/info?id=${this.userID}`);
                this.commentsInfo = resp;
                if (!resp.disabled) {
                    this.loadComments();
                }
            } catch (err) {
                console.error('Error loading comments info:', err);
            }
        },
        
        async loadAchievements() {
            try {
                const resp = await this.api('users/achievements', { id: this.userID });
                this.achievements = resp.achievements || [];
            } catch (err) {
                console.error('Error loading achievements:', err);
            }
        },
        
        async loadFriendStatus() {
            if (!this.canInteract) return;
            try {
                const resp = await this.api('friends/with', { id: this.userID });
                if (resp.mutual) this.friendStatus = 2;
                else if (resp.friend) this.friendStatus = 1;
                else this.friendStatus = 0;
            } catch (err) {
                console.error('Error loading friend status:', err);
            }
        },
        
        async loadDiscordInfo() {
            // This would need a backend endpoint to check discord linking
            // For now, we skip this
        },
        
        async loadGraph() {
            try {
                const resp = await this.api(`profile-history/${this.graphType}`, {
                    user_id: this.userID,
                    mode: this.mixedMode
                });
                
                if (resp.status === 'error' || !resp.data?.captures?.length) {
                    this.graphData = null;
                    return;
                }
                
                this.graphData = resp.data.captures;
                this.$nextTick(() => this.renderChart());
            } catch (err) {
                console.error('Error loading graph:', err);
                this.graphData = null;
            }
        },
        
        renderChart() {
            const chartEl = this.$refs.chartContainer;
            if (!chartEl || !this.graphData?.length) return;
            
            const isRank = this.graphType === 'rank';
            const points = isRank 
                ? this.graphData.map(x => x.overall)
                : this.graphData.map(x => x.pp);
            
            const labels = this.createLabels(points.length);
            const color = isRank ? '#2185d0' : '#e03997';
            
            const minVal = Math.min(...points);
            const maxVal = Math.max(...points);
            const offset = minVal === maxVal ? 10 : 1;
            
            const options = {
                series: [{ name: isRank ? 'Global Rank' : 'Performance Points', data: points }],
                chart: {
                    height: 160,
                    type: 'line',
                    fontFamily: '"Poppins", sans-serif',
                    zoom: { enabled: false },
                    toolbar: { show: false },
                    background: 'rgba(0,0,0,0)'
                },
                stroke: { curve: 'smooth', width: 4 },
                colors: [color],
                theme: { mode: 'dark' },
                grid: {
                    show: true,
                    borderColor: '#383838',
                    xaxis: { lines: { show: false } },
                    yaxis: { lines: { show: true } }
                },
                xaxis: {
                    labels: { show: false },
                    categories: labels,
                    axisTicks: { show: false },
                    tooltip: { enabled: false }
                },
                yaxis: [{
                    max: maxVal + offset,
                    min: minVal - offset,
                    reversed: isRank,
                    labels: { show: false },
                    tickAmount: 4
                }],
                markers: {
                    size: 0,
                    fillColor: color,
                    strokeWidth: 0,
                    hover: { size: 7 }
                },
                tooltip: {
                    custom: ({ series, seriesIndex, dataPointIndex }) => {
                        const prefix = isRank ? '#' : '';
                        const value = series[seriesIndex][dataPointIndex];
                        return `<div class="bg-dark-card p-2 rounded border border-dark-border">
                            <div class="text-gray-400 text-xs">${labels[dataPointIndex]}</div>
                            <div class="text-white font-bold">${prefix}${this.addCommas(value)}${isRank ? '' : 'pp'}</div>
                        </div>`;
                    }
                }
            };
            
            if (this.chart) {
                this.chart.updateOptions(options);
            } else {
                this.chart = new ApexCharts(chartEl, options);
                this.chart.render();
            }
        },
        
        createLabels(length) {
            const labels = ['Today'];
            for (let i = 1; i < length; i++) {
                labels.push(i === 1 ? '1 day ago' : `${i} days ago`);
            }
            return labels.reverse();
        },
        
        changeGraphType(type) {
            if (this.graphType === type) return;
            this.graphType = type;
            this.loadGraph();
        },
        
        // Scores
        loadAllScores() {
            this.scores.pinned = { data: [], page: 0, loading: false, hasMore: true };
            this.scores.best = { data: [], page: 0, loading: false, hasMore: true };
            this.scores.recent = { data: [], page: 0, loading: false, hasMore: true };
            this.scores.first = { data: [], page: 0, loading: false, hasMore: true, total: 0 };
            this.scores.mostPlayed = { data: [], page: 0, loading: false, hasMore: true, total: 0 };
            
            this.loadScores('pinned');
            this.loadScores('best');
            this.loadScores('recent');
            this.loadScores('first');
            this.loadMostPlayed();
        },
        
        async loadScores(type) {
            const scoreData = this.scores[type];
            if (scoreData.loading || !scoreData.hasMore) return;
            
            scoreData.loading = true;
            scoreData.page++;
            
            const limit = type === 'best' ? 10 : 5;
            const params = {
                mode: this.mode,
                p: scoreData.page,
                l: limit,
                rx: this.relax,
                id: this.userID
            };
            
            if (this.filterFailed && type === 'recent') {
                params.filter = 'recent';
            }
            
            try {
                const resp = await this.api(`users/scores/${type}`, params);
                
                if (resp.scores?.length) {
                    scoreData.data.push(...resp.scores);
                    if (resp.scores.length < limit) {
                        scoreData.hasMore = false;
                    }
                    if (type === 'first') {
                        scoreData.total = resp.total || 0;
                    }
                } else {
                    scoreData.hasMore = false;
                }
            } catch (err) {
                console.error(`Error loading ${type} scores:`, err);
            }
            
            scoreData.loading = false;
        },
        
        async loadMostPlayed() {
            const scoreData = this.scores.mostPlayed;
            if (scoreData.loading || !scoreData.hasMore) return;
            
            scoreData.loading = true;
            scoreData.page++;
            
            try {
                const resp = await this.api('users/most_played', {
                    id: this.userID,
                    mode: this.mode,
                    p: scoreData.page,
                    l: 5,
                    rx: this.relax
                });
                
                if (resp.beatmaps?.length) {
                    scoreData.data.push(...resp.beatmaps);
                    scoreData.total = resp.total || 0;
                    if (resp.beatmaps.length < 5) {
                        scoreData.hasMore = false;
                    }
                } else {
                    scoreData.hasMore = false;
                }
            } catch (err) {
                console.error('Error loading most played:', err);
            }
            
            scoreData.loading = false;
        },
        
        // Comments
        async loadComments() {
            if (this.commentLoading || !this.hasMoreComments) return;
            
            this.commentLoading = true;
            this.commentPage++;
            
            try {
                const resp = await this.api('users/comments', {
                    id: this.userID,
                    p: this.commentPage
                });
                
                if (resp.comments?.length) {
                    // Handle both 'comment' and 'message' field names, and user_id variations
                    const normalizedComments = resp.comments.map(c => ({
                        ...c,
                        comment: c.comment || c.message || '',
                        time: c.time || c.posted_at || c.postedAt,
                        user_id: c.user_id || c.userID || c.op || c.user?.id || 0
                    }));
                    this.comments.push(...normalizedComments);
                    if (resp.comments.length < 10) {
                        this.hasMoreComments = false;
                    }
                } else {
                    this.hasMoreComments = false;
                }
            } catch (err) {
                console.error('Error loading comments:', err);
                this.hasMoreComments = false;
            }
            
            this.commentLoading = false;
        },
        
        async postComment() {
            if (!this.commentText.trim() || this.commentText.length > 380 || this.commentPosting) return;
            
            const commentToPost = this.commentText.trim();
            this.commentPosting = true;
            
            try {
                const resp = await fetch(`${this.baseAPI}/api/v1/users/comments?id=${this.userID}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: commentToPost
                });
                
                const data = await resp.json();
                if (data.code === 200) {
                    // Clear comment text on success
                    this.commentText = '';
                    
                    // Reload comments
                    this.comments = [];
                    this.commentPage = 0;
                    this.hasMoreComments = true;
                    await this.loadComments();
                    
                    // Update total
                    if (this.commentsInfo) {
                        this.commentsInfo.total = (this.commentsInfo.total || 0) + 1;
                    }
                } else {
                    console.error('Error posting comment:', data);
                    alert('Failed to post comment. Please try again.');
                }
            } catch (err) {
                console.error('Error posting comment:', err);
                alert('Failed to post comment. Please try again.');
            } finally {
                this.commentPosting = false;
            }
        },
        
        async deleteComment(id) {
            if (!confirm('Are you sure you want to delete this comment?')) return;
            
            try {
                const resp = await fetch(`${this.baseAPI}/api/v1/users/comments/delete?id=${id}`, {
                    method: 'POST'
                });
                const data = await resp.json();
                
                if (data.code === 200) {
                    this.comments = this.comments.filter(c => c.id !== id);
                    if (this.commentsInfo) {
                        this.commentsInfo.total = Math.max(0, (this.commentsInfo.total || 0) - 1);
                    }
                } else {
                    console.error('Error deleting comment:', data);
                    alert('Failed to delete comment. Please try again.');
                }
            } catch (err) {
                console.error('Error deleting comment:', err);
                alert('Failed to delete comment. Please try again.');
            }
        },
        
        handleAvatarError(event, userId) {
            const img = event.target;
            const currentSrc = img.src;
            
            // If we haven't tried with .png extension yet, try it
            if (!currentSrc.endsWith('.png')) {
                img.src = this.avatarURL + '/' + userId + '.png';
                return;
            }
            
            // If .png also failed, use SVG fallback (simple user icon)
            const svgData = encodeURIComponent(`
                <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <rect width="256" height="256" fill="#1E293B"/>
                    <circle cx="128" cy="96" r="48" fill="#475569"/>
                    <path d="M64 208C64 176 96 160 128 160C160 160 192 176 192 208V224H64V208Z" fill="#475569"/>
                </svg>
            `.trim());
            
            img.src = 'data:image/svg+xml,' + svgData;
            img.onerror = null; // Prevent infinite loop
        },
        
        extractBannerColors(event) {
            const img = event.target;
            if (!window.BannerGradient) return;
            
            window.BannerGradient.extract(img, (colors) => {
                this.bannerColors = colors;
            });
        },
        
        // Friend actions
        async toggleFriend() {
            if (this.friendLoading || !this.canInteract) return;
            
            this.friendLoading = true;
            const action = this.friendStatus > 0 ? 'del' : 'add';
            
            try {
                const resp = await fetch(`${this.baseAPI}/api/v1/friends/${action}?user=${this.userID}`, {
                    method: 'POST'
                });
                const data = await resp.json();
                
                if (data.mutual) this.friendStatus = 2;
                else if (data.friend) this.friendStatus = 1;
                else this.friendStatus = 0;
                
                // Update follower count
                if (action === 'add') {
                    this.followers.allFriended++;
                } else {
                    this.followers.allFriended--;
                }
            } catch (err) {
                console.error('Error toggling friend:', err);
            }
            
            this.friendLoading = false;
        },
        
        // Mode/Relax switching
        setMode(mode) {
            if (this.mode === mode) return;
            this.mode = mode;
            this.updateURL();
            this.loadAllScores();
            this.loadGraph();
        },
        
        setRelax(rx) {
            if (this.relax === rx) return;
            // Check availability
            if (rx === 1 && this.mode === 3) return; // No relax for mania
            if (rx === 2 && this.mode !== 0) return; // Autopilot only for std
            
            this.relax = rx;
            this.updateURL();
            this.loadAllScores();
            this.loadGraph();
        },
        
        updateURL() {
            const url = new URL(window.location.href);
            url.searchParams.set('mode', this.mode);
            url.searchParams.set('rx', this.relax);
            window.history.replaceState({}, '', url);
        },
        
        // Score modal
        viewScore(score) {
            this.selectedScore = score;
            this.showScoreModal = true;
        },
        
        closeScoreModal() {
            this.showScoreModal = false;
            this.selectedScore = null;
        },
        
        // Pin functionality
        async openPinModal(score) {
            this.pinModalScore = score;
            try {
                const resp = await this.api(`users/scores/pinned/info?id=${score.id}`);
                this.pinnedInfo = resp.code === 200 ? resp.pinned : null;
            } catch {
                this.pinnedInfo = null;
            }
            this.showPinModal = true;
        },
        
        async togglePin() {
            if (!this.pinModalScore) return;
            
            const isPinned = !!this.pinnedInfo;
            const endpoint = isPinned 
                ? `users/scores/pinned/delete?score_id=${this.pinModalScore.id}`
                : `users/scores/pinned?score_id=${this.pinModalScore.id}&rx=${this.relax}`;
            
            try {
                await fetch(`${this.baseAPI}/api/v1/${endpoint}`, { method: 'POST' });
                this.showPinModal = false;
                // Reload pinned scores
                this.scores.pinned = { data: [], page: 0, loading: false, hasMore: true };
                this.loadScores('pinned');
            } catch (err) {
                console.error('Error toggling pin:', err);
            }
        },
        
        // Helpers
        addCommas(num) {
            if (num === undefined || num === null) return '0';
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
        
        humanize(num) {
            if (num === undefined || num === null) return '0';
            if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
            if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
            if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
            if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
            return num.toString();
        },
        
        formatAccuracy(acc) {
            if (acc === undefined || acc === null) return '0.00';
            return parseFloat(acc).toFixed(2);
        },
        
        timeAgo(dateStr) {
            const date = new Date(dateStr);
            const seconds = Math.floor((Date.now() - date) / 1000);
            
            const intervals = [
                { label: 'year', seconds: 31536000 },
                { label: 'month', seconds: 2592000 },
                { label: 'day', seconds: 86400 },
                { label: 'hour', seconds: 3600 },
                { label: 'minute', seconds: 60 }
            ];
            
            for (const { label, seconds: s } of intervals) {
                const count = Math.floor(seconds / s);
                if (count >= 1) {
                    return `${count} ${label}${count > 1 ? 's' : ''} ago`;
                }
            }
            return 'just now';
        },
        
        formatDate(timestamp) {
            if (!timestamp) return 'Unknown';
            
            let date;
            // Handle Unix timestamp (seconds)
            if (typeof timestamp === 'number') {
                date = new Date(timestamp * 1000);
            } 
            // Handle ISO string or other string formats
            else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            }
            else {
                return 'Unknown';
            }
            
            // Check if date is valid
            if (isNaN(date.getTime())) return 'Unknown';
            
            return new Intl.DateTimeFormat('en-gb', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            }).format(date);
        },
        
        getRank(mode, mods, acc, c300, c100, c50, cmiss) {
            const total = c300 + c100 + c50 + cmiss;
            const hdfl = (mods & 1049608) > 0;
            const ss = hdfl ? 'SS+' : 'SS';
            const s = hdfl ? 'S+' : 'S';
            
            if (mode === 0 || mode === 1) {
                const r300 = c300 / total;
                const r50 = c50 / total;
                if (r300 === 1) return ss;
                if (r300 > 0.9 && r50 <= 0.01 && cmiss === 0) return s;
                if ((r300 > 0.8 && cmiss === 0) || r300 > 0.9) return 'A';
                if ((r300 > 0.7 && cmiss === 0) || r300 > 0.8) return 'B';
                if (r300 > 0.6) return 'C';
                return 'D';
            }
            
            if (mode === 2 || mode === 3) {
                if (acc === 100) return ss;
                if (acc > (mode === 2 ? 98 : 95)) return s;
                if (acc > (mode === 2 ? 94 : 90)) return 'A';
                if (acc > (mode === 2 ? 90 : 80)) return 'B';
                if (acc > (mode === 2 ? 85 : 70)) return 'C';
                return 'D';
            }
            
            return 'D';
        },
        
        getScoreMods(mods) {
            if (!mods) return 'None';
            const modNames = [];
            const modMap = {
                1: 'NF', 2: 'EZ', 4: 'TD', 8: 'HD', 16: 'HR', 32: 'SD',
                64: 'DT', 128: 'RX', 256: 'HT', 512: 'NC', 1024: 'FL',
                2048: 'AU', 4096: 'SO', 8192: 'AP', 16384: 'PF'
            };
            for (const [bit, name] of Object.entries(modMap)) {
                if (mods & parseInt(bit)) modNames.push(name);
            }
            return modNames.length ? modNames.join('') : 'None';
        },
        
        ppOrScore(pp, score, ranked) {
            if (pp && pp > 0) {
                return `${this.addCommas(Math.round(pp))}pp`;
            }
            return this.addCommas(score);
        },
        
        getCountryName(code) {
            try {
                return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase());
            } catch {
                return code;
            }
        },
        
        escapeHTML(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },
        
        getBadgeIconClass(icon) {
            if (!icon) return 'fas fa-question';
            
            // Trim whitespace
            icon = String(icon).trim();
            
            // If it already has a Font Awesome class prefix (fas, far, fab, etc.), return as is
            if (/^(fas|far|fal|fad|fab|fak)\s+fa-/.test(icon)) {
                return icon;
            }
            
            // If it starts with "fa-" but no prefix, add "fas"
            if (icon.startsWith('fa-')) {
                return 'fas ' + icon;
            }
            
            // Handle Font Awesome Unicode values (like "f005", "F005", "\uf005")
            // These should be converted to class names if possible, but for now we'll try to use them as-is
            // If it looks like a Unicode value (hexadecimal), we might need special handling
            if (/^[fF][0-9a-fA-F]{3}$/.test(icon) || /^\\?u?[fF][0-9a-fA-F]{3}$/.test(icon)) {
                // This is likely a Unicode value - Font Awesome uses these internally
                // We'll need to find the corresponding icon name or use a fallback
                // For now, return a question mark icon
                console.warn('Badge icon appears to be a Unicode value:', icon);
                return 'fas fa-question';
            }
            
            // If it's just the icon name (like "plane", "star", etc.), add both "fas" and "fa-" prefix
            // Remove any existing "fa-" prefix to avoid duplication
            const iconName = icon.replace(/^fa-/, '').replace(/[^a-z0-9-]/gi, '');
            return 'fas fa-' + iconName;
        },
        
        normalizeBadgeIcon(icon) {
            // Alias for getBadgeIconClass for backwards compatibility
            return this.getBadgeIconClass(icon);
        },
        
        isRelaxAvailable(rx) {
            if (rx === 1) return this.mode !== 3; // No relax for mania
            if (rx === 2) return this.mode === 0; // Autopilot only for std
            return true;
        }
    }
});
