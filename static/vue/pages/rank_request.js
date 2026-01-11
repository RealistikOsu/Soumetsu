new Vue({
	el: "#app",
	delimiters: ["<%", "%>"],

	data() {
		return {
			load: true,
			error: false,
			errorMessage: "",

			status: null,

			beatmapUrl: "",
			submitting: false,
			submitMessage: "",
			submitOk: false,
		};
	},

	created() {
		this.fetchStatus();
	},

	computed: {
		apiBase() {
			return (window.soumetsuConf && window.soumetsuConf.baseAPI) ? window.soumetsuConf.baseAPI : "";
		},

		apiConfigured() {
			return this.apiBase !== "";
		},

		percent() {
			if (!this.status) return 0;

			var submitted = this.safeInt(this.status.submitted);
			var queueSize = this.safeInt(this.status.queue_size);
			if (queueSize <= 0) return 0;

			var pct = Math.round((submitted / queueSize) * 100);
			if (pct < 0) return 0;
			if (pct > 100) return 100;
			return pct;
		},
	},

	methods: {
		safeInt(val) {
			var n = Number(val);
			if (!Number.isFinite(n)) return 0;
			return Math.floor(n);
		},

		fetchStatus() {
			var vm = this;

			vm.load = true;
			vm.error = false;
			vm.errorMessage = "";
			vm.submitMessage = "";
			vm.submitOk = false;

			if (!vm.apiConfigured) {
				vm.load = false;
				vm.error = true;
				vm.errorMessage = "soumetsuConf.baseAPI is not set";
				return;
			}

			// Uses VueAxios injection (like leaderboards.js)
			vm.$axios.get(vm.apiBase + "/api/v1/beatmaps/rank_requests/status", {
				withCredentials: true,
			})
				.then(function (response) {
					var data = response && response.data ? response.data : null;
					var payload = (data && data.data) ? data.data : data;

					if (!payload || typeof payload !== "object") {
						throw new Error("Malformed response");
					}

					vm.status = payload;
					vm.load = false;
				})
				.catch(function (error) {
					console.error("Rank request status error:", error);

					vm.load = false;
					vm.error = true;

					if (error && error.response && error.response.status) {
						vm.errorMessage = "HTTP " + error.response.status;
					} else if (error && error.message) {
						vm.errorMessage = error.message;
					} else {
						vm.errorMessage = "Request failed";
					}
				});
		},

		submitBeatmap() {
			var vm = this;

			vm.submitMessage = "";
			vm.submitOk = false;

			var url = (vm.beatmapUrl || "").trim();
			if (!url) {
				vm.submitMessage = "Please paste a beatmap URL.";
				return;
			}

			if (!vm.apiConfigured) {
				vm.submitMessage = "Submission is unavailable: API is not configured.";
				return;
			}

			if (vm.status && vm.status.can_submit === false) {
				vm.submitMessage = "You have reached your daily limit for requesting beatmaps.";
				return;
			}

			// If you don't have this endpoint yet, it will fail gracefully.
			var submitUrl = vm.apiBase + "/api/v1/beatmaps/rank_requests";

			vm.submitting = true;

			vm.$axios.post(submitUrl, { url: url }, { withCredentials: true })
				.then(function () {
					vm.submitOk = true;
					vm.submitMessage = "Submitted! Your request should appear in the queue shortly.";
					vm.beatmapUrl = "";
					vm.fetchStatus();
				})
				.catch(function (error) {
					console.error("Rank request submit error:", error);

					vm.submitOk = false;
					if (error && error.response && error.response.status) {
						vm.submitMessage = "Could not submit: HTTP " + error.response.status;
					} else if (error && error.message) {
						vm.submitMessage = "Could not submit: " + error.message;
					} else {
						vm.submitMessage = "Could not submit: request failed";
					}
				})
				.finally(function () {
					vm.submitting = false;
				});
		},
	},
});
