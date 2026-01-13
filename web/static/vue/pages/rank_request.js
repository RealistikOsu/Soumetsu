const rankRequestApp = Soumetsu.createApp({
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

	computed: {
		apiBase() {
			return (window.soumetsuConf && window.soumetsuConf.baseAPI) ? window.soumetsuConf.baseAPI : "";
		},

		apiConfigured() {
			return this.apiBase !== "";
		},

		percent() {
			if (!this.status) {return 0;}

			const submitted = this.safeInt(this.status.submitted);
			const queueSize = this.safeInt(this.status.queue_size);
			if (queueSize <= 0) {return 0;}

			const pct = Math.round((submitted / queueSize) * 100);
			if (pct < 0) {return 0;}
			if (pct > 100) {return 100;}
			return pct;
		},
	},

	created() {
		this.fetchStatus();
	},

	methods: {
		safeInt(val) {
			const n = Number(val);
			if (!Number.isFinite(n)) {return 0;}
			return Math.floor(n);
		},

		async fetchStatus() {
			this.load = true;
			this.error = false;
			this.errorMessage = "";
			this.submitMessage = "";
			this.submitOk = false;

			if (!this.apiConfigured) {
				this.load = false;
				this.error = true;
				this.errorMessage = "soumetsuConf.baseAPI is not set";
				return;
			}

			try {
				const response = await fetch(this.apiBase + "/api/v2/beatmaps/rank-requests/status", {
					credentials: 'include',
				});

				if (!response.ok) {
					throw new Error("HTTP " + response.status);
				}

				const data = await response.json();
				const payload = data.data !== undefined ? data.data : data;

				if (!payload || typeof payload !== "object") {
					throw new Error("Malformed response");
				}

				this.status = payload;
				this.load = false;
			} catch (error) {
				console.error("Rank request status error:", error);

				this.load = false;
				this.error = true;
				this.errorMessage = error.message || "Request failed";
			}
		},

		async submitBeatmap() {
			this.submitMessage = "";
			this.submitOk = false;

			const url = (this.beatmapUrl || "").trim();
			if (!url) {
				this.submitMessage = "Please paste a beatmap URL.";
				return;
			}

			if (!this.apiConfigured) {
				this.submitMessage = "Submission is unavailable: API is not configured.";
				return;
			}

			if (this.status && this.status.can_submit === false) {
				this.submitMessage = "You have reached your daily limit for requesting beatmaps.";
				return;
			}

			const submitUrl = this.apiBase + "/api/v2/beatmaps/rank-requests";

			this.submitting = true;

			try {
				const response = await fetch(submitUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					credentials: 'include',
					body: JSON.stringify({ url: url }),
				});

				if (!response.ok) {
					throw new Error("HTTP " + response.status);
				}

				this.submitOk = true;
				this.submitMessage = "Submitted! Your request should appear in the queue shortly.";
				this.beatmapUrl = "";
				this.fetchStatus();
			} catch (error) {
				console.error("Rank request submit error:", error);

				this.submitOk = false;
				this.submitMessage = "Could not submit: " + (error.message || "request failed");
			} finally {
				this.submitting = false;
			}
		},
	},
});

rankRequestApp.mount('#app');
