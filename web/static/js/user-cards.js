(function() {
    // Only run on non-mobile
    if (window.innerWidth < 768) {return;}

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        #user-card-popover {
            transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: opacity, transform;
        }
        #user-card-popover.visible {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }
        #user-card-popover.hidden-card {
            opacity: 0;
            transform: translateY(8px);
            pointer-events: none;
        }
        .uc-shimmer {
            animation: uc-shimmer 2s infinite linear;
            background: linear-gradient(to right, #1e293b 0%, #334155 50%, #1e293b 100%);
            background-size: 1000px 100%;
        }
        @keyframes uc-shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
    `;
    document.head.appendChild(style);

    // HTML Structure
    const cardHTML = `
        <div id="user-card-popover" class="fixed z-50 w-80 h-40 rounded-xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700 hidden-card" style="display: none;">
            <!-- Banner -->
            <div class="absolute inset-0 bg-cover bg-center transition-all duration-500" id="uc-banner"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>

            <!-- Content -->
            <div class="relative z-10 h-full flex flex-col justify-between p-4">
                <!-- Top: Rank & Badges -->
                <div class="flex justify-between items-start gap-2">
                    <div class="flex gap-2">
                        <!-- Rank Badge -->
                        <div class="bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1.5 border border-white/10" id="uc-rank-badge" style="display:none">
                            <i class="fas fa-globe text-slate-400 text-xs"></i>
                            <span class="text-white font-bold text-xs" id="uc-rank">#0</span>
                        </div>
                        <!-- Country Rank Badge -->
                        <div class="bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1.5 border border-white/10" id="uc-country-rank-badge" style="display:none">
                            <img src="" id="uc-rank-flag" class="w-5 h-3.5 rounded-sm opacity-75">
                            <span class="text-white font-bold text-xs" id="uc-country-rank">#0</span>
                        </div>
                    </div>

                    <!-- Badges -->
                    <div class="flex justify-end gap-1.5 ml-auto" id="uc-badges"></div>
                </div>

                <!-- Bottom: Info -->
                <div class="flex items-end gap-3">
                    <img src="" id="uc-avatar" class="w-16 h-16 rounded-lg border-2 border-white/10 bg-slate-800 object-cover shadow-lg shrink-0">
                    <div class="flex-1 min-w-0 pb-0.5">
                        <div class="flex items-center gap-1.5">
                            <img src="" id="uc-flag" class="w-7 h-5 rounded-sm shadow-sm opacity-0 transition-opacity" style="display:none">
                            <h3 class="text-white font-bold text-lg truncate drop-shadow-md leading-tight">
                                <a href="#" id="uc-username-link" class="hover:underline decoration-2 decoration-white/50 underline-offset-2 transition-all hover:text-blue-200"></a>
                            </h3>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <div class="w-2 h-2 rounded-full bg-slate-500 transition-colors duration-300" id="uc-status-dot"></div>
                            <span class="text-xs text-gray-300 font-medium transition-colors duration-300" id="uc-status-text">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', cardHTML);

    const card = document.getElementById('user-card-popover');
    const els = {
        banner: document.getElementById('uc-banner'),
        avatar: document.getElementById('uc-avatar'),
        usernameLink: document.getElementById('uc-username-link'),
        flag: document.getElementById('uc-flag'),
        statusDot: document.getElementById('uc-status-dot'),
        statusText: document.getElementById('uc-status-text'),
        badges: document.getElementById('uc-badges'),
        rankBadge: document.getElementById('uc-rank-badge'),
        rank: document.getElementById('uc-rank'),
        countryRankBadge: document.getElementById('uc-country-rank-badge'),
        countryRank: document.getElementById('uc-country-rank'),
        rankFlag: document.getElementById('uc-rank-flag')
    };

    const cache = {};
    let activeLink = null;
    let hideTimeout = null;
    let showTimeout = null;
    let isVisible = false;

    // Config
    const AVATAR_URL = window.soumetsuConf ? window.soumetsuConf.avatars : 'https://a.ussr.pl';
    const API_URL = window.soumetsuConf ? window.soumetsuConf.baseAPI : '';
    const BANCHO_URL = window.soumetsuConf ? window.soumetsuConf.banchoAPI : '';

    function getRoleBadges(privileges) {
        const badges = [];
        // Helper to add badge
        const add = (icon, colour, title) => {
            badges.push(`<div class="w-6 h-6 rounded-full bg-slate-800/80 backdrop-blur-sm flex items-center justify-center text-xs ${colour} shadow-sm border border-white/5" title="${title}"><i class="${icon}"></i></div>`);
        };

        if (privileges & 8192) {add('fas fa-gavel', 'text-red-400', 'Admin');} // ManageUsers
        else if (privileges & 4096) {add('fas fa-shield-alt', 'text-purple-400', 'Moderator');} // AccessRAP

        if (privileges & 4) {add('fas fa-heart', 'text-yellow-400', 'Supporter');} // Donor

        return badges.join('');
    }

    async function fetchUser(id) {
        if (cache[id] && (Date.now() - cache[id].time < 60000)) {return cache[id].data;}

        try {
            const [infoResp, statusResp] = await Promise.all([
                fetch(`${API_URL}/api/v1/users/full?id=${id}`).then(r => r.json()),
                BANCHO_URL ? fetch(`${BANCHO_URL}/api/status/${id}`).then(r => r.json().catch(() => null)) : Promise.resolve(null)
            ]);

            // Adjust check for external API response code
            if (infoResp.code !== 200) {throw new Error("User not found");}

            const data = {
                ...infoResp,
                online: statusResp && statusResp.status === 200
            };

            cache[id] = { time: Date.now(), data };
            return data;
        } catch (e) {
            console.error('Failed to fetch user card', e);
            return null;
        }
    }

    function updateCard(data) {
        if (!data) {return;}

        // Content
        els.usernameLink.textContent = data.username;
        els.usernameLink.href = `/users/${data.id}`;
        els.avatar.src = `${AVATAR_URL}/${data.id}`;

        // Flag
        if (data.country) {
            els.flag.src = `/static/images/new-flags/flag-${data.country.toLowerCase()}.svg`;
            els.flag.style.display = 'block';
            requestAnimationFrame(() => els.flag.classList.remove('opacity-0'));
        } else {
            els.flag.style.display = 'none';
        }

        // Rank Logic
        const modes = ['std', 'taiko', 'ctb', 'mania'];
        const mode = modes[data.favourite_mode || 0];
        const stats = data.stats && data.stats.vn && data.stats.vn[mode];

        // Global Rank
        if (stats && stats.global_leaderboard_rank > 0) {
            els.rank.textContent = '#' + stats.global_leaderboard_rank.toLocaleString();
            els.rankBadge.style.display = 'flex';
        } else {
            els.rankBadge.style.display = 'none';
        }

        // Country Rank
        if (stats && stats.country_leaderboard_rank > 0) {
            els.countryRank.textContent = '#' + stats.country_leaderboard_rank.toLocaleString();
            if (data.country) {
                els.rankFlag.src = `/static/images/new-flags/flag-${data.country.toLowerCase()}.svg`;
            }
            els.countryRankBadge.style.display = 'flex';
        } else {
            els.countryRankBadge.style.display = 'none';
        }

        // Status
        if (data.online) {
            els.statusDot.className = 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
            els.statusText.textContent = 'Online';
            els.statusText.className = 'text-xs text-green-400 font-medium';
        } else {
            els.statusDot.className = 'w-2 h-2 rounded-full bg-slate-500';
            els.statusText.textContent = 'Offline';
            els.statusText.className = 'text-xs text-slate-400 font-medium';
        }

        // Badges
        els.badges.innerHTML = getRoleBadges(data.privileges || 0);

        // Banner
        if (data.background && data.background.type === 1) {
            els.banner.style.backgroundImage = `url('/static/profbackgrounds/${data.background.value}')`;
            els.banner.style.backgroundColor = 'transparent';
            els.banner.classList.remove('banner-gradient-transition');
        } else if (data.background && data.background.type === 2) {
            els.banner.style.backgroundImage = 'none';
            els.banner.style.backgroundColor = data.background.value;
            els.banner.classList.remove('banner-gradient-transition');
        } else {
            // Default - use gradient extracted from avatar
            // Set fallback gradient first
            els.banner.style.backgroundImage = 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(147,51,234,0.2) 100%)';
            els.banner.style.backgroundColor = '#0f172a';

            // Extract colours from avatar and apply gradient
            if (window.BannerGradient && els.avatar) {
                // Ensure avatar has crossorigin attribute for colour extraction
                if (!els.avatar.crossOrigin) {
                    els.avatar.crossOrigin = 'anonymous';
                }

                // Add transition class for smooth gradient changes
                els.banner.classList.add('banner-gradient-transition');

                // Extract and apply gradient
                function applyGradient() {
                    // Use a small delay to ensure avatar is fully rendered
                    setTimeout(function() {
                        if (els.avatar && els.avatar.complete && els.avatar.naturalWidth > 0) {
                            window.BannerGradient.extract(els.avatar, function(colours) {
                                if (colours && colours.colour1 && colours.colour2 && els.banner) {
                                    window.BannerGradient.apply(els.banner, colours);
                                }
                            });
                        }
                    }, 50);
                }

                // Try to apply immediately if avatar is already loaded
                if (els.avatar.complete && els.avatar.naturalWidth > 0) {
                    applyGradient();
                } else {
                    // Wait for avatar to load
                    const loadHandler = function() {
                        applyGradient();
                        els.avatar.removeEventListener('load', loadHandler);
                    };
                    els.avatar.addEventListener('load', loadHandler);
                }
            }
        }
    }

    function showCard(target, id) {
        clearTimeout(hideTimeout);
        clearTimeout(showTimeout);

        activeLink = target;
        card.style.display = 'block';

        // Initial state (loading/cached)
        const cached = cache[id]?.data;

        // Position
        const rect = target.getBoundingClientRect();
        const cardWidth = 320;
        const cardHeight = 160;
        const margin = 12;

        let top = rect.bottom + margin;
        let left = rect.left + (rect.width / 2) - (cardWidth / 2);

        // Flip if bottom overflow
        if (top + cardHeight > window.innerHeight) {
            top = rect.top - cardHeight - margin;
        }

        // Clamp horizontal
        left = Math.max(margin, Math.min(left, window.innerWidth - cardWidth - margin));

        card.style.top = `${top}px`;
        card.style.left = `${left}px`;

        // Render basic info immediately if possible
        if (cached) {
            updateCard(cached);
        } else {
            // Loading state
            els.usernameLink.textContent = 'Loading...';
            els.usernameLink.removeAttribute('href'); // Remove href while loading
            els.avatar.src = `${AVATAR_URL}/${id}`;
            els.flag.style.display = 'none';
            els.statusText.textContent = 'Fetching...';
            els.statusDot.className = 'w-2 h-2 rounded-full bg-slate-500 animate-pulse';
            els.banner.style.backgroundImage = 'none';
            els.banner.style.backgroundColor = '#1e293b';
            els.badges.innerHTML = '';
            els.rankBadge.style.display = 'none';
            els.countryRankBadge.style.display = 'none';
        }

        // Animate in
        requestAnimationFrame(() => {
            card.classList.remove('hidden-card');
            card.classList.add('visible');
            isVisible = true;
        });

        // Fetch if not cached
        if (!cached) {
            fetchUser(id).then(data => {
                if (activeLink === target && isVisible) {
                    updateCard(data);
                }
            });
        }
    }

    function hideCard() {
        clearTimeout(showTimeout);
        hideTimeout = setTimeout(() => {
            card.classList.remove('visible');
            card.classList.add('hidden-card');
            isVisible = false;

            setTimeout(() => {
                if (!isVisible) {
                    card.style.display = 'none';
                    activeLink = null;
                }
            }, 200);
        }, 100);
    }

    // Event Delegation
    document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a');
        if (!link) {return;}

        // Ignore links inside the card itself to prevent recursion
        if (link.closest('#user-card-popover')) {return;}

        const href = link.getAttribute('href');
        if (!href) {return;}

        // Match /u/123 or /users/123
        const match = href.match(/^\/(?:u|users)\/(\d+)$/);
        if (match) {
            const id = parseInt(match[1]);

            // Do not show for current user if inside navbar
            if (id === window.currentUserID && link.closest('nav')) {return;}

            clearTimeout(hideTimeout);
            showTimeout = setTimeout(() => showCard(link, id), 200);
        }
    });

    document.addEventListener('mouseout', (e) => {
        const link = e.target.closest('a');
        if (link && (link.getAttribute('href')?.match(/^\/(?:u|users)\/(\d+)$/))) {
            hideCard();
        }
    });

    // Keep visible when hovering the card itself
    card.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        clearTimeout(showTimeout);
    });

    card.addEventListener('mouseleave', () => {
        hideCard();
    });

})();
