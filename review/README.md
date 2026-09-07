# Gold Foil Books Website Review

A review shell for the goldfoilbooks prototype. Dani opens one link, walks the
15 linked pages one at a time, clicks anything she wants changed, and types
what she wants instead. Every note is pinned to the exact element, signed with
her name, and lands in one place.

Live at: `https://the-service-edit.github.io/goldfoilbooks/review/`

The prototype's `robots.txt` already disallows the whole site, and this folder
is `noindex, nofollow` on top of that.

---

## Files

| File | What it is |
|---|---|
| `index.html` | the shell |
| `review.css` | styling, Gold Foil Books tokens |
| `review.js` | all the logic: pinning, notes, sync, export |
| `config.js` | **the only file you edit.** Endpoint, key, reviewer names |
| `pages.json` | the 15 linked pages |
| `asks.json` | the starter list of things we need from Dani, one per page |
| `apps-script.gs` | the Google Sheet backend, paste-and-deploy |

## Before you send the link: the shared sheet

**This is the one thing that is not done.** `endpoint` in `config.js` is empty,
so right now every note stays in the reviewer's own browser. If Dani reviews on
her laptop and then opens it on her phone, the phone shows nothing. Five
minutes fixes it.

Deliberately a **separate sheet and a separate key** from CVBS. One client's
review link must never open another client's feedback.

1. New blank Google Sheet in hello@theserviceedit.com's Drive. Name it
   **Gold Foil Books Website Review**.
2. **Extensions, Apps Script.** Delete whatever is in `Code.gs` and paste in
   the whole of `apps-script.gs` from this folder. Save.
3. **Deploy, New deployment, Web app.** Execute as **me**, access
   **Anyone**. Deploy, then copy the URL that ends in `/exec`.
4. Paste that URL into `endpoint` in `config.js`. Commit and push.
5. Open the tool, leave a test note, and check the row appears in the sheet.

`SHARED_KEY` in the script is already `gfb-2026-review` and matches
`config.js`. If you ever change one, change both and redeploy.

**If you edit `apps-script.gs` later,** paste it in and then
**Deploy, Manage deployments, edit the pencil, Version: New version, Deploy.**
A plain save does not change what the web app serves.

**If the tool starts saying "Offline, will retry",** open the sheet, check the
script still exists, and confirm the deployment is still on Version 1 with
access set to Anyone.

## The page list

15 pages: the four site pages, the three rebinds, the eight artwork downloads.

The three collection pages are **not** in the list. They are parked and
unlinked, so putting them in front of Dani would collect feedback on pages
nobody can reach. If they come back, add them to `pages.json` and the count
looks after itself. Notes key off the file path, not the position in the list,
so adding or removing pages never orphans anything.

## The requests, "What we need from you"

Each page can carry requests: the pieces only Dani holds. They show at the top
of the notes panel on the page they belong to, and every one of them is listed
together under the **To do** tab and in **All feedback**. She types the answer
in the box and hits **Mark supplied**, or **Save for now** if she is part way
through. The count in the top bar is how many are still open.

`asks.json` seeds ten, taken from the open items in the audit, the shipping
work and the second copy pass. The sharpest ones are the $85 series price
mechanism, what the $7.99 download actually contains, and whether her name goes
on the site.

**Seeding happens once.** Each request is written into the shared store under a
fixed id, then it lives there like any other record. Editing `asks.json` after
that does nothing, and deleting a request in the tool sticks. Add new ones from
inside the tool instead: sign in as **Mel Cox** and use
**+ Add a request for this page**.

An open request does not stop a page being approved. They are two separate
questions: is the page right, and what are we still waiting on. The rail shows
both: a filled gold badge counts open notes, an outlined cream one counts open requests.

## What Dani sees

- **Left**: all 15 pages, grouped, with a dot each. Grey not looked at,
  gold changes wanted, green approved. A badge counts open notes.
- **Middle**: the real page in a frame, at desktop, tablet or phone width.
- **Point at something**: turns on pin mode. Hover highlights whatever is
  under the cursor, click drops a numbered pin, she types the change.
- **Add a note**: for anything about the page as a whole, with nothing to point
  at. Those show a square marker in the list and no pin on the page.
- **Right**: the requests for this page, the notes on it, everything still
  needed across the site under **To do**, and every open note under
  **Everything**.
- **Approve page** moves her to the next unreviewed page automatically.
- **All feedback**: the running total, plus **Copy for Mel** and a CSV.

Keyboard: `c` toggles pin mode, `]` jumps to the next unreviewed page,
`Esc` gets out of anything.

## Notes on how it works

- Notes are anchored by CSS selector plus a percentage offset inside the
  element, so a pin stays on its headline when the page reflows to mobile.
  If the element is ever deleted, the pin falls back to its original
  coordinates rather than disappearing.
- Everything is written to `localStorage` first and then pushed to the sheet,
  so a dropped connection never costs a note. The status light in the top bar
  says which state it is in.
- The sheet is polled every 25 seconds, so two people reviewing at the same
  time see each other's notes.
- The shared key in the URL is a soft gate, not security. Anyone with the
  review link and the key can read the notes. Do not put anything in there
  you would not put in an email.

## Colour

The shell uses the site's own gold system, and the same constraint holds:
`#ffe48c` only on dark grounds, `#805e00` for gold text on paper, `#c9971d`
for hairlines. See the comment at the top of `review.css`.

The pins and hover outlines inside the frame are **blue**, on purpose. They
have to read over cream paper, gold foil and the dark hero scenes alike, so
they use the one hue the site never touches. A gold pin on this site would
disappear into the artwork.

## Known snag on this site specifically

`[data-reveal]` elements sit near-invisible until the IntersectionObserver
fires. If Dani scrolls fast, or the frame loads scrolled, part of a page can
render blank. Scrolling back up fixes it. Worth solving properly with a
`prefers-reduced-motion` and no-JS fallback before this goes to Squarespace.
