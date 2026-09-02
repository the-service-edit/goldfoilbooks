# Product pages: what was built, and how it goes into Squarespace

Companion to `SQUARESPACE-MIGRATION.md`. That file covers global setup. This
one covers the eleven product records and the three collection pages.

The rule is unchanged: **Squarespace owns commerce, this code owns the look.**
Nothing below asks you to rebuild a price, a stock count, a cart or a form.

---

## 1. What now exists

| Prototype file | Product | Live Squarespace URL |
|---|---|---|
| `pages/product.html` | A Court of Thorns and Roses, $85 | `/rebinds/p/a-court-of-thorns-and-roses-handbound` |
| `pages/product-acomaf.html` | A Court of Mist and Fury, $85 | `/rebinds/p/a-court-of-mist-and-fury-handbound` |
| `pages/product-acowar.html` | A Court of Wings and Ruin, $85 | `/rebinds/p/a-court-of-wings-and-ruin-hand-bound` |
| `pages/art-the-hunt.html` | The Hunt, $7.99 | `/artwork/p/the-hunt-fantasy-digital-art` |
| `pages/art-spring-court-manor.html` | Spring Court Manor, $7.99 | `/artwork/p/spring-court-manor-fantasy-digital-art` |
| `pages/art-the-suriel.html` | The Suriel, $7.99 | `/artwork/p/the-suriel-fantasy-digital-art` |
| `pages/art-pool-of-starlight.html` | Pool of Starlight, $7.99 | `/artwork/p/pool-of-starlight-fantasy-digital-art` |
| `pages/art-starfall-in-velaris.html` | Starfall in Velaris, $7.99 | `/artwork/p/starfall-in-velaris-fantasy-digital-art` |
| `pages/art-the-cabin.html` | The Cabin, $7.99 | `/artwork/p/the-cabin-digital-art` |
| `pages/art-the-wedding.html` | The Wedding, $7.99 | `/artwork/p/the-wedding-fantasy-digital-art` |
| `pages/art-chapter-54.html` | Chapter 54, $7.99 | `/artwork/p/chapter-54-feyre-rhysand-digital-art` |
| `pages/collection.html` | — | `/collections/acotar` (new page) |
| `pages/collection-acomaf.html` | — | `/collections/acomaf` (new page) |
| `pages/collection-acowar.html` | — | `/collections/acowar` (new page) |

Every existing product URL is kept. They are indexed and linked from Instagram.

---

## 2. The panel mapping, now confirmed

Previously listed as inferred. Confirmed on 2 Sept by reading the live product
photography for each edition, panel by panel.

**A Court of Thorns and Roses** — front cover *The Hunt*, back cover *Spring
Court Manor*, front endpaper *The Suriel*, back endpaper *Pool of Starlight*.

