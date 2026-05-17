/**
 * Soumetsu Game Helper Utilities
 *
 * osu!-specific utilities for modes, mods, and rank calculations.
 * These are exposed globally as SoumetsuGameHelpers.
 */

const SILVER_RANK_ACRONYMS = new Set(['HD', 'FL', 'FI']);
const SPEED_CHANGE_ACRONYMS = new Set(['DT', 'HT', 'NC']);
const CANONICAL_SPEED_RATES = { DT: 1.5, NC: 1.5, HT: 0.75 };

function formatModToken(mod) {
  const acronym = mod.acronym;
  if (!SPEED_CHANGE_ACRONYMS.has(acronym)) {
    return acronym;
  }
  const rate = mod.settings && mod.settings.speed_change;
  const canonical = CANONICAL_SPEED_RATES[acronym];
  if (typeof rate !== 'number' || Math.abs(rate - canonical) < 0.01) {
    return acronym;
  }
  return `${acronym}(${rate}x)`;
}

const SoumetsuGameHelpers = {
  /**
   * Get the rank grade for a score
   * @param {number} mode - Game mode (0=std, 1=taiko, 2=ctb, 3=mania)
   * @param {Array<{acronym: string, settings?: object}>} mods - Mods array
   * @param {number} acc - Accuracy (0-100)
   * @param {number} c300 - Count 300
   * @param {number} c100 - Count 100
   * @param {number} c50 - Count 50
   * @param {number} cmiss - Count miss
   * @param {number} completed - Completed status (3 = passed, anything else = failed)
   * @returns {string} Rank grade (SS, SS+, S, S+, A, B, C, D, F)
   */
  getRank(mode, mods, acc, c300, c100, c50, cmiss, completed = 3) {
    if (completed !== 3) {
      return 'F';
    }

    const total = c300 + c100 + c50 + cmiss;
    if (total === 0) {
      return 'D';
    }

    const hdfl = Array.isArray(mods) && mods.some((m) => SILVER_RANK_ACRONYMS.has(m.acronym));
    const ss = hdfl ? 'SS+' : 'SS';
    const s = hdfl ? 'S+' : 'S';

    if (mode === 0 || mode === 1) {
      // Standard and Taiko
      const r300 = c300 / total;
      const r50 = c50 / total;
      if (r300 === 1) {
        return ss;
      }
      if (r300 > 0.9 && r50 <= 0.01 && cmiss === 0) {
        return s;
      }
      if ((r300 > 0.8 && cmiss === 0) || r300 > 0.9) {
        return 'A';
      }
      if ((r300 > 0.7 && cmiss === 0) || r300 > 0.8) {
        return 'B';
      }
      if (r300 > 0.6) {
        return 'C';
      }
      return 'D';
    }

    if (mode === 2) {
      // Catch the Beat
      if (acc === 100) {
        return ss;
      }
      if (acc > 98) {
        return s;
      }
      if (acc > 94) {
        return 'A';
      }
      if (acc > 90) {
        return 'B';
      }
      if (acc > 85) {
        return 'C';
      }
      return 'D';
    }

    if (mode === 3) {
      // Mania
      if (acc === 100) {
        return ss;
      }
      if (acc > 95) {
        return s;
      }
      if (acc > 90) {
        return 'A';
      }
      if (acc > 80) {
        return 'B';
      }
      if (acc > 70) {
        return 'C';
      }
      return 'D';
    }

    return 'D';
  },

  /**
   * Convert a mods array to display string.
   * Filters out CL (Classic) since it's the stable-client implicit default.
   * Speed-changing mods (DT/HT/NC) get a "(<rate>x)" suffix only when the
   * speed differs from the canonical rate for that mod.
   * @param {Array<{acronym: string, settings?: object}>} mods
   * @returns {string} Mod string (e.g., "HDDT", "DT(1.2x)", or "None")
   */
  getScoreMods(mods) {
    const tokens = this.getScoreModsArray(mods);
    return tokens.length ? tokens.join('') : 'None';
  },

  /**
   * Get displayable mod tokens as an array (CL filtered out).
   * Each token is the display string for one mod, e.g. "HD" or "DT(1.2x)".
   * @param {Array<{acronym: string, settings?: object}>} mods
   * @returns {string[]}
   */
  getScoreModsArray(mods) {
    if (!Array.isArray(mods)) {
      return [];
    }
    const tokens = [];
    for (const mod of mods) {
      if (!mod || mod.acronym === 'CL') {
        continue;
      }
      tokens.push(formatModToken(mod));
    }
    return tokens;
  },

  /**
   * Check if a custom mode is disabled for the given game mode
   * @param {number} customMode - Custom mode (0=vanilla, 1=relax, 2=autopilot)
   * @param {number} mode - Game mode (0-3)
   * @returns {boolean} True if disabled
   */
  isCustomModeDisabled(customMode, mode) {
    if (customMode === 1 && mode === 3) {
      return true;
    } // No relax for mania
    if (customMode === 2 && mode !== 0) {
      return true;
    } // Autopilot only for std
    return false;
  },

  /**
   * Check if a game mode is disabled for the given custom mode
   * @param {number} mode - Game mode (0-3)
   * @param {number} customMode - Custom mode (0-2)
   * @returns {boolean} True if disabled
   */
  isModeDisabled(mode, customMode) {
    if (customMode === 1 && mode === 3) {
      return true;
    } // No mania for relax
    if (customMode === 2 && mode !== 0) {
      return true;
    } // Autopilot only for std
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
    if (customMode === 1) {
      m += 4;
    } else if (customMode === 2) {
      m += 7;
    }
    return m;
  },
};

// Make available globally
window.SoumetsuGameHelpers = SoumetsuGameHelpers;
