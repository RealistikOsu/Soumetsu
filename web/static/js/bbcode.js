(function(window) {
    'use strict';

    function randString(n) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        for (var i = 0; i < n; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

    function clamp(x, min, max) {
        if (x < min) return min;
        if (x > max) return max;
        return x;
    }

    function clampFloat(x, min, max) {
        if (x < min) return min;
        if (x > max) return max;
        return x;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function parseBold(text) {
        text = text.replace(/\x5Bb\x5D/g, "<strong>").replace(/\x5B\/b\x5D/g, "</strong>");
        text = text.replace(/\x5Bbold\x5D/g, "<strong>").replace(/\x5B\/bold\x5D/g, "</strong>");
        return text;
    }

    function parseCentre(text) {
        text = text.replace(/\x5Bcentre\x5D/g, "<center>").replace(/\x5B\/centre\x5D/g, "</center>");
        text = text.replace(/\x5Bcenter\x5D/g, "<center>").replace(/\x5B\/center\x5D/g, "</center>");
        return text;
    }

    function parseHeading(text) {
        text = text.replace(/\x5Bheading\x5D/g, "<h2>");
        text = text.replace(/\x5B\/heading\x5D\n?/g, "</h2>");
        return text;
    }

    function parseItalic(text) {
        text = text.replace(/\x5Bi\x5D/g, "<em>").replace(/\x5B\/i\x5D/g, "</em>");
        text = text.replace(/\x5Bitalic\x5D/g, "<em>").replace(/\x5B\/italic\x5D/g, "</em>");
        return text;
    }

    function parseStrike(text) {
        text = text.replace(/\x5Bs\x5D/g, "<strike>").replace(/\x5B\/s\x5D/g, "</strike>");
        text = text.replace(/\x5Bstrike\x5D/g, "<strike>").replace(/\x5B\/strike\x5D/g, "</strike>");
        return text;
    }

    function parseUnderline(text) {
        text = text.replace(/\x5Bu\x5D/g, "<u>").replace(/\x5B\/u\x5D/g, "</u>");
        text = text.replace(/\x5Bunderline\x5D/g, "<u>").replace(/\x5B\/underline\x5D/g, "</u>");
        return text;
    }

    function parseSpoiler(text) {
        text = text.replace(/\x5Bspoiler\x5D/g, "<span class='bbcode-spoiler'>").replace(/\x5B\/spoiler\x5D/g, "</span>");
        return text;
    }

    function parseNotice(text) {
        return text.replace(/\x5Bnotice\x5D\n?([\s\S]*?)\n?\[\/notice\]\n?/g, "<div class='bbcode-notice'>$1</div>");
    }

    function parseColour(text) {
        text = text.replace(/\x5B(color|colour)=([^\x5D:]+)\]/g, "<span style='color: $2'>");
        text = text.replace(/\x5B\/(color|colour)\x5D/g, "</span>");
        return text;
    }

    function parseAudio(text) {
        return text.replace(/\x5Baudio\x5D([^\[]+)\[\/audio\]\n?/g, "<audio controls='controls' preload='none' src='$1'></audio>");
    }

    function parseUrl(text) {
        text = text.replace(/\x5Burl\x5D(.+?)\[\/url\]/g, "<a rel='nofollow' href='$1'>$1</a>");
        text = text.replace(/\x5Burl=([^\x5D]+)\]/g, "<a rel='nofollow' href='$1'>");
        text = text.replace(/\x5B\/url\x5D/g, "</a>");
        return text;
    }

    function parseQuote(text) {
        text = text.replace(/\x5Bquote="([^"]+)"\]\s*/g, "<blockquote class='bbcode-blockquote'><h4>$1 wrote:</h4>");
        text = text.replace(/\x5Bquote\x5D\s*/g, "<blockquote class='bbcode-blockquote'>");
        text = text.replace(/\s*\[\/quote\]\n?/g, "</blockquote>");
        return text;
    }

    function parseSize(text) {
        text = text.replace(/\x5Bsize=(\d+)\]/g, function(match, size) {
            size = clamp(parseInt(size), 30, 200);
            return "<span style='font-size: " + size + "%'>";
        });
        text = text.replace(/\x5B\/size\x5D/g, "</span>");
        return text;
    }

    function parseEmail(text) {
        text = text.replace(/\x5Bemail\](([^\x5B]+)@([^\x5B]+))\[\/email\]/g, "<a rel='nofollow' href='mailto:$1'>$1</a>");
        text = text.replace(/\x5Bemail=(([^\x5B]+)@([^\x5B]+))\]/g, "<a rel='nofollow' href='mailto:$1'>");
        text = text.replace(/\x5B\/email\x5D/g, "</a>");
        return text;
    }

    function parseProfile(text) {
         text = text.replace(/\x5Bprofile(?:=([0-9]+))?\](.*?)(\[\/profile\])/g, function(match, id, content) {
            if (id) {
                return "<a href='/u/" + id + "'>" + content + "</a>";
            }
            return "<a href='/u/" + content + "'>/u/" + content + "</a>";
        });
        return text;
    }

    function parseImage(text) {
        text = text.replace(/\x5Bimg\x5D([^\x5B]+)\[\/img\]/g, function(match, url) {
            return "<img src='" + url + "' loading='lazy'/>";
        });
        text = text.replace(/\x5Bimg=([^\x5B]+)\]\[\/img\]/g, function(match, url) {
            return "<img src='" + url + "' loading='lazy'/>";
        });
        return text;
    }

    function parseList(text) {
        text = text.replace(/\x5Blist=[^\x5D]+\]\s*\[\*\]/g, "<ol><li>");
        text = text.replace(/\x5Blist\]\s*\[\*\]/g, "<ol style='list-style-type: disc;'><li>");
        text = text.replace(/\x5B\/\*\]\n?\n?/g, "</li>");
        text = text.replace(/\s*\[\*\]/g, "<li>");
        text = text.replace(/\s*\[\/list\]\n?\n?/g, "</ol>");
        
        text = text.replace(/\x5Blist=[^\x5D]+\](.+?)(<li>|<\/ol>)/g, "<ul class='bbcode-list-title'><li>$1</li></ul><ol>$2");
        text = text.replace(/\x5Blist\](.+?)(<li>|<\/ol>)/g, "<ul class='bbcode-list-title'><li>$1</li></ul><ol style='list-style-type: disc;'>$2");
        
        return text;
    }

    function parseImagemap(text) {
        return text.replace(/\x5Bimagemap\]\s+([\s\S]+?)\[\/imagemap\]\n?/g, function(match, content) {
            const parts = content.trim().split(/\s+/);
            if (parts.length < 1) return "";
            
            const imageUrl = parts[0];
            let pseudoHtml = "<div class='bbcode-imagemap'><img src='" + imageUrl + "' class='bbcode-imagemap-image' loading='lazy'>";
            
            const linesStr = content.substring(content.indexOf(imageUrl) + imageUrl.length);
            const lineRegex = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+?)\s*$/gm;
            
            let lineMatch;
            while ((lineMatch = lineRegex.exec(linesStr)) !== null) {
                let x = parseFloat(lineMatch[1]) || 0;
                let y = parseFloat(lineMatch[2]) || 0;
                let w = parseFloat(lineMatch[3]) || 0;
                let h = parseFloat(lineMatch[4]) || 0;
                let redirect = lineMatch[5];
                let title = lineMatch[6];
                
                let tag = "a";
                if (redirect === "#") tag = "span";
                
                x = clampFloat(x, 0, 100);
                y = clampFloat(y, 0, 100);
                w = clampFloat(w, 0, 100);
                h = clampFloat(h, 0, 100);
                
                let tooltipPos = "top center";
                if (y < 13.0) tooltipPos = "bottom center";
                
                pseudoHtml += "<" + tag + " class='bbcode-imagemap-tooltip' href='" + redirect + "' style='left: " + x + "%; top: " + y + "%; width: " + w + "%; height: " + h + "%;' data-tooltip='" + title + "' data-position='" + tooltipPos + "'></" + tag + ">";
            }
            
            pseudoHtml += "</div>";
            return pseudoHtml.replace(/\n/g, "");
        });
    }

    function parseBox(text) {
        text = text.replace(/\x5Bbox=([\s\S]*?)\]\n*/g, function(match, title) {
            const id = randString(6);
            return "<div class='bbcode-box'><button class='bbcode-box-btn' id='btn-" + id + "' type='button' onclick='toggleBBCodeBox(this)'><i id='icon-" + id + "' class='bbcode-box-icon fa-solid fa-angle-right'></i><span>" + title + "</span></button><div class='bbcode-box-content bbcode-hidden' id='content-" + id + "'>";
        });
        
        text = text.replace(/\n*\[\/box\]\n?/g, "</div></div>");
        
        text = text.replace(/\x5Bspoilerbox\]\n*/g, function() {
            const id = randString(6);
            return "<div class='bbcode-box'><button class='bbcode-box-btn' id='btn-" + id + "' type='button' onclick='toggleBBCodeBox(this)'><i id='icon-" + id + "' class='bbcode-box-icon fa-solid fa-angle-right'></i><span>SPOILER</span></button><div class='bbcode-box-content bbcode-hidden' id='content-" + id + "'>";
        });
        
        text = text.replace(/\n*\[\/spoilerbox\]\n?/g, "</div></div>");
        
        return text;
    }

    function parseYoutube(text) {
        text = text.replace(/\x5Byoutube\]https:\/\/(.*)youtube\.com\/watch\?v=([^&]+)/g, "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://www.youtube.com/embed/$2");
        text = text.replace(/\x5Byoutube\]https:\/\/(.*)youtu\.be\/([^?]+)/g, "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://www.youtube.com/embed/$2");
        text = text.replace(/\x5Byoutube\]https:\/\/(.*)youtube\.com\/embed\/([^?]+)/g, "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://www.youtube.com/embed/$2");
        text = text.replace(/\x5Byoutube\](.*)/g, "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://www.youtube.com/embed/$1");
        text = text.replace(/\x5B\/youtube\]\n?/g, "?rel=0' frameborder='0' allowfullscreen></iframe></div></div>");
        return text;
    }

    function parseTwitch(text) {
        const domain = window.location.hostname;
        
        text = text.replace(/\x5Btwitch\]https:\/\/(.*)\.twitch\.tv\/(.*)\/clip\/([^?]+)/g, "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://clips.twitch.tv/embed?clip=$3");
        text = text.replace(/\x5Btwitch\](.*)/g, "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://clips.twitch.tv/embed?clip=$1");
        text = text.replace(/\x5B\/twitch\]\n?/g, "&parent=" + domain + "' frameborder='0' allowfullscreen></iframe></div></div>");
        return text;
    }

    function parseCode(text) {
        return text.replace(/\x5B(code|c)\]\n?([\s\S]*?)\n?\[\/(code|c)\]\n?/g, "<pre><code class='bbcode-code'>$2</code></pre>");
    }

    function parseSeparator(text) {
        return text.replace(/\x5Bhr\]/g, "<div class='ui divider'></div>");
    }

    function parseLeft(text) {
        text = text.replace(/\x5Bleft\]/g, "<div style='text-align: left;'>");
        text = text.replace(/\x5B\/left\]/g, "</div>");
        return text;
    }

    function parseRight(text) {
        text = text.replace(/\x5Bright\]/g, "<div style='text-align: right;'>");
        text = text.replace(/\x5B\/right\]/g, "</div>");
        return text;
    }

    function convertBBCode(text) {
        if (!text) return '';
        
        text = escapeHtml(text);

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

        text = text.replace(/\n/g, "<br>");
        
        return "<div class='bbcode-container'>" + text + "</div>";
    }
    
    window.toggleBBCodeBox = function(btn) {
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
