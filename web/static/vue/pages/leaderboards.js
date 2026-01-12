const leaderboardApp = Vue.createApp({
    compilerOptions: {
        delimiters: ["<%", "%>"]
    },
    data() {
        return {
            data: [],
            mode: window.mode || 'std',
            relax: window.relax || 'vn',
            relaxInt: 0,
            modeInt: 0,
            sort: window.sort || 'pp',
            load: true,
            page: window.page || 1,
            country: window.country || '',
            soumetsuConf: window.soumetsuConf || {},
        }
    },
    computed: {
    },
    created() {
        // Use window variables set by Go template
        this.loadLeaderboardData(
            window.sort || 'pp',
            window.mode || 'std',
            window.relax || 'vn',
            window.page || 1,
            window.country || ''
        )
    },
    methods: {
        async loadLeaderboardData(sort, mode, relax, page, country) {
            if (window.event) {
                window.event.preventDefault();
            }
            this.load = true;
            this.mode = mode;
            this.relax = relax;
            switch (mode) {
                case 'taiko':
                    this.modeInt = 1;
                    break
                case 'fruits':
                    this.modeInt = 2;
                    break
                case 'mania':
                    this.modeInt = 3;
                    break
                default:
                    this.modeInt = 0;
            }

            switch (relax) {
                case 'rx':
                    this.relaxInt = 1;
                    break;
                case 'ap':
                    this.relaxInt = 2;
                    break;
                default:
                    this.relaxInt = 0;
            }

            this.sort = sort;
            this.page = page;
            if (country == null)
                {this.country = ''}
            else
                {this.country = country.toUpperCase()}
            if (this.page <= 0 || this.page == null)
                {this.page = 1;}
            window.history.replaceState('', document.title, `/leaderboard?m=${this.mode}&rx=${this.relax}&sort=${this.sort}&p=${this.page}&c=${this.country}`);

            try {
                const response = await SoumetsuAPI.leaderboard.get(
                    this.modeInt,
                    this.relaxInt,
                    this.sort,
                    this.page,
                    this.country
                );
                this.data = response.users || [];
            } catch (error) {
                console.error('Leaderboard error:', error);
                this.data = [];
            }
            this.load = false;
        },
        addCommas(integer) {
            integer += "", x = integer.split("."), x1 = x[0], x2 = x.length > 1 ? "." + x[1] : "";
            for (let t = /(\d+)(\d{3})/; t.test(x1);) {x1 = x1.replace(t, "$1,$2");}
            return x1 + x2;
        },
        convertIntToLabel(number) {
            // Nine Zeroes for Trillion
            return Math.abs(Number(number)) >= 1.0e+12

                ? (Math.abs(Number(number)) / 1.0e+12).toFixed(2) + " trillion"
                // Nine Zeroes for Billion
                : Math.abs(Number(number)) >= 1.0e+9

                    ? (Math.abs(Number(number)) / 1.0e+9).toFixed(2) + " billion"
                    // Six Zeroes for Millions
                    : Math.abs(Number(number)) >= 1.0e+6

                        ? (Math.abs(Number(number)) / 1.0e+6).toFixed(2) + " million"
                        // Three Zeroes for Thousand
                        : Math.abs(Number(number)) >= 1.0e+3

                            ? (Math.abs(Number(number)) / 1.0e+3).toFixed(2) + " thousand"

                            : Math.abs(Number(number));
        },
        addOne(page) {
            return (parseInt(page) + parseInt(1));
        },
        mobileCheck() {

            if (window.innerWidth < 768) {
                return true;
            }

            return false;
        },
        countryName(str) {
            const getCountryNames = new Intl.DisplayNames(['en'], { type: 'region' });
            return getCountryNames.of(str.toUpperCase())
        },
        formatAccuracy(acc) {
            if (acc === undefined || acc === null) {return '0.00';}
            return parseFloat(acc).toFixed(2);
        },
        safeValue(val, def) {
            return val !== undefined && val !== null ? val : def;
        },
        getPlayerRole(privileges) {
            if (privileges & 8388608) return { name: 'Admin', color: 'text-red-400', bg: 'bg-red-500/20', icon: 'fa-shield-alt' };
            if (privileges & 4194304) return { name: 'Moderator', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: 'fa-gavel' };
            if (privileges & 256) return { name: 'BAT', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: 'fa-music' };
            if (privileges & 4) return { name: 'Supporter', color: 'text-pink-400', bg: 'bg-pink-500/20', icon: 'fa-heart' };
            return null;
        }
    }
});

leaderboardApp.mount('#app');
