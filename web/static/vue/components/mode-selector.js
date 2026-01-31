/**
 * Mode Selector Component
 *
 * Reusable component for selecting game mode and custom mode (relax/autopilot).
 * Handles mode availability rules automatically.
 *
 * Props:
 *   - mode: Current game mode (0-3)
 *   - customMode: Current custom mode (0-2)
 *   - showCustomModes: Whether to show custom mode buttons
 *   - variant: 'pills' | 'buttons' | 'compact'
 *   - disabled: Whether the entire selector is disabled
 *
 * Events:
 *   - @update:mode: Emitted when mode changes
 *   - @update:custom-mode: Emitted when custom mode changes
 */

const ModeSelectorComponent = {
  name: 'ModeSelector',
  props: {
    mode: {
      type: Number,
      default: 0,
    },
    customMode: {
      type: Number,
      default: 0,
    },
    showCustomModes: {
      type: Boolean,
      default: true,
    },
    variant: {
      type: String,
      default: 'pills',
      validator: (v) => ['pills', 'buttons', 'compact'].includes(v),
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:mode', 'update:custom-mode'],
  data() {
    return {
      modes: [
        { id: 0, name: 'Standard', icon: 'fa-circle', short: 'STD' },
        { id: 1, name: 'Taiko', icon: 'fa-drum', short: 'TAI' },
        { id: 2, name: 'Catch', icon: 'fa-apple-whole', short: 'CTB' },
        { id: 3, name: 'Mania', icon: 'fa-keyboard', short: 'MAN' },
      ],
      customModes: [
        { id: 0, name: 'Vanilla', short: 'VN' },
        { id: 1, name: 'Relax', short: 'RX' },
        { id: 2, name: 'Autopilot', short: 'AP' },
      ],
    };
  },
  computed: {
    modeButtonClass() {
      const base = 'transition-all duration-200';
      switch (this.variant) {
        case 'compact':
          return `${base} px-2 py-1 text-xs rounded`;
        case 'buttons':
          return `${base} px-4 py-2 rounded-lg border`;
        case 'pills':
        default:
          return `${base} px-3 py-1.5 rounded-full text-sm`;
      }
    },
    customModeButtonClass() {
      const base = 'transition-all duration-200';
      switch (this.variant) {
        case 'compact':
          return `${base} px-2 py-1 text-xs rounded`;
        case 'buttons':
          return `${base} px-3 py-1.5 rounded-lg border`;
        case 'pills':
        default:
          return `${base} px-2.5 py-1 rounded-full text-xs`;
      }
    },
  },
  methods: {
    isModeDisabled(modeId) {
      if (this.disabled) {
        return true;
      }
      return SoumetsuGameHelpers.isModeDisabled(modeId, this.customMode);
    },
    isCustomModeDisabled(cmId) {
      if (this.disabled) {
        return true;
      }
      return SoumetsuGameHelpers.isCustomModeDisabled(cmId, this.mode);
    },
    getModeClasses(modeId) {
      const isActive = this.mode === modeId;
      const isDisabled = this.isModeDisabled(modeId);

      if (isDisabled) {
        return `${this.modeButtonClass} bg-dark-card/30 text-gray-600 cursor-not-allowed`;
      }
      if (isActive) {
        return `${this.modeButtonClass} bg-primary text-white`;
      }
      return `${this.modeButtonClass} bg-dark-card/50 text-gray-300 hover:bg-dark-card hover:text-white cursor-pointer`;
    },
    getCustomModeClasses(cmId) {
      const isActive = this.customMode === cmId;
      const isDisabled = this.isCustomModeDisabled(cmId);

      if (isDisabled) {
        return `${this.customModeButtonClass} bg-dark-card/30 text-gray-600 cursor-not-allowed`;
      }
      if (isActive) {
        return `${this.customModeButtonClass} bg-primary/80 text-white`;
      }
      return `${this.customModeButtonClass} bg-dark-card/50 text-gray-400 hover:bg-dark-card hover:text-white cursor-pointer`;
    },
    selectMode(modeId) {
      if (this.isModeDisabled(modeId)) {
        return;
      }
      if (this.mode !== modeId) {
        this.$emit('update:mode', modeId);
      }
    },
    selectCustomMode(cmId) {
      if (this.isCustomModeDisabled(cmId)) {
        return;
      }
      if (this.customMode !== cmId) {
        this.$emit('update:custom-mode', cmId);
      }
    },
  },
  template: `
        <div class="mode-selector">
            <!-- Game Mode Selection -->
            <div class="flex flex-wrap gap-2 mb-3" v-if="variant !== 'compact'">
                <button
                    v-for="m in modes"
                    :key="m.id"
                    :class="getModeClasses(m.id)"
                    :disabled="isModeDisabled(m.id)"
                    @click="selectMode(m.id)"
                    :title="m.name">
                    <i :class="'fas ' + m.icon + ' mr-1.5'"></i>
                    <span>[[ m.name ]]</span>
                </button>
            </div>

            <!-- Compact Game Mode Selection -->
            <div class="flex gap-1 mb-2" v-else>
                <button
                    v-for="m in modes"
                    :key="m.id"
                    :class="getModeClasses(m.id)"
                    :disabled="isModeDisabled(m.id)"
                    @click="selectMode(m.id)"
                    :title="m.name">
                    [[ m.short ]]
                </button>
            </div>

            <!-- Custom Mode Selection -->
            <div v-if="showCustomModes" class="flex gap-2">
                <button
                    v-for="cm in customModes"
                    :key="cm.id"
                    :class="getCustomModeClasses(cm.id)"
                    :disabled="isCustomModeDisabled(cm.id)"
                    @click="selectCustomMode(cm.id)"
                    :title="cm.name">
                    [[ cm.short ]]
                </button>
            </div>
        </div>
    `,
};

/**
 * Inline Mode Selector
 * Simpler version for use in headers/navbars
 */
const InlineModeSelectorComponent = {
  name: 'InlineModeSelector',
  props: {
    mode: {
      type: Number,
      default: 0,
    },
    customMode: {
      type: Number,
      default: 0,
    },
    showCustomModes: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:mode', 'update:custom-mode'],
  data() {
    return {
      modeNames: ['std', 'taiko', 'fruits', 'mania'],
      customModeNames: ['vn', 'rx', 'ap'],
    };
  },
  computed: {
    currentModeName() {
      return this.modeNames[this.mode] || 'std';
    },
    currentCustomModeName() {
      return this.customModeNames[this.customMode] || 'vn';
    },
  },
  methods: {
    isModeDisabled(modeId) {
      return SoumetsuGameHelpers.isModeDisabled(modeId, this.customMode);
    },
    isCustomModeDisabled(cmId) {
      return SoumetsuGameHelpers.isCustomModeDisabled(cmId, this.mode);
    },
    selectMode(modeName) {
      const modeId = this.modeNames.indexOf(modeName);
      if (modeId !== -1 && !this.isModeDisabled(modeId) && this.mode !== modeId) {
        this.$emit('update:mode', modeId);
      }
    },
    selectCustomMode(cmName) {
      const cmId = this.customModeNames.indexOf(cmName);
      if (cmId !== -1 && !this.isCustomModeDisabled(cmId) && this.customMode !== cmId) {
        this.$emit('update:custom-mode', cmId);
      }
    },
  },
  template: `
        <div class="inline-flex items-center gap-1 text-sm">
            <select
                :value="currentModeName"
                @change="selectMode($event.target.value)"
                class="bg-dark-card border border-dark-border rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-primary">
                <option v-for="(name, idx) in modeNames" :key="idx" :value="name" :disabled="isModeDisabled(idx)">
                    [[ name.charAt(0).toUpperCase() + name.slice(1) ]]
                </option>
            </select>
            <select
                v-if="showCustomModes"
                :value="currentCustomModeName"
                @change="selectCustomMode($event.target.value)"
                class="bg-dark-card border border-dark-border rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-primary">
                <option v-for="(name, idx) in customModeNames" :key="idx" :value="name" :disabled="isCustomModeDisabled(idx)">
                    [[ name.toUpperCase() ]]
                </option>
            </select>
        </div>
    `,
};

// Export components
window.ModeSelectorComponent = ModeSelectorComponent;
window.InlineModeSelectorComponent = InlineModeSelectorComponent;
