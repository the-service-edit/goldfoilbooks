# Gold Foil Books

A static HTML rebuild of goldfoilbooks.com.au, built to be transferred into
Squarespace. No frameworks, no build step, no dependencies. Open `index.html`
in a browser and it runs.

---

## What this is

The current site presents Gold Foil Books as a shop that happens to contain
illustrations. This rebuild inverts that: the illustrations lead, the object
follows, and commerce stays quiet and easy.

The homepage follows the structural language of the reference site supplied by
the client: a dark cinematic hero with the book object beside a large title, a
proof band of reviews and guarantees, centred rule-flanked section headings,
alternating text and image rows for each edition, a maker section, and a light
contact panel over artwork. Every colour, typeface and asset in it is Gold Foil
Books. The red accent of the reference becomes foil gold, the author portrait
becomes the studio frame from the drawing video, and two sections that the
reference has no equivalent for were kept because the brand needs them: the
Procreate process section and the full-width endpapers.

The spine of the whole site is one idea, taken from the founder's own
Instagram caption:

> I couldn't find the edition that I wanted, so I taught myself how to make it.

Everything else is evidence for that sentence.

---

## Project structure

```
gold-foil-books/
  index.html                homepage
  README.md                 this file
  SQUARESPACE-MIGRATION.md  component by component migration map

  css/
    styles.css              all styling, namespaced under .gfb-site

  js/
    main.js                 all behaviour, vanilla, ~230 lines

  pages/
    shop.html               rebinds and artwork
    product.html            full product page, A Court of Thorns and Roses
    collection.html         immersive collection world, ACOTAR
    process.html            how a rebind is made
    about.html              the artist

  assets/
    artwork/                8 supplied illustrations, web derivatives
    video/                  the Procreate recording, encoded for web
    brand/                  reserved for logo files when supplied
```

## Assets

### Artwork

The eight supplied illustrations are served at 640, 1000 and a maximum of
1400px on the long edge, in both WebP and progressive JPEG. Each also
has a 3:4 portrait crop at 640 and 1000 (`-p640`, `-p1000`) with a per-image
focal bias, used for full-bleed sections on phones so the composition is never
blind-centre-cropped.

`assets/artwork/manifest.json` records source dimensions, aspect ratios and the
average colour of each image. The per-collection palettes in `styles.css` were
derived from those averages, not invented.

### Video

The supplied `.MOV` is a 5.9 second phone recording of an iPad running
Procreate. It was cropped to the tablet screen (`crop=684:632:36:384`), stripped
of audio and encoded to MP4 (h264, faststart) and WebM (VP9), with a poster
frame taken at 5.5s where the illustration is finished.

- `drawing-process.mp4` 511 KB
- `drawing-process.webm` 446 KB
- `drawing-process-poster.jpg` 81 KB

It is muted, `playsinline`, looped, `preload="none"`, plays only while in view,
pauses when it leaves, and never plays at all under `prefers-reduced-motion`.
A visible Play and Pause control is always present.

### Lifestyle photography

Two crops of one photograph were supplied: a 2:3 portrait and a 16:9 banner.
They live in `assets/products/` as `in-hand-*` and `in-hand-wide-*`, in WebP and
JPEG at three widths each.

This is the only asset showing the object at human scale, in real light, with
the full cover wrap open: illustrated back cover carrying a foiled quote, foiled
spine, front cover. It is used in three places:

1. **Homepage, In your hands.** The banner crop runs full bleed with copy set in
   the sunlit wall at the left, which is the only large area of the frame with no
   subject in it. Under 768px the band restacks: the portrait crop sits on top at
   4:5 and the copy sits beneath it on the night ground, because the portrait
   crop has no clear area large enough to hold type.
2. **Product page gallery.** First thumbnail, swappable into the main frame.
3. **Product page, Open it out.** A large editorial figure beside the copy that
   explains the wrap.

### Product photography

Product photos are referenced directly from the live Squarespace CDN with
`?format=Nw` responsive parameters. This is deliberate: those images already
live where the site is going, so migration needs no re-upload, and Squarespace
serves the right size for the device. If the mockup is ever moved off the
Squarespace CDN, replace the `images.squarespace-cdn.com` URLs with local files
under `assets/products/`.

