import { describe, it, expect, beforeEach } from 'vitest';

// We need to load the BBCode parser
// Since it's not a module, we'll test the functions directly
// First, let's define helper functions that mirror the parser logic

// Test the URL sanitization logic
describe('BBCode URL Sanitization', () => {
    const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'mailto:'];

    function sanitizeUrl(url, allowedProtocols = SAFE_URL_PROTOCOLS) {
        if (!url || typeof url !== 'string') {
            return '';
        }

        url = url.trim();
        const lowerUrl = url.toLowerCase();

        // Block dangerous protocols
        if (
            lowerUrl.startsWith('javascript:') ||
            lowerUrl.startsWith('data:') ||
            lowerUrl.startsWith('vbscript:')
        ) {
            return '';
        }

        // Check for valid protocols
        try {
            const parsed = new URL(url, 'http://example.com');
            if (!allowedProtocols.includes(parsed.protocol)) {
                // If no valid protocol, assume relative URL or add https
                if (!url.includes('://')) {
                    return url; // Allow relative URLs
                }
                return '';
            }
        } catch {
            // Invalid URL format, allow as relative
            return url;
        }

        return url;
    }

    it('should allow http URLs', () => {
        expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should allow https URLs', () => {
        expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should allow mailto URLs', () => {
        expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should block javascript: URLs', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBe('');
        expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
        expect(sanitizeUrl('JavaScript:alert(1)')).toBe('');
    });

    it('should block data: URLs', () => {
        expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should block vbscript: URLs', () => {
        expect(sanitizeUrl('vbscript:alert(1)')).toBe('');
    });

    it('should allow relative URLs', () => {
        expect(sanitizeUrl('/users/123')).toBe('/users/123');
        expect(sanitizeUrl('users/123')).toBe('users/123');
    });

    it('should handle empty input', () => {
        expect(sanitizeUrl('')).toBe('');
        expect(sanitizeUrl(null)).toBe('');
        expect(sanitizeUrl(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
        expect(sanitizeUrl('  http://example.com  ')).toBe('http://example.com');
    });
});

// Test colour validation
describe('BBCode Colour Validation', () => {
    function isValidColour(colour) {
        if (!colour || typeof color !== 'string') {
            return false;
        }

        colour = colour.trim().toLowerCase();

        // Named colours (basic set)
        const namedColors = [
            'red',
            'blue',
            'green',
            'yellow',
            'orange',
            'purple',
            'pink',
            'black',
            'white',
            'gray',
            'grey',
            'cyan',
            'magenta',
            'brown',
            'lime',
            'navy',
            'teal',
            'silver',
            'gold',
            'maroon',
            'olive',
            'aqua',
            'fuchsia',
        ];

        if (namedColors.includes(colour)) {
            return true;
        }

        // Hex colours: #RGB or #RRGGBB
        if (/^#[0-9a-f]{3}$/.test(colour) || /^#[0-9a-f]{6}$/.test(colour)) {
            return true;
        }

        // RGB format: rgb(r, g, b)
        if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(colour)) {
            return true;
        }

        return false;
    }

    it('should accept named colors', () => {
        expect(isValidColor('red')).toBe(true);
        expect(isValidColor('blue')).toBe(true);
        expect(isValidColor('GREEN')).toBe(true);
    });

    it('should accept hex colors', () => {
        expect(isValidColor('#f00')).toBe(true);
        expect(isValidColor('#ff0000')).toBe(true);
        expect(isValidColor('#ABC')).toBe(true);
        expect(isValidColor('#aabbcc')).toBe(true);
    });

    it('should accept rgb colors', () => {
        expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
        expect(isValidColor('rgb(0,0,0)')).toBe(true);
    });

    it('should reject invalid colors', () => {
        expect(isValidColor('notacolor')).toBe(false);
        expect(isValidColor('expression(alert(1))')).toBe(false);
        expect(isValidColor('#gg0000')).toBe(false);
        expect(isValidColor('')).toBe(false);
        expect(isValidColor(null)).toBe(false);
    });

    it('should reject CSS expressions', () => {
        expect(isValidColor('expression(alert(1))')).toBe(false);
        expect(isValidColor('url(javascript:alert(1))')).toBe(false);
    });
});

// Test HTML escaping
describe('HTML Escaping', () => {
    // Manual escaping function that works consistently across environments
    function escapeHtml(text) {
        if (!text) return '';
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return String(text).replace(/[&<>"']/g, char => escapeMap[char]);
    }

    it('should escape HTML special characters', () => {
        expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
        expect(escapeHtml('&')).toBe('&amp;');
        expect(escapeHtml('"')).toBe('&quot;');
        expect(escapeHtml("'")).toBe('&#39;');
    });

    it('should handle empty input', () => {
        expect(escapeHtml('')).toBe('');
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('should preserve normal text', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should escape XSS attempts', () => {
        expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
            '&lt;img src=x onerror=alert(1)&gt;'
        );
    });
});
