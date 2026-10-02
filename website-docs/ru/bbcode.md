---
reference_version: 5b6deba36e8d8b87702581b50909eda5
title: "BBCode"
description: "Всё, что можно использовать на юзерпейдже, с живыми примерами."
icon: code
colour: blue
---

# BBCode

Вот что можно использовать на своём юзерпейдже (Настройки > Юзерпейдж) и везде, где работает BBCode. Теги чувствительны к регистру, и большинству нужен закрывающий тег, например `[b]текст[/b]`. Все примеры ниже рендерятся вживую, так что что видишь, то и получишь.

----------------------------------------------------

## Форматирование текста

* `[b]жирный[/b]` или `[bold]жирный[/bold]`
* `[i]курсив[/i]` или `[italic]курсив[/italic]`
* `[u]подчёркнутый[/u]` или `[underline]подчёркнутый[/underline]`
* `[s]зачёркнутый[/s]` или `[strike]зачёркнутый[/strike]`
* `[size=8]текст крупнее[/size]` — размер от 1 до 15, всё, что выше 15, урезается до 15
* `[colour=red]текст[/colour]` или `[color=#ff0000]текст[/color]` — названия цветов, hex (`#fff`, `#ff0000`) или `rgb()`/`rgba()`
* `[centre]текст[/centre]` (или `[center]`), `[left]текст[/left]`, `[right]текст[/right]`
* `[heading]Большой заголовок[/heading]`

```bbcode-example
[b]жирный[/b], [i]курсив[/i], [u]подчёркнутый[/u], [s]зачёркнутый[/s]
[size=4]текст крупнее[/size]
[colour=red]красный текст[/colour] и [color=#3ba7ff]синий текст[/color]
[centre]текст по центру[/centre]
```

## Ссылки, картинки и медиа

* `[url]https://ussr.pl[/url]` — просто показывает ссылку
* `[url=https://ussr.pl]жми сюда[/url]` — свой текст ссылки
* `[img]https://example.com/image.png[/img]`
* `[email]you@example.com[/email]` или `[email=you@example.com]Напиши мне[/email]`
* `[audio]https://example.com/song.mp3[/audio]`
* `[youtube]https://www.youtube.com/watch?v=dQw4w9WgXcQ[/youtube]` — также работает со ссылками `youtu.be` и просто с ID видео
* `[twitch]https://clips.twitch.tv/SomeClipName[/twitch]`
* `[profile=1000]Aochi[/profile]` — ссылка на игрока по ID со своим текстом
* `[profile]4812[/profile]` — ведёт прямо на `/u/4812`

> [!NOTE]
> Принимаются только ссылки `http`/`https`, всё остальное (`javascript:`, `data:` и т. д.) вырезается.

```bbcode-example
[url=https://ussr.pl]жми сюда[/url] или просто [url]https://ussr.pl[/url]
[profile=1000]Aochi[/profile]
```

## Цитаты и выделения

* `[quote]текст[/quote]`
* `[quote="Aochi"]текст[/quote]` — показывает, кого цитируют
* `[notice]текст[/notice]` — выделенный блок, подходит для предупреждений/важной инфы
* `[spoiler]скрытый текст[/spoiler]` — закрашен чёрным, пока его не выделишь
* `[box=Заголовок]содержимое[/box]` — сворачиваемый блок, нажми на заголовок, чтобы развернуть
* `[spoilerbox]содержимое[/spoilerbox]` — то же самое, но с заголовком «SPOILER»

```bbcode-example
[quote="Aochi"]это цитата[/quote]
[notice]не забудь прочитать правила[/notice]
[spoiler]а вот и секретный текст[/spoiler]
[box=Развернуть]это было скрыто[/box]
```

## Код

`[code]твой текст[/code]` или коротко `[c]...[/c]`. Сохраняет форматирование и не обрабатывает BBCode внутри.

```bbcode-example
[code]это [b]останется[/b] ровно как написано[/code]
```

## Списки

```bbcode-example
[list]
[*]пункт один
[*]пункт два
[/list]
```

Стиль нумерации зависит от того, что ты пишешь после `[list=`:

* `[list=1]` — 1, 2, 3...
* `[list=a]` — a, b, c...
* `[list=A]` — A, B, C...
* `[list=i]` — i, ii, iii...
* `[list=I]` — I, II, III...
* `[list style=a]` (или `A`/`i`/`I`/`1`) — то же самое, но если после `=` хочешь поставить настоящий заголовок (см. ниже), используй лучше этот вариант

Всё остальное после `[list=` считается заголовком, который показывается над списком, например `[list=Использованные песни][*]раз[*]два[/list]`.

```bbcode-example
[list=A]
[*]пункт один
[*]пункт два
[/list]
```

## Разметка

* `[container width=500]что-нибудь[/container]` — ширина в пикселях
* `[container compact centre]что-нибудь[/container]` — `compact` и `centre`/`center` можно сочетать с `width`
* `[hr]` — горизонтальный разделитель

```bbcode-example
[container width=250 centre][b]блок по центру[/b][/container]
```

## Imagemap

Превращает картинку в кликабельные области — удобно, чтобы указать всех участников коллаба. Первая строка — картинка, каждая следующая — одна кликабельная область:

```bbcode-example
[imagemap]
https://ussr.pl/static/images/peppy_mad.png
0 0 50 100 https://ussr.pl левая половина
50 0 50 100 https://ussr.pl правая половина
[/imagemap]
```

Каждая строка области выглядит как `x y width height link label`, где `x`/`y`/`width`/`height` — проценты от размера картинки (0-100, дробные значения можно). Поставь `#` вместо ссылки, если нужна просто подсказка при наведении без перехода.

> [!TIP]
> Не хочется высчитывать координаты вручную? В [этом генераторе imagemap](https://alexaario.github.io/osu-BBCodeImagemapGenerator/) можно выделить области прямо на картинке, и он сам выдаст готовый BBCode.

## Эмодзи

Если написать одно из этих названий между двоеточиями, вставится соответствующий смайлик, например `:peppy:`.

```bbcode-example
:peppy: :kappa: :barney: :foka: :akerino:
```

akerino, alien, angel, angry, barney, blink, blush, cheerful, cool, creepypeppy, cwy, devil, dizzy, djpeppy, ermm, face, foka, getlost, grin, happy, heart, kappa, kappy, kissing, laughing, ninja, peppy, peppyfiero, pinch, pouty, sad, shocked, sick, sideways, silly, sleeping, smile, tongue, unsure, w00t, wassat, whistling, wink, wub
