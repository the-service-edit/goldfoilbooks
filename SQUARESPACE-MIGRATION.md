# Squarespace migration map

The rule that governs everything below: **Squarespace owns commerce, this code
owns the look.** Do not rebuild products, inventory, cart, checkout, orders,
customer accounts or forms in custom code. Every one of those stays native.

The site is Squarespace 7.1 with commerce and Afterpay already live. Nothing
here requires changing that.

---

## 1. Global setup

| Step | Where | What |
|---|---|---|
| Fonts | Settings > Advanced > Code Injection > Header | The two `<link>` tags for Fraunces and Inter from `index.html` |
| Stylesheet | Design > Custom CSS | Paste all of `css/styles.css`. Delete the `.gfb-site` body-level tokens block only if you instead scope tokens to `:root` |
| Script | Settings > Advanced > Code Injection > Footer | `<script>` with the contents of `js/main.js`, wrapped as is |
| Body class | Code Injection > Header | `<script>document.documentElement.addEventListener('DOMContentLoaded',function(){document.body.classList.add('gfb-site')})</script>` or add `gfb-site` via a Code Block wrapper on each page |

Squarespace loads its own CSS before Custom CSS, so these rules win by order.
Everything is namespaced under `.gfb-site` so nothing leaks into the admin UI
or into blocks you have not styled.

---

## 2. Component by component

| Mockup component | Squarespace implementation | Notes |
|---|---|---|
| Announcement strip | **Native** Marketing > Announcement Bar | Restyle with `.gfb-strip`. Copy is already live |
| Header, logo, nav | **Native** header, custom CSS | Nav labels change to Rebinds, Artwork, Process, About. Add a Process page |
| Cart link and count | **Native** cart element | Never rebuild. `cartStub()` exists only so the prototype does not look dead |
| Full-bleed hero scene | **Code Block** | One block per scene. The `<picture>` plus `.gfb-scene` markup, pasted as is |
| Compare slider (drawn / bound) | **Code Block** + the shared JS | Point the two `<img>` at Squarespace-hosted files |
| Process video section | **Code Block** | Upload the MP4, WebM and poster to Squarespace file storage and swap the `src` paths |
| Endpaper spreads | **Code Block**, or a native Gallery section set to full-bleed stacked | Code Block gives you the caption labels; the Gallery section is easier to update |
| Collection portals | **Code Block** | Three links out to collection pages |
| "Built to match on the shelf" | **Code Block** | Three product images side by side |
| Product grid (homepage and shop) | **Native** Products block | Set the category, then restyle with `.gfb-card`, `.gfb-card__media`, `.gfb-card__title`, `.gfb-card__meta`. The hover image swap needs a small addition, see below |
| Product page layout | **Native** product template + Custom CSS | Restyle the stock product template rather than rebuilding it |
| Price, stock, Afterpay | **Native** | Already correct on the live site. CSS only |
| Add to cart | **Native** product block | Replace `[data-add-to-cart]` entirely |
| Sticky mobile buy bar | **Code Block** + JS | Have it call `.sqs-add-to-cart-button` with `.click()` rather than holding its own state |
| Specification list | **Native** product description, or Additional Info | Style with `.gfb-specs` |
| Processing time, binding notes, disclaimers | **Native** product description | Wrap each in `<details class="gfb-disclosure">` inside the description field |
| Reviews | **Native** Squarespace product reviews | Already live, currently 5.00 from 2 reviews. The homepage quotes can be a Code Block until Squarespace exposes a reviews section |
| Newsletter | **Native** Newsletter block | Style with `.gfb-newsletter`. Do not rebuild the form |
| Footer | **Native** footer sections | CSS only |
| Contact form | **Native** Form block | Untouched |
| Accounts and checkout | **Native** | Untouched |

---

## 3. Product grid hover swap

The card hover that reveals the artwork behind the object needs a second image
per product. Two ways, in order of preference:

1. **Native.** Squarespace 7.1 product blocks support a secondary image on
   hover when a product has more than one image. Set the second product image
   to the artwork and enable the hover option in the Products section design
   settings. No code.
2. **Custom.** If the native option is unavailable in your template, use a
   Code Block grid instead of the Products block. You lose live inventory
   syncing on that grid, so only do this on the homepage feature strip, never
   on the shop page.

---

## 4. Page map

| Page | URL | Type |
|---|---|---|
| Home | `/` | Page, mostly Code Blocks |
| Rebinds | `/rebinds` | Existing products page, restyled, plus an intro Code Block |
| Artwork | `/artwork` | Existing products page, restyled |
| Collections | `/collections/acotar`, `/collections/acomaf`, `/collections/acowar` | New pages, Code Blocks |
| Process | `/process` | New page, Code Blocks |
| About | `/about` | Existing page, restyled |
| Contact | `/contact` | Existing page, untouched |
| Product pages | `/rebinds/p/...` | Existing, restyled |

Keep every existing product URL. They are indexed and linked from Instagram.

---

## 5. What to do first

1. Paste the CSS and the fonts. Nothing breaks; the site simply changes clothes.
2. Restyle the product page. It is where the money is and it needs the least
   custom code.
3. Add the Process page. It is the highest-value new page and it is a single
   Code Block plus three uploads.
4. Rebuild the homepage section by section, keeping the existing product blocks.
5. Add the collection pages last, once the artwork panel mapping is confirmed.

---

## 6. Artwork protection on the live site

The prototype blocks right click and dragging on illustrations, and serves them
capped at 1400px on the long edge. Carry both across, but understand where the
real control sits.

| Step | Where | What |
|---|---|---|
| Upload masters at 1400px | Squarespace image manager | The single most important step. The CDN will serve any size that was uploaded, on request, via `?format=2500w`. If the full resolution file is on the server, it is public |
| Keep originals off the server | Your own storage | Deliver print files only through the digital download product |
| Right click and drag blocking | Code Injection footer, already in `main.js` | Works unchanged. It is scoped to `[data-protect]`, so add that attribute to artwork images inside Code Blocks |
| Native gallery and product images | Squarespace | Native blocks will not carry `data-protect`. Either accept it on product photography, which is not the thing being sold, or add the attribute with a small script that targets those images by container |
| Print stylesheet | Custom CSS | Already included |

Do not enable a site-wide right click blocker. It annoys real visitors, breaks
accessibility tooling, and stops nobody who is trying.

## 7. What to avoid

- Do not use Code Blocks for anything with a price or a stock count.
- Do not inject JavaScript that reads or writes cart state.
- Do not replace the native header or footer with custom markup. Restyle them.
- Do not remove the `.gfb-site` namespace. It is what keeps this from fighting
  Squarespace updates.
- Do not switch template families. Everything here works on 7.1 as configured.
