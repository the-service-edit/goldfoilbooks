/* ==========================================================================
   Gold Foil Books Website Review - settings
   Edit this file, nothing else, to point the tool at your Google Sheet.
   ========================================================================== */
window.REVIEW_CONFIG = {

  /* Paste the Apps Script web app URL here (it ends in /exec).
     See README.md in this folder for the 5 minute setup.
     Leave it empty and the tool still works, but notes stay on the
     reviewer's own computer instead of being shared. */
  endpoint: "",

  /* Must match SHARED_KEY in the Apps Script. Change both together.
     Deliberately NOT the CVBS key: one client's review link must never
     open another client's feedback. */
  key: "gfb-2026-review",

  /* Keeps feedback from different projects apart in one sheet. */
  project: "goldfoilbooks",

  /* The names offered on the opening screen. */
  reviewers: ["Dani", "Mel Cox"],

  /* Names that can add and delete requests in the "What we need from you"
     block. Everyone else can only answer them. */
  team: ["Mel Cox"],

  /* How often to pull in other people's notes, in seconds. */
  pollSeconds: 25
};
