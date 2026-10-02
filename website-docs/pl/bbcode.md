---
reference_version: 5b6deba36e8d8b87702581b50909eda5
title: "BBCode"
description: "Wszystko, czego możesz użyć na swoim userpage'u, z przykładami na żywo."
icon: code
colour: blue
---

# BBCode

Tego możesz używać na swoim userpage'u (Ustawienia > Userpage) i wszędzie tam, gdzie działa BBCode. Wielkość liter w tagach ma znaczenie, a większość z nich potrzebuje pasującego tagu zamykającego, np. `[b]text[/b]`. Wszystkie przykłady niżej renderują się na żywo, więc to, co widzisz, dostaniesz dokładnie tak samo.

----------------------------------------------------

## Formatowanie tekstu

* `[b]bold[/b]` lub `[bold]bold[/bold]`
* `[i]italic[/i]` lub `[italic]italic[/italic]`
* `[u]underline[/u]` lub `[underline]underline[/underline]`
* `[s]strike[/s]` lub `[strike]strike[/strike]`
* `[size=8]bigger text[/size]` — rozmiar od 1 do 15, wszystko powyżej 15 jest obcinane do 15
* `[colour=red]text[/colour]` lub `[color=#ff0000]text[/color]` — nazwy kolorów, hex (`#fff`, `#ff0000`) albo `rgb()`/`rgba()`
* `[centre]text[/centre]` (albo `[center]`), `[left]text[/left]`, `[right]text[/right]`
* `[heading]Big heading[/heading]`

```bbcode-example
[b]pogrubienie[/b], [i]kursywa[/i], [u]podkreślenie[/u], [s]przekreślenie[/s]
[size=4]większy tekst[/size]
[colour=red]czerwony tekst[/colour] i [color=#3ba7ff]niebieski tekst[/color]
[centre]wyśrodkowany tekst[/centre]
```

## Linki, obrazki i media

* `[url]https://ussr.pl[/url]` — po prostu pokazuje link
* `[url=https://ussr.pl]click here[/url]` — własny tekst linku
* `[img]https://example.com/image.png[/img]`
* `[email]you@example.com[/email]` lub `[email=you@example.com]Contact me[/email]`
* `[audio]https://example.com/song.mp3[/audio]`
* `[youtube]https://www.youtube.com/watch?v=dQw4w9WgXcQ[/youtube]` — działa też z linkami `youtu.be` i samymi ID filmów
* `[twitch]https://clips.twitch.tv/SomeClipName[/twitch]`
* `[profile=1000]Aochi[/profile]` — link do użytkownika po ID z własnym tekstem
* `[profile]4812[/profile]` — link prosto do `/u/4812`

> [!NOTE]
> Działają tylko linki `http`/`https`, wszystko inne (`javascript:`, `data:` itd.) jest wycinane.

```bbcode-example
[url=https://ussr.pl]kliknij tutaj[/url] albo po prostu [url]https://ussr.pl[/url]
[profile=1000]Aochi[/profile]
```

## Cytaty i wyróżnienia

* `[quote]text[/quote]`
* `[quote="Aochi"]text[/quote]` — pokazuje, kogo cytujesz
* `[notice]text[/notice]` — wyróżniona ramka, dobra na ostrzeżenia/ważne info
* `[spoiler]hidden text[/spoiler]` — zaczernione, dopóki tego nie zaznaczysz
* `[box=Title]content[/box]` — zwijana ramka, kliknij tytuł, żeby ją rozwinąć
* `[spoilerbox]content[/spoilerbox]` — to samo co wyżej, ale z tytułem „SPOILER”

```bbcode-example
[quote="Aochi"]to jest cytat[/quote]
[notice]nie zapomnij przeczytać zasad[/notice]
[spoiler]udało ci się znaleźć sekretny tekst[/spoiler]
[box=Kliknij, żeby rozwinąć]to było ukryte[/box]
```

## Kod

`[code]your text here[/code]` albo w skrócie `[c]...[/c]`. Zachowuje formatowanie i nie parsuje żadnego BBCode w środku.

```bbcode-example
[code]to [b]zostaje[/b] dokładnie tak, jak zostało napisane[/code]
```

## Listy

```bbcode-example
[list]
[*]punkt pierwszy
[*]punkt drugi
[/list]
```

Styl numeracji zależy od tego, co wpiszesz po `[list=`:

* `[list=1]` — 1, 2, 3...
* `[list=a]` — a, b, c...
* `[list=A]` — A, B, C...
* `[list=i]` — i, ii, iii...
* `[list=I]` — I, II, III...
* `[list style=a]` (albo `A`/`i`/`I`/`1`) — to samo, ale jeśli po `=` wolisz wpisać prawdziwy tytuł (patrz niżej), użyj tej wersji

Cokolwiek innego po `[list=` jest traktowane jako tytuł wyświetlany nad listą, np. `[list=Songs used][*]one[*]two[/list]`.

```bbcode-example
[list=A]
[*]element pierwszy
[*]element drugi
[/list]
```

## Układ

* `[container width=500]stuff[/container]` — szerokość w pikselach
* `[container compact centre]stuff[/container]` — `compact` i `centre`/`center` można łączyć z `width`
* `[hr]` — pozioma linia oddzielająca

```bbcode-example
[container width=250 centre][b]wyśrodkowana ramka[/b][/container]
```

## Imagemap

Zamienia obrazek w klikalne obszary, przydatne np. do creditów dla ludzi w collabie. Pierwsza linia to obrazek, każda kolejna to jeden klikalny prostokąt:

```bbcode-example
[imagemap]
https://ussr.pl/static/images/peppy_mad.png
0 0 50 100 https://ussr.pl lewa połowa
50 0 50 100 https://ussr.pl prawa połowa
[/imagemap]
```

Każda linia obszaru to `x y width height link label`, gdzie `x`/`y`/`width`/`height` to procenty rozmiaru obrazka (0-100, można używać ułamków dziesiętnych). Jako linku użyj `#`, jeśli chcesz tylko tooltip po najechaniu, bez przechodzenia nigdzie po kliknięciu.

> [!TIP]
> Nie chce ci się liczyć współrzędnych ręcznie? [Ten generator imagemap](https://alexaario.github.io/osu-BBCodeImagemapGenerator/) pozwala zaznaczać obszary bezpośrednio na obrazku i sam wypluwa gotowy BBCode.

## Emoji

Wpisanie jednej z tych nazw między dwukropkami wstawia pasującą emotkę, np. `:peppy:`.

```bbcode-example
:peppy: :kappa: :barney: :foka: :akerino:
```

akerino, alien, angel, angry, barney, blink, blush, cheerful, cool, creepypeppy, cwy, devil, dizzy, djpeppy, ermm, face, foka, getlost, grin, happy, heart, kappa, kappy, kissing, laughing, ninja, peppy, peppyfiero, pinch, pouty, sad, shocked, sick, sideways, silly, sleeping, smile, tongue, unsure, w00t, wassat, whistling, wink, wub
