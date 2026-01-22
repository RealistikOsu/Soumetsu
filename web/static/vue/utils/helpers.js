/**
 * Soumetsu Shared Helper Utilities
 *
 * Core formatting and utility functions used across Vue page apps.
 * These are exposed globally as SoumetsuHelpers.
 */

const SoumetsuHelpers = {
    /**
     * Add commas to a number for display (e.g., 1234567 -> "1,234,567")
     * @param {number|string|null|undefined} num - Number to format
     * @returns {string} Formatted number string
     */
    addCommas(num) {
        if (num === undefined || num === null) { return '0'; }
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Format accuracy to 2 decimal places
     * @param {number|null|undefined} acc - Accuracy value (0-100)
     * @returns {string} Formatted accuracy (e.g., "98.52")
     */
    formatAccuracy(acc) {
        if (acc === undefined || acc === null) { return '0.00'; }
        return parseFloat(acc).toFixed(2);
    },

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string|null|undefined} str - String to escape
     * @returns {string} HTML-escaped string
     */
    escapeHTML(str) {
        if (!str) { return ''; }
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Return value if not null/undefined, otherwise return default
     * @param {*} val - Value to check
     * @param {*} defaultVal - Default value to return if val is null/undefined
     * @returns {*} val or defaultVal
     */
    safeValue(val, defaultVal = 0) {
        return val !== undefined && val !== null ? val : defaultVal;
    },

    /**
     * Convert a date/timestamp to relative time string (e.g., "2 hours ago")
     * @param {string|number|Date} dateStr - Date string, Unix timestamp, or Date object
     * @returns {string} Relative time string
     */
    timeAgo(dateStr) {
        let date;
        if (typeof dateStr === 'number') {
            // Unix timestamp (seconds)
            date = new Date(dateStr * 1000);
        } else {
            date = new Date(dateStr);
        }

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

    /**
     * Humanize large numbers (e.g., 1234567 -> "1.23M")
     * @param {number|null|undefined} num - Number to humanize
     * @returns {string} Humanized number string
     */
    humanize(num) {
        if (num === undefined || num === null) { return '0'; }
        if (num >= 1e12) { return (num / 1e12).toFixed(2) + 'T'; }
        if (num >= 1e9) { return (num / 1e9).toFixed(2) + 'B'; }
        if (num >= 1e6) { return (num / 1e6).toFixed(2) + 'M'; }
        if (num >= 1e3) { return (num / 1e3).toFixed(2) + 'K'; }
        return num.toString();
    },

    /**
     * Convert large numbers to label format with words (e.g., "1.23 million")
     * @param {number} number - Number to convert
     * @returns {string|number} Formatted label or original number
     */
    humanizeLabel(number) {
        const absNum = Math.abs(Number(number));
        if (absNum >= 1.0e+12) { return (absNum / 1.0e+12).toFixed(2) + ' trillion'; }
        if (absNum >= 1.0e+9) { return (absNum / 1.0e+9).toFixed(2) + ' billion'; }
        if (absNum >= 1.0e+6) { return (absNum / 1.0e+6).toFixed(2) + ' million'; }
        if (absNum >= 1.0e+3) { return (absNum / 1.0e+3).toFixed(2) + ' thousand'; }
        return absNum;
    },

    /**
     * Format a timestamp to a readable date string
     * @param {number|string|null|undefined} timestamp - Unix timestamp or ISO string
     * @returns {string} Formatted date (e.g., "22 Jan 2026")
     */
    formatDate(timestamp) {
        if (!timestamp) { return 'Unknown'; }

        let date;
        if (typeof timestamp === 'number') {
            // Unix timestamp (seconds)
            date = new Date(timestamp * 1000);
        } else if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else {
            return 'Unknown';
        }

        if (isNaN(date.getTime())) { return 'Unknown'; }

        return new Intl.DateTimeFormat('en-gb', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    },

    /**
     * Get country name from country code
     * @param {string} code - Two-letter country code
     * @returns {string} Country name or original code if not found
     */
    getCountryName(code) {
        try {
            return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase());
        } catch {
            return code;
        }
    },

    /**
     * Get player role/badge info from privileges bitmask
     * @param {number} privileges - User privilege bitmask
     * @returns {Object|null} Role object with name, color, bg, icon or null
     */
    getPlayerRole(privileges) {
        if (privileges & 8388608) {
            return { name: 'Admin', color: 'text-red-400', bg: 'bg-red-500/20', icon: 'fa-shield-alt' };
        }
        if (privileges & 4194304) {
            return { name: 'Moderator', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: 'fa-gavel' };
        }
        if (privileges & 256) {
            return { name: 'BAT', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: 'fa-music' };
        }
        if (privileges & 4) {
            return { name: 'Supporter', color: 'text-pink-400', bg: 'bg-pink-500/20', icon: 'fa-heart' };
        }
        return null;
    },

    /**
     * Format PP or score value for display
     * @param {number|null} pp - PP value
     * @param {number} score - Score value
     * @param {number} ranked - Ranked status (optional)
     * @returns {string} Formatted string (e.g., "1,234pp" or "1,234,567")
     */
    ppOrScore(pp, score, ranked) {
        if (pp && pp > 0) {
            return `${this.addCommas(Math.round(pp))}pp`;
        }
        return this.addCommas(score);
    },

    /**
     * Check if running on mobile device based on window width
     * @returns {boolean} True if window width < 768px
     */
    isMobile() {
        return window.innerWidth < 768;
    },

    /**
     * Add one to a page number (for pagination)
     * @param {number|string} page - Current page number
     * @returns {number} page + 1
     */
    addOne(page) {
        return parseInt(page) + 1;
    }
};

// Make available globally
window.SoumetsuHelpers = SoumetsuHelpers;