**A Court of Mist and Fury** — front cover *Starfall in Velaris*, back cover
*The Cabin* (carrying the foiled line "To the stars who listen — and the dreams
that are answered."), front endpaper *The Wedding* ("Hello, Feyre darling"),
back endpaper *Chapter 54*.

**A Court of Wings and Ruin** — front cover, three sisters on a wisteria
balcony. Back cover, an armada, carrying "I would have waited five hundred more
years for you." Front endpaper, a crowned court above a lily pond, carrying
"The sun was shining when I left you." Back endpaper, the Cauldron on a rocky
shore. **None of these four are sold as downloads.** See section 5.

The store's own artwork tags corroborate the split: four products tagged
*ACOTAR Artwork*, four tagged *ACOMAF Artwork*, none tagged for ACOWAR.

---

## 3. How one rebind product page goes in

Work top to bottom on the native product record. Do not create a new page.

| Region of the prototype | Where it goes |
|---|---|
| Photography, 8 images | Already uploaded. Order them 1 Cover, 4 Spine/Cover, 3 Back, 5 Edges/Cover, 7 Front Endpaper, 8 Back Endpaper |
| Title, price, sale price, stock, Afterpay | **Native.** Already correct. CSS only |
| `.gfb-offer-note`, `.gfb-price`, `.gfb-was` | **Native** sale price display, restyled |
| `.gfb-lock` sentence | Product description field, first line |
| Add to cart | **Native.** Delete `[data-add-to-cart]` |
| Intro paragraph and `.gfb-specs` list | Product description field |
| The four `<details class="gfb-disclosure">` blocks | Product description field, pasted as raw HTML |
| Reviews | **Native** product reviews block |
| Everything below `</section>` after the buy column | **One Code Block** in Additional Info, pasted as is |
| Sticky mobile buy bar | Code Block in the footer, calling `.sqs-add-to-cart-button` |

The editorial sections in that one Code Block, in order:

1. **The wrap** — the back cover photograph, headlined by the foiled quote.
2. **The cover artwork** *(ACOTAR, ACOMAF)* — the illustration full width on a
   dark ground, with a button to the $7.99 download.
   *(ACOWAR)* — the front endpaper photograph instead.
3. **From drawing to book** *(ACOTAR, ACOMAF)* — the compare slider.
   *(ACOWAR)* — the sprayed-versus-painted edges section.
4. **Inside** — the two endpapers.
5. **Details** — four detail photographs.
6. **Continue the collection** — the other two editions plus one cross-sell.

---

## 4. How one artwork product page goes in

Shorter, and the layout is the same on all eight.

| Region | Where it goes |
|---|---|
| The illustration | **Native** product image. Upload at 1400px on the long edge, no larger |
| Price, sale price, add to cart, file delivery | **Native** digital product. Never rebuild |
| Eyebrow, lede, description, `.gfb-specs`, three disclosures | Product description field |
| "Where it lives" and "The rest of the set" | **One Code Block** in Additional Info |

**"Where it lives" is the point of these pages.** A $7.99 buyer is the warmest
lead you have for an $85 book, and until now nothing on the site told them the
drawing they just bought is the cover of one. That section shows the panel in
place on the finished edition and links straight to it. If you cut anything
from these pages to save time, do not cut that.

---

## 5. Decide these before you publish

**1. How the $85 series price is actually honoured.** The disclosure on all
three rebind pages currently says a code arrives with the dispatch email. That
mechanism has never been confirmed. It is marked `CONFIRM BEFORE PUBLISHING` in
all three files. Publishing an unconfirmed promise on a price is the one thing
here that can cost you money.

**2. What the artwork buyer actually receives.** Every one of the eight artwork
pages says only "high resolution digital download". Resolution, file format and
the largest sensible print size are the three things a print buyer decides on,
and none of them are stated anywhere on the site. Marked `CONFIRM BEFORE
PUBLISHING` in all eight files. This is the biggest single conversion gap in
the set.

**3. The two five-star reviews belong to one product record.** They are not
hard-coded onto the ACOMAF or ACOWAR pages, deliberately. Note that
`pages/product.html` carries an `aggregateRating` in its structured data; if
those two reviews are not on that specific product, that markup is a
misrepresentation to Google and should be removed. The new pages ship with no
`aggregateRating` at all.

**4. Four finished ACOWAR panels are not for sale.** The cover, the back, and
both endpapers exist, are photographed, and are as strong as anything in the
other two books. There are no artwork products for them. That is four missing
$7.99 SKUs, and it is also why the ACOWAR page is the weakest of the three: it
is the only one that cannot show a drawing at the size it was drawn, and the
only one without a drawn-versus-bound slider. Adding those four downloads fixes
a revenue gap and a page-quality gap with one upload.

**5. The GitHub Pages copy still has no `noindex`.** It is a near-complete
duplicate of a live commercial site and will compete with goldfoilbooks.com.au
in search. Carried over from the earlier audit, still open.

---

## 6. Checked

- 18 pages. Every local `href`, `src` and `srcset` resolves.
- One `<h1>` per page, no duplicate IDs, no image without `alt`, balanced markup.
- Rendered at 1440px and 390px: zero horizontal overflow, zero broken local images.
- 19 links repaired across `index.html`, `shop.html`, `product.html` and
  `collection.html`. Among them: the homepage "shop book two" and "shop book
  three" buttons, which both pointed at book one.
- No new CSS. Every page is built from classes already in `css/styles.css`.

---

## 7. Meet the maker portrait (added 2 Sept)

`assets/studio/maker-{640,852}.{jpg,webp}` — a 3:4 crop of the supplied
photograph. Used in two places:

- `index.html`, section 06, replacing the studio frame from the drawing video
  that was standing in for a portrait.
- `pages/about.html`, a new **The maker** section between the intro copy and
  the Follow along block.

In Squarespace both are Code Blocks, or an Image Block plus a Text Block if you
would rather edit the copy in the editor. Upload the 852px file.

**One limit worth knowing.** The supplied master is 852px on its long edge.
In that two-column slot the image renders about 571px wide, which a MacBook
display asks for at roughly 1142px. It will look slightly soft on retina and
fine everywhere else. If the original camera roll frame or the source video
still exists at full size, re-crop from that and regenerate. The crop is
3:4 from the top of the frame, 90px down.
