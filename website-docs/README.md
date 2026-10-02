# Writing docs

Each file in `en/` is one page at `/doc/<file name>`. They're plain markdown, so you can drop a file in or edit one at any time. Everything below is optional, and a file that uses none of it still works.

The extras are picked so the file still reads normally anywhere else (GitHub, an editor preview, the current site): they're either standard markdown, GitHub's own syntax, or HTML comments that other renderers hide.

## Front matter

```yaml
---
title: "Rules"
old_id: 9
description: "What is and isn't allowed, liveplay requirements and how punishments work."
icon: scale-balanced
colour: red
---
```

- `title` shows in the banner and on the docs index.
- `description` is the line under the title on the docs index.
- `icon` is a [Font Awesome](https://fontawesome.com/search?o=r&m=free&s=solid) solid icon name, without the `fa-`.
- `colour` sets the page's accent: `red`, `orange`, `yellow`, `green`, `teal`, `lblue`, `blue`, `purple` or `pink`.

`old_id` keeps the numeric links from the old site (`/doc/9`) working.

## Translations

A page in a language's folder (`ru/rules.md`, `pl/rules.md`) is shown to readers in that language. Pages that haven't been translated fall back to English.

Give a translation a `reference_version` in its front matter: the MD5 of the English file it was translated from. When the English page changes later, the translation gets a banner saying it's out of date, with a link to the English version. Get the value with:

```sh
bun -e "const t = await Bun.file('website-docs/en/rules.md').text(); console.log(new Bun.CryptoHasher('md5').update(t.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')).digest('hex'))"
```

Line endings don't affect it. After updating a translation, set its `reference_version` to the English file's current value.

## Callouts

GitHub's alert syntax. GitHub shows these as alerts too; anywhere else they're a normal quote.

```markdown
> [!NOTE]
> Each account you create adds one month to your appeal cooldown.
```

The five kinds are `NOTE`, `TIP`, `IMPORTANT`, `WARNING` and `CAUTION`.

## Section colours

Put a comment on the line before a heading. The heading gets a coloured dot, and list bullets up to the next heading of the same level take the colour.

```markdown
<!-- tone: red -->
## 1. Banned
```

Same colour names as `colour` above.

## Columns

Put a comment on the line before a long list of short items to spread it over columns.

```markdown
<!-- columns -->
* **Flip Axes**
* **PSSA**
```

## Tables

Standard markdown tables. Good for anything that's really rows and columns, like punishment strikes.

```markdown
| Strike | Punishment |
|--------|------------|
| 1st time | 1 month restriction |
```

## BBCode examples

A fenced block marked `bbcode-example` shows the code next to how it renders.

````markdown
```bbcode-example
[b]bold[/b]
```
````
