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

		apiToken() {
			return (window.soumetsuConf && window.soumetsuConf.apiToken) ? window.soumetsuConf.apiToken : "";
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

			const headers = {};
			if (this.apiToken) {
				headers['Authorization'] = 'Bearer ' + this.apiToken;
			}

			try {
				const response = await fetch(this.apiBase + "/api/v2/beatmaps/rank-requests/status", {
					headers: headers,
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

		getErrorMessage(errorCode) {
			const errorMessages = {
				'beatmaps.invalid_url': 'Invalid beatmap URL. Please use a valid osu! or server beatmap link.',
				'beatmaps.beatmap_not_found': 'Beatmap not found. Make sure the beatmap exists.',
				'beatmaps.already_requested': 'This beatmap has already been requested.',
				'beatmaps.already_ranked': 'This beatmap is already ranked.',
				'beatmaps.daily_limit_reached': 'You have reached your daily limit for requesting beatmaps.',
				'auth.unauthenticated': 'You must be logged in to submit rank requests.',
			};
			return errorMessages[errorCode] || null;
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

			const headers = {
				'Content-Type': 'application/json',
			};
			if (this.apiToken) {
				headers['Authorization'] = 'Bearer ' + this.apiToken;
			}

			try {
				const response = await fetch(submitUrl, {
					method: 'POST',
					headers: headers,
					credentials: 'include',
					body: JSON.stringify({ url: url }),
				});

				const data = await response.json();

				if (!response.ok) {
					const errorCode = data.data || data.error || null;
					const friendlyMessage = this.getErrorMessage(errorCode);
					if (friendlyMessage) {
						throw new Error(friendlyMessage);
					}
					throw new Error("Request failed (HTTP " + response.status + ")");
				}

				this.submitOk = true;
				this.submitMessage = "Submitted! Your request should appear in the queue shortly.";
				this.beatmapUrl = "";
				this.fetchStatus();
			} catch (error) {
				console.error("Rank request submit error:", error);

				this.submitOk = false;
				this.submitMessage = error.message || "Request failed";
			} finally {
				this.submitting = false;
			}
		},
	},
});

rankRequestApp.mount('#app');
