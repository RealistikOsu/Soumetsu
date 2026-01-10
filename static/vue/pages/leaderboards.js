new Vue({
    el: "#app",
    delimiters: ["<%", "%>"],
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
        }
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
        loadLeaderboardData(sort, mode, relax, page, country) {
            var vm = this;
            if (window.event) {
                window.event.preventDefault();
            }
            vm.load = true;
            vm.mode = mode;
            vm.relax = relax;
            switch (mode) {
                case 'taiko':
                    vm.modeInt = 1;
                    break
                case 'fruits':
                    vm.modeInt = 2;
                    break
                case 'mania':
                    vm.modeInt = 3;
                    break
                default:
                    vm.modeInt = 0;
            }

            switch (relax) {
                case 'rx':
                    vm.relaxInt = 1;
                    break;
                case 'ap':
                    vm.relaxInt = 2;
                    break;
                default:
                    vm.relaxInt = 0;
            }

            vm.sort = sort;
            vm.page = page;
            if (country == null)
                vm.country = ''
            else
                vm.country = country.toUpperCase()
            if (vm.page <= 0 || vm.page == null)
                vm.page = 1;
            window.history.replaceState('', document.title, `/leaderboard?m=${vm.mode}&rx=${vm.relax}&sort=${vm.sort}&p=${vm.page}&c=${vm.country}`);
            vm.$axios.get(hanayoConf.baseAPI + "/api/v1/leaderboard", {
                params: {
                    mode: vm.modeInt,
                    sort: vm.sort,
                    rx: vm.relaxInt,
                    p: vm.page,
                    country: vm.country,
                }
            })
                .then(function (response) {
                    vm.data = response.data.users || [];
                    vm.load = false;
                })
                .catch(function (error) {
                    console.error('Leaderboard error:', error);
                    vm.data = [];
                    vm.load = false;
                });
        },
        addCommas(integer) {
            integer += "", x = integer.split("."), x1 = x[0], x2 = x.length > 1 ? "." + x[1] : "";
            for (var t = /(\d+)(\d{3})/; t.test(x1);) x1 = x1.replace(t, "$1,$2");
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
            var getCountryNames = new Intl.DisplayNames(['en'], { type: 'region' });
            return getCountryNames.of(str.toUpperCase())
        },
        formatAccuracy(acc) {
            if (acc === undefined || acc === null) return '0.00';
            return parseFloat(acc).toFixed(2);
        },
        safeValue(val, def) {
            return val !== undefined && val !== null ? val : def;
        }
    },
    computed: {
    }
});
