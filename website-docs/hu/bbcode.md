---
reference_version: 5b6deba36e8d8b87702581b50909eda5
title: "BBCode"
description: "Minden, amit a felhasználói oldaladon használhatsz, élő példákkal."
icon: code
colour: blue
---

# BBCode

Ezeket használhatod a felhasználói oldaladon (Beállítások > Felhasználói oldal), és mindenhol máshol, ahol működik a BBCode. A tageknél számít a kis- és nagybetű, és a legtöbbnek kell egy hozzá tartozó záró tag is, pl. `[b]text[/b]`. Minden lenti példa élőben renderelődik, szóval pontosan azt kapod, amit látsz.

----------------------------------------------------

## Szövegformázás

* `[b]bold[/b]` vagy `[bold]bold[/bold]`
* `[i]italic[/i]` vagy `[italic]italic[/italic]`
* `[u]underline[/u]` vagy `[underline]underline[/underline]`
* `[s]strike[/s]` vagy `[strike]strike[/strike]`
* `[size=8]bigger text[/size]` — a méret 1-től 15-ig megy, a 15 felettieket 15-re vágja le
* `[colour=red]text[/colour]` vagy `[color=#ff0000]text[/color]` — színnevek, hex (`#fff`, `#ff0000`) vagy `rgb()`/`rgba()`
* `[centre]text[/centre]` (vagy `[center]`), `[left]text[/left]`, `[right]text[/right]`
* `[heading]Big heading[/heading]`

```bbcode-example
[b]félkövér[/b], [i]dőlt[/i], [u]aláhúzott[/u], [s]áthúzott[/s]
[size=4]nagyobb szöveg[/size]
[colour=red]piros szöveg[/colour] és [color=#3ba7ff]kék szöveg[/color]
[centre]középre igazított szöveg[/centre]
```

## Linkek, képek és média

* `[url]https://ussr.pl[/url]` — csak simán megjeleníti a linket
* `[url=https://ussr.pl]click here[/url]` — saját linkszöveg
* `[img]https://example.com/image.png[/img]`
* `[email]you@example.com[/email]` vagy `[email=you@example.com]Contact me[/email]`
* `[audio]https://example.com/song.mp3[/audio]`
* `[youtube]https://www.youtube.com/watch?v=dQw4w9WgXcQ[/youtube]` — `youtu.be` linkekkel és sima videó ID-kkal is működik
* `[twitch]https://clips.twitch.tv/SomeClipName[/twitch]`
* `[profile=1000]Aochi[/profile]` — ID alapján linkel egy játékosra, saját szöveggel
* `[profile]4812[/profile]` — egyenesen a `/u/4812` oldalra linkel

> [!NOTE]
> Csak `http`/`https` linkek működnek, minden mást (`javascript:`, `data:` stb.) kiszűrünk.

```bbcode-example
[url=https://ussr.pl]kattints ide[/url] vagy csak simán [url]https://ussr.pl[/url]
[profile=1000]Aochi[/profile]
```

## Idézetek és kiemelések

* `[quote]text[/quote]`
* `[quote="Aochi"]text[/quote]` — megmutatja, kit idézel
* `[notice]text[/notice]` — kiemelt doboz, jó figyelmeztetésekhez/fontos infókhoz
* `[spoiler]hidden text[/spoiler]` — fekete marad, amíg ki nem jelölöd
* `[box=Title]content[/box]` — lenyitható, kattints a címére, hogy kinyíljon
* `[spoilerbox]content[/spoilerbox]` — ugyanaz, mint fent, csak „SPOILER” a címe

```bbcode-example
[quote="Aochi"]ez egy idézet[/quote]
[notice]ne felejtsd el elolvasni a szabályokat[/notice]
[spoiler]megtaláltad a titkos szöveget[/spoiler]
[box=Kattints a lenyitáshoz]ez rejtve volt[/box]
```

## Kód

`[code]your text here[/code]`, vagy röviden `[c]...[/c]`. Megtartja a formázást, és nem értelmez benne semmilyen BBCode-ot.

```bbcode-example
[code]ez [b]pontosan[/b] úgy marad, ahogy leírtad[/code]
```

## Listák

```bbcode-example
[list]
[*]első pont
[*]második pont
[/list]
```

A számozás stílusa attól függ, mit írsz a `[list=` után:

* `[list=1]` — 1, 2, 3...
* `[list=a]` — a, b, c...
* `[list=A]` — A, B, C...
* `[list=i]` — i, ii, iii...
* `[list=I]` — I, II, III...
* `[list style=a]` (vagy `A`/`i`/`I`/`1`) — ugyanez, de ha inkább egy igazi címet írnál az `=` után (lásd lent), akkor ezt használd

Bármi más a `[list=` után a lista felett megjelenő címnek számít, pl. `[list=Songs used][*]one[*]two[/list]`.

```bbcode-example
[list=A]
[*]első elem
[*]második elem
[/list]
```

## Elrendezés

* `[container width=500]stuff[/container]` — a szélesség pixelben van
* `[container compact centre]stuff[/container]` — a `compact` és a `centre`/`center` kombinálható a `width`-del
* `[hr]` — vízszintes elválasztó vonal

```bbcode-example
[container width=250 centre][b]középre igazított doboz[/b][/container]
```

## Imagemap

Egy képet kattintható területekre oszt, ami jól jön például ahhoz, hogy egy collabban mindenkit feltüntess. Az első sor a kép, utána minden sor egy kattintható doboz:

```bbcode-example
[imagemap]
https://ussr.pl/static/images/peppy_mad.png
0 0 50 100 https://ussr.pl bal fele
50 0 50 100 https://ussr.pl jobb fele
[/imagemap]
```

Minden terület sora így néz ki: `x y width height link label`, ahol az `x`/`y`/`width`/`height` a kép méretének százalékában értendő (0-100, tizedesek is mehetnek). Ha csak egy hover tooltipet szeretnél kattintás nélkül, írj `#`-et linknek.

> [!TIP]
> Nincs kedved kézzel kiszámolni a koordinátákat? [Ezzel az imagemap generátorral](https://alexaario.github.io/osu-BBCodeImagemapGenerator/) közvetlenül a képeden jelölheted ki a területeket, és kiköpi neked a kész BBCode-ot.

## Emoji

Ha ezek közül valamelyiket kettőspontok közé írod, bekerül a hozzá tartozó emote, pl. `:peppy:`.

```bbcode-example
:peppy: :kappa: :barney: :foka: :akerino:
```

akerino, alien, angel, angry, barney, blink, blush, cheerful, cool, creepypeppy, cwy, devil, dizzy, djpeppy, ermm, face, foka, getlost, grin, happy, heart, kappa, kappy, kissing, laughing, ninja, peppy, peppyfiero, pinch, pouty, sad, shocked, sick, sideways, silly, sleeping, smile, tongue, unsure, w00t, wassat, whistling, wink, wub
