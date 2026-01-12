/**
 * Shared utility for extracting colors from avatar images and applying them as banner gradients
 */

(function() {
	'use strict';

	// Convert RGB to HSL
	function rgbToHsl(r, g, b) {
		r /= 255; g /= 255; b /= 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h, s, l = (max + min) / 2;

		if (max === min) {
			h = s = 0;
		} else {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
				case g: h = ((b - r) / d + 2) / 6; break;
				case b: h = ((r - g) / d + 4) / 6; break;
			}
		}
		return [h * 360, s * 100, l * 100];
	}

	// Convert HSL to RGB
	function hslToRgb(h, s, l) {
		h /= 360; s /= 100; l /= 100;
		let r, g, b;
		if (s === 0) {
			r = g = b = l;
		} else {
			const hue2rgb = function(p, q, t) {
				if (t < 0) {t += 1;}
				if (t > 1) {t -= 1;}
				if (t < 1/6) {return p + (q - p) * 6 * t;}
				if (t < 1/2) {return q;}
				if (t < 2/3) {return p + (q - p) * (2/3 - t) * 6;}
				return p;
			};
			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1/3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1/3);
		}
		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}

	// Enhance color for gradient
	function enhanceForGradient(rgb) {
		const r = rgb[0], g = rgb[1], b = rgb[2];
		const hsl = rgbToHsl(r, g, b);
		const h = hsl[0], s = hsl[1], l = hsl[2];

		let newS = Math.min(100, s * 1.4);
		if (newS < 50) {newS = Math.min(100, newS + 30);}

		let newL = l;
		if (newL < 35) {
			newL = 35;
		} else if (newL > 65) {
			newL = 65;
		} else {
			newL = newL * 0.9 + 50 * 0.1;
		}

		return hslToRgb(h, newS, newL);
	}

	// Extract banner colors from image
	function extractBannerColors(img, callback) {
		if (!img || !img.complete || img.src.startsWith('data:image/svg+xml')) {
			if (callback) {callback(null);}
			return;
		}

		try {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			const size = 100;
			canvas.width = size;
			canvas.height = size;

			ctx.drawImage(img, 0, 0, size, size);

			let imageData;
			try {
				imageData = ctx.getImageData(0, 0, size, size);
			} catch (corsError) {
				if (callback) {callback(null);}
				return;
			}

			const data = imageData.data;
			const colorCandidates = [];
			const sampleStep = 3;

			for (var i = 0; i < data.length; i += 4 * sampleStep) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				const a = data[i + 3];

				if (a < 200 || (r + g + b) < 60) {continue;}

				const hsl = rgbToHsl(r, g, b);
				const h = hsl[0], s = hsl[1], l = hsl[2];

				const saturationScore = s / 100;
				const lightnessScore = l > 30 && l < 70 ? 1 - Math.abs(l - 50) / 20 : 0.3;
				const grayPenalty = s < 10 ? 0 : 1;
				const score = saturationScore * 0.5 + lightnessScore * 0.3 + grayPenalty * 0.2;

				if (score > 0.3) {
					colorCandidates.push({
						rgb: [r, g, b],
						hsl: [h, s, l],
						score: score
					});
				}
			}

			if (colorCandidates.length < 2) {
				if (callback) {callback(null);}
				return;
			}

			colorCandidates.sort(function(a, b) { return b.score - a.score; });
			const topCandidates = colorCandidates.slice(0, Math.min(15, colorCandidates.length));
			const color1 = topCandidates[0];
			let color2 = topCandidates[1];
			const h1 = color1.hsl[0];
			let bestPairScore = 0;

			for (var i = 1; i < topCandidates.length; i++) {
				var candidate = topCandidates[i];
				var h2 = candidate.hsl[0];
				var hueDiff = Math.abs(h2 - h1);
				if (hueDiff > 180) {hueDiff = 360 - hueDiff;}

				const separationScore = hueDiff > 30 && hueDiff < 150 ? 1 : 0.5;
				const vibrancyScore = (color1.score + candidate.score) / 2;
				const pairScore = separationScore * 0.6 + vibrancyScore * 0.4;

				if (pairScore > bestPairScore) {
					bestPairScore = pairScore;
					color2 = candidate;
				}
			}

			var h2 = color2.hsl[0];
			var hueDiff = Math.abs(h2 - h1);
			if (hueDiff > 180) {hueDiff = 360 - hueDiff;}

			if (hueDiff < 20 && topCandidates.length > 2) {
				for (var i = 2; i < topCandidates.length; i++) {
					var candidate = topCandidates[i];
					const candidateH = candidate.hsl[0];
					let diff = Math.abs(candidateH - h1);
					if (diff > 180) {diff = 360 - diff;}
					if (diff > 40) {
						color2 = candidate;
						break;
					}
				}
			}

			const enhanced1 = enhanceForGradient(color1.rgb);
			const enhanced2 = enhanceForGradient(color2.rgb);

			const result = {
				color1: 'rgb(' + enhanced1[0] + ', ' + enhanced1[1] + ', ' + enhanced1[2] + ')',
				color2: 'rgb(' + enhanced2[0] + ', ' + enhanced2[1] + ', ' + enhanced2[2] + ')'
			};

			if (callback) {callback(result);}
			return result;
		} catch (err) {
			if (callback) {callback(null);}
			return null;
		}
	}

	// Apply gradient to banner element
	function applyBannerGradient(bannerElement, colors) {
		if (!bannerElement) {return;}

		if (colors && colors.color1 && colors.color2) {
			const color1RGBA = colors.color1.replace('rgb', 'rgba').replace(')', ', 0.2)');
			const color2RGBA = colors.color2.replace('rgb', 'rgba').replace(')', ', 0.2)');
			bannerElement.style.background = 'linear-gradient(to bottom right, ' + color1RGBA + ', ' + color2RGBA + ')';
		} else {
			bannerElement.style.background = '';
		}
	}

	// Initialize banner gradient from avatar
	function initBannerGradient(avatarSelector, bannerSelector, options) {
		options = options || {};
		const avatar = typeof avatarSelector === 'string' ? document.querySelector(avatarSelector) : avatarSelector;
		const banner = typeof bannerSelector === 'string' ? document.querySelector(bannerSelector) : bannerSelector;

		if (!avatar || !banner) {return;}

		// Ensure avatar has crossorigin attribute
		if (!avatar.crossOrigin) {
			avatar.crossOrigin = 'anonymous';
		}

		// Add transition class if not present
		if (options.addTransition !== false) {
			banner.classList.add('banner-gradient-transition');
		}

		function updateGradient() {
			extractBannerColors(avatar, function(colors) {
				applyBannerGradient(banner, colors);
			});
		}

		// Extract colors when avatar loads
		if (avatar.complete && avatar.naturalWidth > 0) {
			updateGradient();
		} else {
			avatar.addEventListener('load', updateGradient);
		}

		// Return update function for manual triggering
		return updateGradient;
	}

	// Inject CSS for transition if not already present
	if (!document.getElementById('banner-gradient-styles')) {
		const style = document.createElement('style');
		style.id = 'banner-gradient-styles';
		style.textContent = '.banner-gradient-transition { transition: background 0.8s ease-in-out; }';
		document.head.appendChild(style);
	}

	// Export to window
	window.BannerGradient = {
		extract: extractBannerColors,
		apply: applyBannerGradient,
		init: initBannerGradient
	};
})();
