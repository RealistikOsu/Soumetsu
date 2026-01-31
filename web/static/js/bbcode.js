(function (window) {
  'use strict';

  // Safe URL protocols whitelist
  const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'mailto:'];
  const SAFE_MEDIA_PROTOCOLS = ['http:', 'https:'];

  function randString(n) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < n; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  function clamp(x, min, max) {
    if (x < min) {
      return min;
    }
    if (x > max) {
      return max;
    }
    return x;
  }

  function clampFloat(x, min, max) {
    if (x < min) {
      return min;
    }
    if (x > max) {
      return max;
    }
    return x;
  }

  function escapeHtml(text) {
    if (!text) {
      return '';
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Escape for use in HTML attributes (additional safety)
  function escapeAttr(text) {
    if (!text) {
      return '';
    }
    return escapeHtml(text).replace(/`/g, '&#96;');
  }

  // Validate URL protocol - returns safe URL or empty string
  function sanitizeUrl(url, allowedProtocols) {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return '';
    }

    // Check for javascript:, data:, vbscript:, etc.
    const lowerUrl = trimmedUrl.toLowerCase().replace(/\s/g, '');

    // Block dangerous protocols
    if (
      lowerUrl.startsWith('javascript:') ||
      lowerUrl.startsWith('data:') ||
      lowerUrl.startsWith('vbscript:') ||
      lowerUrl.startsWith('file:')
    ) {
      return '';
    }

    // If it's a relative URL or anchor, allow it
    if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#') || trimmedUrl.startsWith('./')) {
      return escapeAttr(trimmedUrl);
    }

    // Try to parse as URL to validate protocol
    try {
      const parsed = new URL(trimmedUrl, window.location.origin);
      if (allowedProtocols.includes(parsed.protocol)) {
        return escapeAttr(trimmedUrl);
      }
    } catch (e) {
      // If URL parsing fails, check if it looks like a relative path
      if (!trimmedUrl.includes(':')) {
        return escapeAttr(trimmedUrl);
      }
    }

    return '';
  }

  // Validate colour value - only allow safe CSS colour values
  function sanitizeColour(colour) {
    if (!colour || typeof colour !== 'string') {
      return '';
    }

    const trimmed = colour.trim().toLowerCase();

    // Allow hex colours
    if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
      return trimmed;
    }

    // Allow rgb/rgba/hsl/hsla
    if (/^(rgb|rgba|hsl|hsla)\([^)]+\)$/i.test(trimmed)) {
      // Additional check: no expressions or urls inside
      if (!/expression|url|javascript/i.test(trimmed)) {
        return trimmed;
      }
      return '';
    }

    // Allow named colours (common ones)
    const namedColors = [
      'black',
      'white',
      'red',
      'green',
      'blue',
      'yellow',
      'orange',
      'purple',
      'pink',
      'brown',
      'gray',
      'grey',
      'cyan',
      'magenta',
      'lime',
      'navy',
      'teal',
      'aqua',
      'maroon',
      'olive',
      'silver',
      'fuchsia',
      'transparent',
      'gold',
      'coral',
      'crimson',
      'darkblue',
      'darkgreen',
      'darkred',
      'lightblue',
      'lightgreen',
      'lightgray',
      'lightgrey',
      'darkgray',
      'darkgrey',
      'indigo',
      'violet',
      'turquoise',
      'salmon',
      'khaki',
      'plum',
      'orchid',
      'tomato',
      'skyblue',
      'steelblue',
      'slategray',
      'slategrey',
      'wheat',
      'tan',
    ];
    if (namedColors.includes(trimmed)) {
      return trimmed;
    }

    return '';
  }

  function parseBold(text) {
    text = text.replace(/\x5Bb\x5D/g, '<strong>').replace(/\x5B\/b\x5D/g, '</strong>');
    text = text.replace(/\x5Bbold\x5D/g, '<strong>').replace(/\x5B\/bold\x5D/g, '</strong>');
    return text;
  }

  function parseCentre(text) {
    text = text
      .replace(/\x5Bcentre\x5D/g, "<div style='text-align: center;'>")
      .replace(/\x5B\/centre\x5D/g, '</div>');
    text = text
      .replace(/\x5Bcenter\x5D/g, "<div style='text-align: center;'>")
      .replace(/\x5B\/center\x5D/g, '</div>');
    return text;
  }

  function parseHeading(text) {
    text = text.replace(/\x5Bheading\x5D/g, '<h2>');
    text = text.replace(/\x5B\/heading\x5D\n?/g, '</h2>');
    return text;
  }

  function parseItalic(text) {
    text = text.replace(/\x5Bi\x5D/g, '<em>').replace(/\x5B\/i\x5D/g, '</em>');
    text = text.replace(/\x5Bitalic\x5D/g, '<em>').replace(/\x5B\/italic\x5D/g, '</em>');
    return text;
  }

  function parseStrike(text) {
    text = text.replace(/\x5Bs\x5D/g, '<s>').replace(/\x5B\/s\x5D/g, '</s>');
    text = text.replace(/\x5Bstrike\x5D/g, '<s>').replace(/\x5B\/strike\x5D/g, '</s>');
    return text;
  }

  function parseUnderline(text) {
    text = text.replace(/\x5Bu\x5D/g, '<u>').replace(/\x5B\/u\x5D/g, '</u>');
    text = text.replace(/\x5Bunderline\x5D/g, '<u>').replace(/\x5B\/underline\x5D/g, '</u>');
    return text;
  }

  function parseSpoiler(text) {
    text = text
      .replace(/\x5Bspoiler\x5D/g, "<span class='bbcode-spoiler'>")
      .replace(/\x5B\/spoiler\x5D/g, '</span>');
    return text;
  }

  function parseNotice(text) {
    return text.replace(
      /\x5Bnotice\x5D\n?([\s\S]*?)\n?\[\/notice\]\n?/g,
      "<div class='bbcode-notice'>$1</div>"
    );
  }

  function parseColour(text) {
    // Secure colour parsing - validate colour values
    text = text.replace(/\x5B(color|colour)=([^\x5D]+)\]/g, function (match, tag, colour) {
      const safeColour = sanitizeColour(colour);
      if (safeColour) {
        return "<span style='color: " + safeColour + "'>";
      }
      return ''; // Strip invalid colour tags
    });
    text = text.replace(/\x5B\/(color|colour)\x5D/g, '</span>');
    return text;
  }

  function parseAudio(text) {
    return text.replace(/\x5Baudio\x5D([^\[]+)\[\/audio\]\n?/g, function (match, url) {
      const safeUrl = sanitizeUrl(url, SAFE_MEDIA_PROTOCOLS);
      if (safeUrl) {
        return "<audio controls='controls' preload='none' src='" + safeUrl + "'></audio>";
      }
      return '[invalid audio url]';
    });
  }

  function parseUrl(text) {
    // [url]link[/url] - URL is both href and text
    text = text.replace(/\x5Burl\x5D([^\[]+?)\[\/url\]/g, function (match, url) {
      const safeUrl = sanitizeUrl(url, SAFE_URL_PROTOCOLS);
      if (safeUrl) {
        return (
          "<a rel='nofollow noopener' target='_blank' href='" +
          safeUrl +
          "'>" +
          escapeHtml(url) +
          '</a>'
        );
      }
      return escapeHtml(url); // Just show the text without link
    });

    // [url=link]text[/url] - URL in attribute
    text = text.replace(/\x5Burl=([^\x5D]+)\]([^\[]*)\[\/url\]/g, function (match, url, linkText) {
      const safeUrl = sanitizeUrl(url, SAFE_URL_PROTOCOLS);
      if (safeUrl) {
        return (
          "<a rel='nofollow noopener' target='_blank' href='" +
          safeUrl +
          "'>" +
          (linkText || safeUrl) +
          '</a>'
        );
      }
      return linkText || ''; // Just show text without link
    });

    return text;
  }

  function parseQuote(text) {
    text = text.replace(/\x5Bquote="([^"]+)"\]\s*/g, function (match, author) {
      return "<blockquote class='bbcode-blockquote'><h4>" + escapeHtml(author) + ' wrote:</h4>';
    });
    text = text.replace(/\x5Bquote\x5D\s*/g, "<blockquote class='bbcode-blockquote'>");
    text = text.replace(/\s*\[\/quote\]\n?/g, '</blockquote>');
    return text;
  }

  function parseSize(text) {
    text = text.replace(/\x5Bsize=(\d+)\]/g, function (match, size) {
      const safeSize = clamp(parseInt(size, 10), 30, 200);
      return "<span style='font-size: " + safeSize + "%'>";
    });
    text = text.replace(/\x5B\/size\x5D/g, '</span>');
    return text;
  }

  function parseEmail(text) {
    // Validate email format before creating mailto link
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    text = text.replace(/\x5Bemail\]([^\x5B]+)\[\/email\]/g, function (match, email) {
      const trimmedEmail = email.trim();
      if (emailRegex.test(trimmedEmail)) {
        return (
          "<a rel='nofollow' href='mailto:" +
          escapeAttr(trimmedEmail) +
          "'>" +
          escapeHtml(trimmedEmail) +
          '</a>'
        );
      }
      return escapeHtml(email);
    });

    text = text.replace(
      /\x5Bemail=([^\x5D]+)\]([^\[]*)\[\/email\]/g,
      function (match, email, linkText) {
        const trimmedEmail = email.trim();
        if (emailRegex.test(trimmedEmail)) {
          return (
            "<a rel='nofollow' href='mailto:" +
            escapeAttr(trimmedEmail) +
            "'>" +
            (linkText || escapeHtml(trimmedEmail)) +
            '</a>'
          );
        }
        return linkText || escapeHtml(email);
      }
    );

    return text;
  }

  function parseProfile(text) {
    text = text.replace(
      /\x5Bprofile(?:=([0-9]+))?\](.*?)\[\/profile\]/g,
      function (match, id, content) {
        const safeContent = escapeHtml(content);
        if (id) {
          // ID is already validated as numeric by the regex
          return "<a href='/u/" + id + "'>" + safeContent + '</a>';
        }
        return "<a href='/u/" + escapeAttr(content) + "'>/u/" + safeContent + '</a>';
      }
    );
    return text;
  }

  function parseImage(text) {
    text = text.replace(/\x5Bimg\x5D([^\x5B]+)\[\/img\]/g, function (match, url) {
      const safeUrl = sanitizeUrl(url, SAFE_MEDIA_PROTOCOLS);
      if (safeUrl) {
        return "<img src='" + safeUrl + "' loading='lazy' alt='User image'/>";
      }
      return '[invalid image url]';
    });
    text = text.replace(/\x5Bimg=([^\x5D]+)\]\[\/img\]/g, function (match, url) {
      const safeUrl = sanitizeUrl(url, SAFE_MEDIA_PROTOCOLS);
      if (safeUrl) {
        return "<img src='" + safeUrl + "' loading='lazy' alt='User image'/>";
      }
      return '[invalid image url]';
    });
    return text;
  }

  function parseList(text) {
    text = text.replace(/\x5Blist=[^\x5D]+\]\s*\[\*\]/g, '<ol><li>');
    text = text.replace(/\x5Blist\]\s*\[\*\]/g, "<ol style='list-style-type: disc;'><li>");
    text = text.replace(/\x5B\/\*\]\n?\n?/g, '</li>');
    text = text.replace(/\s*\[\*\]/g, '<li>');
    text = text.replace(/\s*\[\/list\]\n?\n?/g, '</ol>');

    text = text.replace(
      /\x5Blist=[^\x5D]+\](.+?)(<li>|<\/ol>)/g,
      "<ul class='bbcode-list-title'><li>$1</li></ul><ol>$2"
    );
    text = text.replace(
      /\x5Blist\](.+?)(<li>|<\/ol>)/g,
      "<ul class='bbcode-list-title'><li>$1</li></ul><ol style='list-style-type: disc;'>$2"
    );

    return text;
  }

  function parseImagemap(text) {
    // Simplified regex to avoid ReDoS
    return text.replace(/\x5Bimagemap\]\s*([\s\S]+?)\[\/imagemap\]\n?/g, function (match, content) {
      const lines = content.trim().split('\n');
      if (lines.length < 1) {
        return '';
      }

      const imageUrl = sanitizeUrl(lines[0].trim(), SAFE_MEDIA_PROTOCOLS);
      if (!imageUrl) {
        return '[invalid imagemap]';
      }

      let pseudoHtml =
        "<div class='bbcode-imagemap'><img src='" +
        imageUrl +
        "' class='bbcode-imagemap-image' loading='lazy' alt='Imagemap'>";

      // Process remaining lines
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length < 6) {
          continue;
        }

        let x = clampFloat(parseFloat(parts[0]) || 0, 0, 100);
        let y = clampFloat(parseFloat(parts[1]) || 0, 0, 100);
        let w = clampFloat(parseFloat(parts[2]) || 0, 0, 100);
        let h = clampFloat(parseFloat(parts[3]) || 0, 0, 100);
        const redirect = parts[4];
        const title = escapeAttr(parts.slice(5).join(' '));

        let tag = 'a';
        let hrefAttr = '';

        if (redirect === '#') {
          tag = 'span';
        } else {
          const safeRedirect = sanitizeUrl(redirect, SAFE_URL_PROTOCOLS);
          if (!safeRedirect) {
            continue;
          } // Skip invalid URLs
          hrefAttr = " href='" + safeRedirect + "'";
        }

        const tooltipPos = y < 13.0 ? 'bottom center' : 'top center';

        pseudoHtml +=
          '<' +
          tag +
          " class='bbcode-imagemap-tooltip'" +
          hrefAttr +
          " style='left: " +
          x +
          '%; top: ' +
          y +
          '%; width: ' +
          w +
          '%; height: ' +
          h +
          "%;' data-tooltip='" +
          title +
          "' data-position='" +
          tooltipPos +
          "'></" +
          tag +
          '>';
      }

      pseudoHtml += '</div>';
      return pseudoHtml;
    });
  }

  function parseBox(text) {
    text = text.replace(/\x5Bbox=([^\]]*)\]\n*/g, function (match, title) {
      const id = randString(6);
      const safeTitle = escapeHtml(title);
      return (
        "<div class='bbcode-box'><button class='bbcode-box-btn' id='btn-" +
        id +
        "' type='button' data-box-id='" +
        id +
        "'><i id='icon-" +
        id +
        "' class='bbcode-box-icon fa-solid fa-angle-right'></i><span>" +
        safeTitle +
        "</span></button><div class='bbcode-box-content bbcode-hidden' id='content-" +
        id +
        "'>"
      );
    });

    text = text.replace(/\n*\[\/box\]\n?/g, '</div></div>');

    text = text.replace(/\x5Bspoilerbox\]\n*/g, function () {
      const id = randString(6);
      return (
        "<div class='bbcode-box'><button class='bbcode-box-btn' id='btn-" +
        id +
        "' type='button' data-box-id='" +
        id +
        "'><i id='icon-" +
        id +
        "' class='bbcode-box-icon fa-solid fa-angle-right'></i><span>SPOILER</span></button><div class='bbcode-box-content bbcode-hidden' id='content-" +
        id +
        "'>"
      );
    });

    text = text.replace(/\n*\[\/spoilerbox\]\n?/g, '</div></div>');

    return text;
  }

  function parseYoutube(text) {
    // Validate YouTube URLs more strictly
    const youtubeIdRegex = /^[a-zA-Z0-9_-]{11}$/;

    // Handle various YouTube URL formats
    text = text.replace(/\x5Byoutube\]([^\[]+)\[\/youtube\]\n?/g, function (match, url) {
      let videoId = '';

      // Try to extract video ID from various formats
      const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          videoId = match[1];
          break;
        }
      }

      if (videoId && youtubeIdRegex.test(videoId)) {
        return (
          "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://www.youtube.com/embed/" +
          videoId +
          "?rel=0' frameborder='0' allowfullscreen loading='lazy'></iframe></div></div>"
        );
      }
      return '[invalid youtube url]';
    });

    return text;
  }

  function parseTwitch(text) {
    const domain = window.location.hostname;
    // Validate Twitch clip IDs (alphanumeric with some special chars)
    const clipIdRegex = /^[a-zA-Z0-9_-]+$/;

    text = text.replace(/\x5Btwitch\]([^\[]+)\[\/twitch\]\n?/g, function (match, url) {
      let clipId = '';

      // Extract clip ID from URL or use directly
      const clipMatch = url.match(/clip\/([a-zA-Z0-9_-]+)/);
      if (clipMatch) {
        clipId = clipMatch[1];
      } else if (clipIdRegex.test(url.trim())) {
        clipId = url.trim();
      }

      if (clipId && clipIdRegex.test(clipId)) {
        return (
          "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://clips.twitch.tv/embed?clip=" +
          escapeAttr(clipId) +
          '&parent=' +
          escapeAttr(domain) +
          "' frameborder='0' allowfullscreen loading='lazy'></iframe></div></div>"
        );
      }
      return '[invalid twitch url]';
    });

    return text;
  }

  function parseCode(text) {
    return text.replace(
      /\x5B(code|c)\]\n?([\s\S]*?)\n?\[\/(code|c)\]\n?/g,
      "<pre><code class='bbcode-code'>$2</code></pre>"
    );
  }

  function parseSeparator(text) {
    return text.replace(/\x5Bhr\]/g, "<div class='ui divider'></div>");
  }

  function parseLeft(text) {
    text = text.replace(/\x5Bleft\]/g, "<div style='text-align: left;'>");
    text = text.replace(/\x5B\/left\]/g, '</div>');
    return text;
  }

  function parseRight(text) {
    text = text.replace(/\x5Bright\]/g, "<div style='text-align: right;'>");
    text = text.replace(/\x5B\/right\]/g, '</div>');
    return text;
  }

  function convertBBCode(text) {
    if (!text) {
      return '';
    }

    // Escape HTML entities first to prevent XSS
    text = escapeHtml(text);

    // Parse BBCode tags (order matters for nested tags)
    text = parseImagemap(text);
    text = parseBox(text);
    text = parseCode(text);
    text = parseList(text);
    text = parseNotice(text);
    text = parseQuote(text);
    text = parseHeading(text);

    text = parseAudio(text);
    text = parseBold(text);
    text = parseCentre(text);
    text = parseColour(text);
    text = parseEmail(text);
    text = parseImage(text);
    text = parseItalic(text);
    text = parseSize(text);
    text = parseSpoiler(text);
    text = parseStrike(text);
    text = parseUnderline(text);
    text = parseUrl(text);
    text = parseSeparator(text);
    text = parseYoutube(text);
    text = parseTwitch(text);
    text = parseProfile(text);
    text = parseLeft(text);
    text = parseRight(text);

    // Convert newlines to <br>
    text = text.replace(/\n/g, '<br>');

    return "<div class='bbcode-container'>" + text + '</div>';
  }

  // Event delegation for BBCode box toggle (avoids inline onclick)
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.bbcode-box-btn');
    if (!btn) {
      return;
    }

    const id = btn.getAttribute('data-box-id');
    if (!id) {
      return;
    }

    const content = document.getElementById('content-' + id);
    const icon = document.getElementById('icon-' + id);

    if (content && icon) {
      if (content.classList.contains('bbcode-hidden')) {
        content.classList.remove('bbcode-hidden');
        icon.classList.remove('fa-angle-right');
        icon.classList.add('fa-angle-down');
      } else {
        content.classList.add('bbcode-hidden');
        icon.classList.remove('fa-angle-down');
        icon.classList.add('fa-angle-right');
      }
    }
  });

  // Legacy support for inline onclick (will be removed in future)
  window.toggleBBCodeBox = function (btn) {
    const id = btn.id.replace('btn-', '');
    const content = document.getElementById('content-' + id);
    const icon = document.getElementById('icon-' + id);

    if (content.classList.contains('bbcode-hidden')) {
      content.classList.remove('bbcode-hidden');
      icon.classList.remove('fa-angle-right');
      icon.classList.add('fa-angle-down');
    } else {
      content.classList.add('bbcode-hidden');
      icon.classList.remove('fa-angle-down');
      icon.classList.add('fa-angle-right');
    }
  };

  window.parseBBCode = convertBBCode;
})(window);
