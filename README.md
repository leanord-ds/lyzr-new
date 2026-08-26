# Lyzr — Homepage

Production build of the homepage from the Figma file
`Lyzr-Brand / Frame 9` (node `1:2`), implemented on the **Aeonik Warm** design system.

## Run it

Any static host. Locally:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies, no framework. Drop the folder on Netlify, Vercel,
S3, or into a WordPress theme directory as-is.

## Structure

```
index.html               the page
css/tokens.css           design tokens + base element styles (the design system)
css/components.css       reusable components (buttons, cards, forms, tables, utilities)
css/home.css             homepage composition — everything specific to this page
js/main.js               behaviour: sticky header, carousels, tabs, reveals, count-up
fonts/Figtree-*.woff2    fallback typeface (see Typography below)
assets/*.webp            images exported from the Figma file
```

`css/tokens.css` is the shared layer. It is the same file that ships with the
design system package — do not fork it per page.

## Typography — action required

The design calls for **Aeonik** (CoType Foundry), which is a licensed typeface and
cannot be redistributed. Two steps to switch it on:

1. Drop `Aeonik-Light.woff2`, `Aeonik-Regular.woff2`, `Aeonik-Medium.woff2` (also served at weight 600) and
   `Aeonik-Bold.woff2` into `fonts/`.
2. Nothing else. The `@font-face` rules and the font stack already name Aeonik first.

Until then the page renders in **Figtree**, self-hosted in `fonts/`. It is the
closest freely-licensed stand-in — geometric, similar x-height, straight-tailed `y`
— so the layout does not shift when the real files land.

## Assets — action required

`assets/lyzr-wordmark.webp` is the wordmark lifted from the Figma frame, and the
footer badge is a placeholder glyph drawn inline in `index.html`. Replace both with
the official SVGs before launch — an SVG wordmark will also stay crisp on retina
and recolour with `currentColor`.

## Theme

`<html data-theme="light">` pins the page to the light palette, which is what the
design specifies. The token layer supports dark mode in full: remove that attribute
to let the page follow the visitor's OS setting, or set `data-theme="dark"` to force
it. Every component reads semantic tokens, so nothing else needs to change.

## Where the build deviates from the Figma, and why

| Figma | Built | Reason |
|---|---|---|
| CTA fill `#D96354` with cream label | `#BD4C3F` (terracotta-600) | `#D96354` under cream measures **3.43:1** — a WCAG AA fail for button text. 600 reads the same and measures 4.71:1. |
| "Understand" label in `#D96354` at 12.8px | terracotta-700 | 2.94:1 → 6.7:1. Small text needs the darker step. |
| Inactive layer tabs in a pale tan | espresso-600 | 2.03:1 → 4.4:1. Still clearly muted against the active tab. |
| Subscribe button `#966868` | mahogany-700 | Cream label needed 4.5:1. |
| Two sections share the headline "Everything at once, That's why it takes weeks not years" | Kept visually; the second section carries its own `aria-label` | Almost certainly a placeholder in the Figma. **Worth a copy decision** — two identical H2s hurt SEO and screen-reader navigation. |
| Case-study carousel shows one static card | Three cards, snap-scrolling, prev/next | The frame draws neighbours peeking on both sides, so it was designed as a carousel. |
| Use-case cards all read "Regulatory Filing Preparation Agent" | Five distinct cards | Placeholder repetition in the Figma. Swap in real copy. |
| Hero logo strip drawn twice, running off-frame | Infinite marquee | Same intent, actually implemented. |

## Verified

- **axe-core (WCAG 2.1 A + AA + best-practice): 0 violations** at 1440px and 390px.
- No horizontal page scroll at 1440 / 390 / 320px.
- Keyboard: skip link, visible focus rings, roving-tabindex tablist with arrow/Home/End keys, Esc closes the mobile menu, arrow keys scroll a focused carousel.
- `prefers-reduced-motion: reduce` collapses every transition and renders all reveals in their final state.
- No JavaScript errors. The page is fully readable and navigable with JS disabled.

## Content still to replace

- Real case-study copy, links and images (three cards are currently variations on one story).
- Real use-case copy for the five agent cards.
- Real destinations for every `href="#"` in the nav and footer.
- Newsletter form action — `js/main.js` does not submit it anywhere.