---

## Protecting the artwork

The illustrations are sold as $7.99 downloads, so the site should not hand them
over for free. Four things are in place.

**1. Resolution, which is the only real defence.** Every illustration is capped
at 1400px on the long edge at quality 79. That is sharp on any screen, including
a retina laptop at full width, and it is poor in print: about 12cm across at
300dpi. Someone who saves one gets a screen file, not a printable one. Nothing
else on this list matters as much as this.

**2. Right click, drag and long press.** Artwork images carry `data-protect`,
which sets `pointer-events: none` on the image. A right click or an iOS long
press therefore lands on the container, so the browser offers the ordinary page
menu instead of Save image as. `protectArt()` in `main.js` also cancels
`contextmenu` inside artwork containers and cancels `dragstart` on the images.

This is scoped deliberately. Product photography, the lifestyle shot, navigation,
text and forms behave completely normally, because a site that blocks right
click everywhere is hostile to ordinary visitors and blocks nothing worth
blocking. Links, the compare slider and the product gallery all still work,
which is verified.

**3. Copyright in the file.** Every artwork JPEG carries a comment: copyright
Gold Foil Books, personal viewing only, not licensed for download, reproduction,
print or resale. It travels with the file if one is saved and it helps in a
takedown.

**4. Print.** Artwork is hidden in the print stylesheet, so printing a page does
not produce a usable copy.

### What this does not do

Be clear-eyed. None of this stops a screenshot, developer tools, view source,
disabling JavaScript, or a direct request to the image URL. Any image a browser
renders can be captured. The purpose here is to stop the casual save, which is
almost all of it, and to make the file that does get taken worthless as a print.

If you want to go further, the next step is a visible watermark on the artwork
tiles: a small foil wordmark in a lower corner of the shop previews only, not on
the full-bleed sections where it would wreck the design. Say the word and it is
a twenty minute change.

### The Squarespace warning, which matters more than any of the above

On Squarespace, images are served from `images.squarespace-cdn.com` and the
size is a URL parameter. Anyone can take an image URL from the page and swap
`?format=750w` for `?format=2500w` to get the largest size that was uploaded,
whatever the page itself requested. No amount of front-end code changes this.

So the control on the live site is the master file. **Upload the artwork to
Squarespace at 1400px on the long edge, not at full resolution.** Keep the
originals off the server entirely and deliver the print-resolution files to
paying customers through the digital download product, which is exactly what
Squarespace commerce is for.

---

## Behaviour (js/main.js)

Every behaviour is additive. If the script fails to load, the page is still a
complete, readable, navigable site.

| Function | What it does |
|---|---|
| `header()` | Turns the fixed top bar solid once the first full-bleed scene has scrolled past |
| `nav()` | Full-screen mobile menu, Escape to close, focus and scroll locking |
| `reveal()` | Fade and rise on scroll via IntersectionObserver. Skipped entirely under reduced motion |
| `compare()` | The drawn / bound slider. Pointer drag, click, and Left, Right, Home, End keys |
| `video()` | Play in view, pause out of view, manual toggle, no autoplay under reduced motion |
| `gallery()` | Product thumbnails swap the main image |
| `cartStub()` | Placeholder only. Marked for replacement by native Squarespace commerce |
| `buybar()` | Sticky price and add to cart on screens under 992px, once the main button scrolls away |
| `protectArt()` | Blocks the context menu and dragging on illustrations only. See Protecting the artwork |
| `year()` | Footer copyright year |

---

## The hero

The hero is the lifestyle photograph: the object at human scale, in real light,
with the full cover wrap open. The subject fills the portrait frame, so the copy
takes its own dark panel beside it rather than fighting the picture. Phones put
the photograph first and the words directly beneath it, so the fixed header sits
over sofa and wall rather than over the headline.

This replaced an earlier hero built around a product cut-out, which did not
survive contact with the real photography. That note is kept below because the
same trap applies anywhere a product shot meets a dark ground.

## The old hero, and a photography note

