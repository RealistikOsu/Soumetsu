---
title: "BBCode"
description: "Everything you can use on your userpage, with live examples."
icon: code
colour: blue
---

# BBCode

This is what you can use on your userpage (Settings > Userpage) and anywhere else BBCode is accepted. Tags are case sensitive and most need a matching closing tag, e.g. `[b]text[/b]`. Every example below is rendered live, so what you see is exactly what you'll get.

----------------------------------------------------

## Text formatting

* `[b]bold[/b]` or `[bold]bold[/bold]`
* `[i]italic[/i]` or `[italic]italic[/italic]`
* `[u]underline[/u]` or `[underline]underline[/underline]`
* `[s]strike[/s]` or `[strike]strike[/strike]`
* `[size=8]bigger text[/size]` — size goes from 1 to 15, anything above 15 gets capped
* `[colour=red]text[/colour]` or `[color=#ff0000]text[/color]` — named colours, hex (`#fff`, `#ff0000`), or `rgb()`/`rgba()`
* `[centre]text[/centre]` (or `[center]`), `[left]text[/left]`, `[right]text[/right]`
* `[heading]Big heading[/heading]`

```bbcode-example
[b]bold[/b], [i]italic[/i], [u]underline[/u], [s]strike[/s]
[size=4]bigger text[/size]
[colour=red]red text[/colour] and [color=#3ba7ff]blue text[/color]
[centre]centred text[/centre]
```

## Links, images & media

* `[url]https://ussr.pl[/url]` — just shows the link
* `[url=https://ussr.pl]click here[/url]` — custom link text
* `[img]https://example.com/image.png[/img]`
* `[email]you@example.com[/email]` or `[email=you@example.com]Contact me[/email]`
* `[audio]https://example.com/song.mp3[/audio]`
* `[youtube]https://www.youtube.com/watch?v=dQw4w9WgXcQ[/youtube]` — also works with `youtu.be` links and plain video IDs
* `[twitch]https://clips.twitch.tv/SomeClipName[/twitch]`
* `[profile=1000]Aochi[/profile]` — links to a user by ID with custom text
* `[profile]4812[/profile]` — links straight to `/u/4812`

> [!NOTE]
> Only `http`/`https` links are accepted, anything else (`javascript:`, `data:`, etc.) gets stripped.

```bbcode-example
[url=https://ussr.pl]click here[/url] or just [url]https://ussr.pl[/url]
[profile=1000]Aochi[/profile]
```

## Quotes & callouts

* `[quote]text[/quote]`
* `[quote="Aochi"]text[/quote]` — shows who's being quoted
* `[notice]text[/notice]` — highlighted box, good for warnings/important info
* `[spoiler]hidden text[/spoiler]` — blacked out until you select/highlight it
* `[box=Title]content[/box]` — collapsible, click the title to expand
* `[spoilerbox]content[/spoilerbox]` — same as above but titled "SPOILER"

```bbcode-example
[quote="Aochi"]this is a quote[/quote]
[notice]don't forget to read the rules[/notice]
[spoiler]you found the secret text[/spoiler]
[box=Click to expand]this was hidden[/box]
```

## Code

`[code]your text here[/code]` or `[c]...[/c]` for short. Preserves formatting, doesn't parse any BBCode inside it.

```bbcode-example
[code]this [b]stays[/b] exactly as written[/code]
```

## Lists

```bbcode-example
[list]
[*]bullet one
[*]bullet two
[/list]
```

Numbering style comes from what you put after `[list=`:

* `[list=1]` — 1, 2, 3...
* `[list=a]` — a, b, c...
* `[list=A]` — A, B, C...
* `[list=i]` — i, ii, iii...
* `[list=I]` — I, II, III...
* `[list style=a]` (or `A`/`i`/`I`/`1`) — same thing, but if you'd rather put a real title after `=` (see below) use this instead

Anything else after `[list=` is instead treated as a title shown above the list, e.g. `[list=Songs used][*]one[*]two[/list]`.

```bbcode-example
[list=A]
[*]item one
[*]item two
[/list]
```

## Layout

* `[container width=500]stuff[/container]` — width is in pixels
* `[container compact centre]stuff[/container]` — `compact` and `centre`/`center` can be combined with `width`
* `[hr]` — horizontal divider

```bbcode-example
[container width=250 centre][b]centred box[/b][/container]
```

## Imagemap

Turns an image into clickable regions, handy for crediting people in a collab. First line is the image, every line after it is one clickable box:

```bbcode-example
[imagemap]
https://ussr.pl/static/images/peppy_mad.png
0 0 50 100 https://ussr.pl left half
50 0 50 100 https://ussr.pl right half
[/imagemap]
```

Each region line is `x y width height link label`, where `x`/`y`/`width`/`height` are percentages of the image (0-100, decimals allowed). Use `#` as the link if you just want a hover tooltip with no click-through.

> [!TIP]
> Don't want to work out the coordinates by hand? [This imagemap generator](https://alexaario.github.io/osu-BBCodeImagemapGenerator/) lets you click regions directly on your image and spits out the BBCode for you.

## Emoji

Typing one of these with colons around it drops in the matching emote, e.g. `:peppy:`.

```bbcode-example
:peppy: :kappa: :barney: :foka: :akerino:
```

akerino, alien, angel, angry, barney, blink, blush, cheerful, cool, creepypeppy, cwy, devil, dizzy, djpeppy, ermm, face, foka, getlost, grin, happy, heart, kappa, kappy, kissing, laughing, ninja, peppy, peppyfiero, pinch, pouty, sad, shocked, sick, sideways, silly, sleeping, smile, tongue, unsure, w00t, wassat, whistling, wink, wub
