const clanboardApp = Vue.createApp({
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
            load: true,
            page: window.page || 1,
        }
    },
    computed: {
    },
    created() {
        this.loadClanboardData(
            window.mode || 'std',
            window.relax || 'vn',
            window.page || 1
        )
    },
    methods: {
        async loadClanboardData(mode, relax, page) {
            if (window.event) {
                window.event.preventDefault();
            }
            this.load = true;

            if (mode)
                {this.mode = mode;}
            if (relax)
                {this.relax = relax;}

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

            this.page = page;
            if (this.page <= 0 || this.page == null)
                {this.page = 1;}
            window.history.replaceState('', document.title, `/clans/leaderboard?mode=${this.mode}&rx=${this.relax}&p=${this.page}`);

            try {
                const response = await SoumetsuAPI.get('clans/stats/all', {
                    m: this.modeInt,
                    rx: this.relaxInt,
                    p: this.page,
                });
                this.data = response.clans || [];
            } catch (error) {
                console.error('Clanboard error:', error);
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
        safeValue(val, def) {
            return val !== undefined && val !== null ? val : def;
        }
    }
});

clanboardApp.mount('#app');
