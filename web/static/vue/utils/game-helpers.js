/**
 * Soumetsu Game Helper Utilities
 *
 * osu!-specific utilities for modes, mods, and rank calculations.
 * These are exposed globally as SoumetsuGameHelpers.
 */

const SoumetsuGameHelpers = {
    /**
     * Standard mod bitmask map
     */
    MODS: {
        NF: 1, EZ: 2, TD: 4, HD: 8, HR: 16, SD: 32,
        DT: 64, RX: 128, HT: 256, NC: 512, FL: 1024,
        AU: 2048, SO: 4096, AP: 8192, PF: 16384
    },

    /**
     * Extended mod bitmask map (includes mania key mods)
     */
    MODS_EXTENDED: {
        NF: 1, EZ: 2, TD: 4, HD: 8, HR: 16, SD: 32,
        DT: 64, RX: 128, HT: 256, NC: 512, FL: 1024,
        AU: 2048, SO: 4096, AP: 8192, PF: 16384,
        K4: 32768, K5: 65536, K6: 131072, K7: 262144,
        K8: 524288, FI: 1048576, RN: 2097152, LM: 4194304,
        K9: 16777216, K1: 33554432, K3: 67108864, K2: 134217728,
        S2: 536870912, MR: 1073741824
    },

    /**
     * HD + FL + FI bitmask for silver ranks
     */
    HDFL_MASK: 1049608,

    /**
     * Get the rank grade for a score
     * @param {number} mode - Game mode (0=std, 1=taiko, 2=ctb, 3=mania)
     * @param {number} mods - Mods bitmask
     * @param {number} acc - Accuracy (0-100)
     * @param {number} c300 - Count 300
     * @param {number} c100 - Count 100
     * @param {number} c50 - Count 50
     * @param {number} cmiss - Count miss
     * @param {number} completed - Completed status (3 = passed, anything else = failed)
     * @returns {string} Rank grade (SS, SS+, S, S+, A, B, C, D, F)
     */
    getRank(mode, mods, acc, c300, c100, c50, cmiss, completed = 3) {
        if (completed !== 3) { return 'F'; }

        const total = c300 + c100 + c50 + cmiss;
        if (total === 0) { return 'D'; }

        const hdfl = (mods & this.HDFL_MASK) > 0;
        const ss = hdfl ? 'SS+' : 'SS';
        const s = hdfl ? 'S+' : 'S';

        if (mode === 0 || mode === 1) {
            // Standard and Taiko
            const r300 = c300 / total;
            const r50 = c50 / total;
            if (r300 === 1) { return ss; }
            if (r300 > 0.9 && r50 <= 0.01 && cmiss === 0) { return s; }
            if ((r300 > 0.8 && cmiss === 0) || r300 > 0.9) { return 'A'; }
            if ((r300 > 0.7 && cmiss === 0) || r300 > 0.8) { return 'B'; }
            if (r300 > 0.6) { return 'C'; }
            return 'D';
        }

        if (mode === 2) {
            // Catch the Beat
            if (acc === 100) { return ss; }
            if (acc > 98) { return s; }
            if (acc > 94) { return 'A'; }
            if (acc > 90) { return 'B'; }
            if (acc > 85) { return 'C'; }
            return 'D';
        }

        if (mode === 3) {
            // Mania
            if (acc === 100) { return ss; }
            if (acc > 95) { return s; }
            if (acc > 90) { return 'A'; }
            if (acc > 80) { return 'B'; }
            if (acc > 70) { return 'C'; }
            return 'D';
        }

        return 'D';
    },

    /**
     * Convert mods bitmask to string representation
     * @param {number} mods - Mods bitmask
     * @param {boolean} extended - Include mania key mods
     * @returns {string} Mod string (e.g., "HDDT" or "None")
     */
    getScoreMods(mods, extended = false) {
        if (!mods) { return 'None'; }

        const modMap = extended ? { ...this.MODS_EXTENDED } : { ...this.MODS };
        const playmods = [];

        // NC includes DT, only show NC
        if (mods & modMap.NC) {
            playmods.push('NC');
            modMap.NC = 0;
            modMap.DT = 0;
        } else if (mods & modMap.DT) {
            playmods.push('DT');
            modMap.NC = 0;
            modMap.DT = 0;
        }

        // PF includes SD, only show PF
        if (mods & modMap.PF) {
            playmods.push('PF');
            modMap.PF = 0;
            modMap.SD = 0;
        } else if (mods & modMap.SD) {
            playmods.push('SD');
            modMap.PF = 0;
            modMap.SD = 0;
        }

        for (const [mod, value] of Object.entries(modMap)) {
            if (value !== 0 && (mods & value)) {
                playmods.push(mod);
            }
        }

        return playmods.length ? playmods.join('') : 'None';
    },

    /**
     * Get mods as an array instead of string
     * @param {number} mods - Mods bitmask
     * @param {boolean} extended - Include mania key mods
     * @returns {string[]} Array of mod names
     */
    getScoreModsArray(mods, extended = false) {
        const modStr = this.getScoreMods(mods, extended);
        if (modStr === 'None') { return []; }
        // Split every 2 characters (mod names are 2 chars)
        return modStr.match(/.{1,2}/g) || [];
    },

    /**
     * Check if a custom mode is disabled for the given game mode
     * @param {number} customMode - Custom mode (0=vanilla, 1=relax, 2=autopilot)
     * @param {number} mode - Game mode (0-3)
     * @returns {boolean} True if disabled
     */
    isCustomModeDisabled(customMode, mode) {
        if (customMode === 1 && mode === 3) { return true; } // No relax for mania
        if (customMode === 2 && mode !== 0) { return true; } // Autopilot only for std
        return false;
    },

    /**
     * Check if a game mode is disabled for the given custom mode
     * @param {number} mode - Game mode (0-3)
     * @param {number} customMode - Custom mode (0-2)
     * @returns {boolean} True if disabled
     */
    isModeDisabled(mode, customMode) {
        if (customMode === 1 && mode === 3) { return true; } // No mania for relax
        if (customMode === 2 && mode !== 0) { return true; } // Autopilot only for std
        return false;
    },

    /**
     * Get mode index from string
     * @param {string} modeStr - Mode string (std, taiko, fruits, mania)
     * @returns {number} Mode index (0-3)
     */
    getModeIndex(modeStr) {
        const modeMap = { std: 0, taiko: 1, fruits: 2, mania: 3 };
        return modeMap[modeStr.toLowerCase()] ?? 0;
    },

    /**
     * Get mode string from index
     * @param {number} mode - Mode index (0-3)
     * @returns {string} Mode string
     */
    getModeString(mode) {
        const modes = ['std', 'taiko', 'fruits', 'mania'];
        return modes[mode] ?? 'std';
    },

    /**
     * Get mode display name
     * @param {number} mode - Mode index (0-3)
     * @returns {string} Display name
     */
    getModeName(mode) {
        const names = ['Standard', 'Taiko', 'Catch', 'Mania'];
        return names[mode] ?? 'Unknown';
    },

    /**
     * Get custom mode index from string
     * @param {string} cmStr - Custom mode string (vn, rx, ap)
     * @returns {number} Custom mode index (0-2)
     */
    getCustomModeIndex(cmStr) {
        const cmMap = { vn: 0, rx: 1, ap: 2 };
        return cmMap[cmStr.toLowerCase()] ?? 0;
    },

    /**
     * Get custom mode string from index
     * @param {number} cm - Custom mode index (0-2)
     * @returns {string} Custom mode string
     */
    getCustomModeString(cm) {
        const cms = ['vn', 'rx', 'ap'];
        return cms[cm] ?? 'vn';
    },

    /**
     * Get custom mode display name
     * @param {number} cm - Custom mode index (0-2)
     * @returns {string} Display name
     */
    getCustomModeName(cm) {
        const names = ['Vanilla', 'Relax', 'Autopilot'];
        return names[cm] ?? 'Vanilla';
    },

    /**
     * Get CSS class for rank grade
     * @param {string} rank - Rank grade (SS, SS+, S, S+, A, B, C, D)
     * @returns {string} CSS class
     */
    getRankClass(rank) {
        return `rank-${rank.toLowerCase().replace('+', 'h')}`;
    },

    /**
     * Calculate mixed mode value (for API calls that need combined mode)
     * @param {number} mode - Game mode (0-3)
     * @param {number} customMode - Custom mode (0-2)
     * @returns {number} Mixed mode value
     */
    getMixedMode(mode, customMode) {
        let m = mode;
        if (customMode === 1) { m += 4; }
        else if (customMode === 2) { m += 7; }
        return m;
    }
};

// Make available globally
window.SoumetsuGameHelpers = SoumetsuGameHelpers;