The product photographs are shot on a light seamless backdrop. That is correct
for a shop listing and wrong for a near black hero: a light photo dropped onto a
dark ground reads as a white rectangle, and feathering its edge only turns it
into a halo. Two decisions follow.

**Desktop** owns the light ground rather than hiding it. The photo is cropped in
tight on the book and mounted on a warm card, so it reads as a print resting
against the scene. Deliberate, and it holds up.

**Phones** drop the product photo from the hero entirely. Stacked above the copy
it filled the screen and pushed the headline, the price and the buttons below
the fold, which is fatal for traffic arriving from Instagram. Phones now lead
with the illustration and the words, and meet the object immediately below in
the edition rows and the In your hands band.

**The real fix, when you want it:** one cut out PNG of each book with a
transparent background, or a reshoot of the hero book against a dark ground.
Then the book floats on the hero exactly as it does on the reference site, and
the mounting block in section 24 of the stylesheet can be deleted.

## Responsive

Built and visually checked at 1440, 1280, 1024, 768, 430, 390, 375 and 320px
across all six pages. Zero horizontal overflow, zero broken images and zero
console errors at every combination.

Mobile is not a scaled-down desktop:

- full-bleed scenes swap to dedicated 3:4 portrait crops
- the scrim over artwork is bottom-weighted on phones, because copy always
  lands on the lower third of the picture regardless of composition
- the product gallery becomes one large image plus a four-across thumbnail row
  rather than five stacked full-width images
- a sticky buy bar appears once the main add to cart button scrolls away
- collection portals stack to one column and shorten

---

## Accessibility

- semantic landmarks, one `h1` per page, ordered headings
- skip link
- descriptive alt text on every illustration, empty `alt` on decorative hover
  duplicates
- visible focus ring on every interactive element
- the compare slider is a real `role="slider"` with keyboard control
- `prefers-reduced-motion` disables reveals, autoplay, hover scale and all
  transitions
- text over artwork is placed only in verified negative space, with a scrim
  tuned per scene

---

## Performance

- responsive `srcset` and `sizes` on every image, with `<picture>` art
  direction where the crop changes
- explicit `width` and `height` on every image and video, so nothing shifts
- `loading="lazy"` everywhere except the hero, which is `fetchpriority="high"`
- video `preload="none"` with a poster
- two font families, one stylesheet, one script, no libraries

---

## Things that need confirming

Nothing in this build is invented. Prices, stock, processing times, dimensions,
materials, disclaimers and both customer reviews are quoted from the live site.
Voice and the origin story line come from the Instagram bio and captions.

Two things are inferred and should be checked before launch:

1. **Which artwork is which panel.** Filenames on the artwork product listings
   ("Back.png", "Front Endpaper.png", "Back Endpaper.png") plus aspect ratios
   give a strong reading: portrait pieces are covers, landscape pieces at
   roughly 1.3:1 are endpaper spreads across a 13.5 x 20.5cm opening. That maps
   to ACOTAR: The Hunt (front cover), Spring Court Manor (back cover),
   The Suriel (front endpaper), Pool of Starlight (back endpaper); and ACOMAF:
   Starfall in Velaris (front cover), The Cabin (back cover), The Wedding
   (front endpaper), Chapter 54 (back endpaper). Confirm before launch.

2. **No ACOWAR artwork was supplied.** That collection currently runs on
   product photography alone.

The lifestyle photograph confirms two details now used in the copy: the back
cover carries a foiled quote line, and the spine carries the foiled title with
rose detailing. If the person in the photograph is not the maker, written model
permission should be on file before the image goes live.

Also missing and worth adding: shipping times, returns policy, and any FAQ.
The contact page currently carries none of these.

---

## Recommendations not built, because they need a decision

- A three-book bundle at a set price. The whole series lined up is the single
  most repeated image on the Instagram account and nothing on the site sells it
  as a set. No bundle price is verified, so none was invented.
- ACOWAR is missing from the current homepage entirely. It is included here.
- Afterpay is live but buried in small grey text. It is surfaced next to the
  price on the product page.
- The Instagram bio line "I rebind the books you love" is stronger than the
  current homepage headline and is free to use.
