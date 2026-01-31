/**
 * Team Page Vue App
 *
 * Displays team members organised by badge groups using card design from friends page.
 */

const teamApp = Soumetsu.createApp({
  data() {
    return {
      // Team groups loaded from API
      groups: [],
      loading: true,
      error: null,

      // Config
      avatarURL: window.soumetsuConf?.avatars || 'https://a.ussr.pl',
      baseAPI: window.soumetsuConf?.baseAPI || '',
    };
  },

  computed: {
    // Filter out supporters (badge 1002) for main display
    displayGroups() {
      return this.groups.filter((g) => g.badge_id !== 1002);
    },
    supporters() {
      const supporterGroup = this.groups.find((g) => g.badge_id === 1002);
      return supporterGroup ? supporterGroup.members : [];
    },
  },

  async created() {
    await this.loadTeam();

    // Setup modal close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSupportersModal();
      }
    });
  },

  methods: {
    async loadTeam() {
      this.loading = true;
      this.error = null;

      try {
        const base = this.baseAPI || '';
        const resp = await fetch(`${base}/api/v2/team/`);
        const json = await resp.json();
        const data = json.data !== undefined ? json.data : json;

        if (data && data.groups) {
          // Add bannerColors to each member
          this.groups = data.groups.map((group) => ({
            ...group,
            members: group.members.map((m) => ({
              ...m,
              bannerColors: null,
            })),
          }));
        }
      } catch (err) {
        console.error('Error loading team:', err);
        this.error = 'Failed to load team data';
      }

      this.loading = false;
    },

    extractBannerColors(event, memberId) {
      const img = event.target;
      if (!window.BannerGradient) {
        return;
      }

      window.BannerGradient.extract(img, (colors) => {
        for (const group of this.groups) {
          const member = group.members.find((m) => m.id === memberId);
          if (member && colors) {
            member.bannerColors = colors;
            return;
          }
        }
      });
    },

    getBannerStyle(member) {
      if (member.bannerColors?.colour1 && member.bannerColors?.colour2) {
        const colour1RGBA = member.bannerColors.colour1
          .replace('rgb', 'rgba')
          .replace(')', ', 0.25)');
        const colour2RGBA = member.bannerColors.colour2
          .replace('rgb', 'rgba')
          .replace(')', ', 0.25)');
        return {
          background: `linear-gradient(to bottom right, ${colour1RGBA}, ${colour2RGBA})`,
        };
      }
      return {
        background:
          'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)',
      };
    },

    getRoleBadges(privileges) {
      const badges = [];
      if (privileges & 8192) {
        badges.push({ icon: 'fas fa-gavel', color: 'text-red-400', title: 'Admin' });
      } else if (privileges & 4096) {
        badges.push({ icon: 'fas fa-shield-alt', color: 'text-purple-400', title: 'Moderator' });
      }
      if (privileges & 4) {
        badges.push({ icon: 'fas fa-heart', color: 'text-yellow-400', title: 'Supporter' });
      }
      return badges;
    },

    handleAvatarError(event, userId) {
      const img = event.target;
      const currentSrc = img.src;

      if (!currentSrc.endsWith('.png')) {
        img.src = this.avatarURL + '/' + userId + '.png';
        return;
      }

      const svgData = encodeURIComponent(
        `
                <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                    <rect width="256" height="256" fill="#1E293B"/>
                    <circle cx="128" cy="96" r="48" fill="#475569"/>
                    <path d="M64 208C64 176 96 160 128 160C160 160 192 176 192 208V224H64V208Z" fill="#475569"/>
                </svg>
            `.trim()
      );

      img.src = 'data:image/svg+xml,' + svgData;
      img.onerror = null;
    },

    openSupportersModal() {
      const modal = document.getElementById('supporters-modal');
      const backdrop = document.getElementById('modal-backdrop');
      const panel = document.getElementById('modal-panel');

      if (!modal) return;
      modal.classList.remove('hidden');
      void modal.offsetWidth;
      modal.setAttribute('aria-hidden', 'false');
      backdrop.classList.remove('opacity-0');
      panel.classList.remove('opacity-0', 'scale-95');
      panel.classList.add('scale-100');
    },

    closeSupportersModal() {
      const modal = document.getElementById('supporters-modal');
      const backdrop = document.getElementById('modal-backdrop');
      const panel = document.getElementById('modal-panel');

      if (!modal) return;
      modal.setAttribute('aria-hidden', 'true');
      backdrop.classList.add('opacity-0');
      panel.classList.remove('scale-100');
      panel.classList.add('opacity-0', 'scale-95');

      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    },

    getGroupIcon(badgeId) {
      const icons = {
        2: 'fas fa-code',
        1018: 'fas fa-tasks',
        1020: 'fas fa-envelope',
        30: 'fas fa-comments',
        5: 'fas fa-play-circle',
        1017: 'fab fa-twitter',
      };
      return icons[badgeId] || 'fas fa-users';
    },

    getGroupColor(badgeId) {
      const colors = {
        2: {
          bg: 'bg-primary/20',
          text: 'text-primary',
          gradient: 'from-primary/10 via-transparent to-blue-500/10',
        },
        1018: {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          gradient: 'from-red-500/10 via-transparent to-pink-500/10',
        },
        1020: {
          bg: 'bg-purple-500/20',
          text: 'text-purple-400',
          gradient: 'from-purple-500/10 via-transparent to-indigo-500/10',
        },
        30: {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          gradient: 'from-green-500/10 via-transparent to-emerald-500/10',
        },
        5: {
          bg: 'bg-pink-500/20',
          text: 'text-pink-400',
          gradient: 'from-pink-500/10 via-transparent to-rose-500/10',
        },
        1017: {
          bg: 'bg-cyan-500/20',
          text: 'text-cyan-400',
          gradient: 'from-cyan-500/10 via-transparent to-blue-500/10',
        },
      };
      return (
        colors[badgeId] || {
          bg: 'bg-gray-500/20',
          text: 'text-gray-400',
          gradient: 'from-gray-500/10 via-transparent to-gray-500/10',
        }
      );
    },

    getGroupDescription(badgeId) {
      const descriptions = {
        2: 'Developers are responsible for all the server side magic. They do all the behind the scene technical things. They have full power over the server as they run it. Developers have a blue name in the in-game chat.',
        1018: 'Administrators are all-mighty powerful beings that are here to ensure everything runs smoothly. This can be anything from organising events to hunting hackers. They are cool people ready to help you. They have power in numerous sectors such as the discord server.',
        1020: 'Community Managers deal with bans, silences, name changes and pretty much everything that has to do with the community. They take care of our Discord server and reply to emails sent to the support services (Discord).',
        30: 'Chat moderators manage the chat to make sure The Law\u2122 (the rules) is respected.',
        5: 'BATs play beatmaps in the ranking queue and decide whether they are good enough to be ranked or not. They ensure quality standards are met and help shape the competitive experience for all players.',
        1017: "The Social Media Team is responsible for anything regarding RealistikOsu's presence on social medias. They keep the community informed, engaged, and help grow our presence across various platforms.",
      };
      return descriptions[badgeId] || '';
    },

    getGroupSubtitle(badgeId) {
      const subtitles = {
        2: 'The technical wizards behind the scenes',
        1018: 'Ensuring everything runs smoothly',
        1020: 'Keeping the community healthy and engaged',
        30: 'Maintaining order in the chat',
        5: 'Curating the ranked beatmap pool',
        1017: 'Spreading the word about RealistikOsu',
      };
      return subtitles[badgeId] || '';
    },

    // Delegate to shared helpers
    addCommas: SoumetsuHelpers.addCommas,
    formatAccuracy: SoumetsuHelpers.formatAccuracy,
    getCountryName: SoumetsuHelpers.getCountryName,
    escapeHTML: SoumetsuHelpers.escapeHTML,
  },
});

teamApp.mount('#team-app');
