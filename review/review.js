/* ==========================================================================
   Gold Foil Books Website Review
   The Service Edit, September 2026.

   One page, one iframe of the real site, click anything to pin a note.
   Records live in localStorage first and sync to a Google Sheet if
   config.js has an endpoint. Nothing is ever lost if the sheet is down.
   ========================================================================== */
(function () {
"use strict";

var CFG = window.REVIEW_CONFIG || {};
var LS_RECORDS = "gfb-review-records-v1";
var LS_QUEUE   = "gfb-review-queue-v1";
var LS_WHO     = "gfb-review-who-v1";
var LS_ENDPOINT = "gfb-review-endpoint-v1";

var PAGES = [];
var BY_ID = {};
var records = {};          // id -> record
var queue = [];            // record ids waiting to sync
var who = "";
var current = null;        // current page object
var pinning = false;
var tab = "page";
var filter = "all";
var search = "";
var frameDoc = null;
var markerBox = null;

/* ---------------------------------------------------------------- helpers */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
  return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
function uid() { return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function now() { return new Date().toISOString(); }

function when(iso) {
  var d = new Date(iso), diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function toast(msg) {
  var t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2600);
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

/* The folder the site sits in, worked out from where this tool is served.
   Handles /goldfoilbooks/review/, /review/ on a custom domain, and localhost. */
var SITE_ROOT = location.pathname.replace(/review\/[^\/]*$/, "");

function relOf(pathname) {
  var rel = pathname.indexOf(SITE_ROOT) === 0 ? pathname.slice(SITE_ROOT.length) : pathname.replace(/^\//, "");
  if (rel === "" || rel.slice(-1) === "/") rel += "index.html";
  return rel;
}

/* --------------------------------------------------------------- records  */
function list() {
  return Object.keys(records).map(function (k) { return records[k]; })
    .filter(function (r) { return !r.deleted; })
    .sort(function (a, b) { return a.created < b.created ? -1 : 1; });
}
function notesFor(pageId) {
  return list().filter(function (r) { return r.kind === "note" && r.page === pageId; });
}
/* Notes that sit on an element. Page level notes have no selector and get
   no pin, they just live in the list. */
function pinnedFor(pageId) {
  return notesFor(pageId).filter(function (r) { return !!r.selector; });
}
function asksFor(pageId) {
  return list().filter(function (r) { return r.kind === "ask" && r.page === pageId; });
}
function answerFor(askId) {
  var a = records["ans-" + askId];
  return a && !a.deleted ? a : null;
}
function askDone(askId) {
  var a = answerFor(askId);
  return !!(a && a.status === "done");
}
function openAsksFor(pageId) {
  return asksFor(pageId).filter(function (r) { return !askDone(r.id); });
}
function allOpenAsks() {
  return list().filter(function (r) { return r.kind === "ask" && !askDone(r.id); });
}
function isTeam() {
  return (CFG.team || ["Mel Cox"]).indexOf(who) !== -1;
}
function openNotesFor(pageId) {
  return notesFor(pageId).filter(function (r) { return r.status !== "resolved"; });
}
function verdictFor(pageId) {
  var v = list().filter(function (r) { return r.kind === "verdict" && r.page === pageId; });
  return v.length ? v[v.length - 1] : null;
}
function pageState(pageId) {
  if (openNotesFor(pageId).length) return "changes";
  var v = verdictFor(pageId);
  if (v && v.verdict === "approved") return "approved";
  if (v && v.verdict === "changes") return "changes";
  return "todo";
}

function put(rec, push) {
  rec.updated = now();
  records[rec.id] = rec;
  save(LS_RECORDS, records);
  if (push !== false) { enqueue(rec.id); }
  renderAll();
}

/* ------------------------------------------------------------------ sync  */
function enqueue(id) {
  if (queue.indexOf(id) === -1) queue.push(id);
  save(LS_QUEUE, queue);
  if (!CFG.endpoint) { setSync("local"); return; }
  flush();
}

var flushing = false;
function flush() {
  if (flushing || !CFG.endpoint || !queue.length) return;
  flushing = true;
  var batch = queue.slice(0, 25).map(function (id) { return records[id]; }).filter(Boolean);
  setSync("saving");
  fetch(CFG.endpoint, {
    method: "POST",
    /* text/plain keeps the browser from sending a CORS preflight,
       which Apps Script web apps cannot answer. */
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ key: CFG.key, project: CFG.project, action: "upsert", records: batch })
  })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res || res.ok !== true) throw new Error(res && res.error || "rejected");
      queue = queue.slice(batch.length);
      save(LS_QUEUE, queue);
      flushing = false;
      setSync(queue.length ? "saving" : "ok");
      if (queue.length) flush();
    })
    .catch(function () {
      flushing = false;
      setSync("err");
      setTimeout(flush, 8000);
    });
}

function pull() {
  if (!CFG.endpoint) return;
  fetch(CFG.endpoint + "?key=" + encodeURIComponent(CFG.key) +
        "&project=" + encodeURIComponent(CFG.project) + "&t=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res || !res.records) return;
      var changed = false;
      res.records.forEach(function (r) {
        var mine = records[r.id];
        if (!mine || (r.updated || "") > (mine.updated || "")) {
          if (queue.indexOf(r.id) === -1) { records[r.id] = r; changed = true; }
        }
      });
      if (changed) { save(LS_RECORDS, records); renderAll(); }
      if (!queue.length) setSync("ok");
    })
    .catch(function () { setSync("err"); });
}

function setSync(mode) {
  var el = $("#sync"), txt = $("#sync-txt");
  el.className = "sync";
  if (mode === "local") { el.classList.add("off"); txt.textContent = "Saved on this computer"; }
  else if (mode === "saving") { txt.textContent = "Saving…"; }
  else if (mode === "err") { el.classList.add("err"); txt.textContent = "Offline, will retry"; }
  else { txt.textContent = "Shared and saved"; }
}

/* ------------------------------------------------------------ page anchor */
function cssPath(el) {
  if (!el || el.nodeType !== 1) return "";
  var parts = [], depth = 0;
  while (el && el.nodeType === 1 && depth < 8) {
    if (el.id) { parts.unshift("#" + CSS.escape(el.id)); break; }
    var name = el.nodeName.toLowerCase();
    if (name === "body" || name === "html") { parts.unshift(name); break; }
    var p = el.parentNode, i = 1, sib = el;
    while ((sib = sib.previousElementSibling)) { if (sib.nodeName === el.nodeName) i++; }
    parts.unshift(name + ":nth-of-type(" + i + ")");
    el = p; depth++;
  }
  return parts.join(" > ");
}

function labelOf(el) {
  var tag = el.nodeName.toLowerCase();
  var txt = (el.getAttribute("alt") || el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  if (tag === "img") return 'image "' + (el.getAttribute("alt") || el.getAttribute("src") || "").split("/").pop() + '"';
  if (!txt) return "<" + tag + ">";
  if (txt.length > 64) txt = txt.slice(0, 62) + "…";
  return tag + ' "' + txt + '"';
}

/* Pick the most meaningful element under the click: prefer a small,
   text-bearing element over a giant wrapper section. */
function targetOf(el) {
  var best = el, hops = 0;
  while (best && best.nodeType === 1 && hops < 3) {
    var r = best.getBoundingClientRect();
    if (r.height > 0 && r.height < 500) break;
    if (!best.parentElement) break;
    if (best.children.length === 0) break;
    break;
  }
  return best;
}

/* --------------------------------------------------------------- markers  */
var MARKER_CSS =
  '.gfbr-box{position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483000}' +
  '.gfbr-pin{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50% 50% 50% 4px;' +
  'transform:rotate(-45deg);background:#2E7DF7;border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);' +
  'pointer-events:auto;cursor:pointer;display:grid;place-items:center;font:700 12px/1 Inter,sans-serif;color:#fff}' +
  '.gfbr-pin span{transform:rotate(45deg)}' +
  '.gfbr-pin.done{background:#1B8A5A;color:#fff}' +
  '.gfbr-pin.on{outline:3px solid #12100e;outline-offset:2px}' +
  '.gfbr-hl{position:absolute;pointer-events:none;border:2px solid #2E7DF7;background:rgba(46,125,247,.14);' +
  'border-radius:3px;transition:all .06s linear;z-index:2147482999}' +
  'html.gfbr-pinning,html.gfbr-pinning *{cursor:crosshair !important}';

function prepFrame() {
  try {
    frameDoc = $("#frame").contentDocument;
    if (!frameDoc || !frameDoc.body) return false;
  } catch (e) { frameDoc = null; return false; }

  if (!frameDoc.getElementById("gfbr-style")) {
    var st = frameDoc.createElement("style");
    st.id = "gfbr-style"; st.textContent = MARKER_CSS;
    frameDoc.head.appendChild(st);
  }
  markerBox = frameDoc.getElementById("gfbr-box");
  if (!markerBox) {
    markerBox = frameDoc.createElement("div");
    markerBox.id = "gfbr-box"; markerBox.className = "gfbr-box";
    frameDoc.body.appendChild(markerBox);
  }
  frameDoc.addEventListener("click", onFrameClick, true);
  frameDoc.addEventListener("mousemove", onFrameMove, true);
  frameDoc.addEventListener("keydown", function (e) { if (e.key === "Escape") setPinning(false); });
  if (window.ResizeObserver) {
    try {
      var ro = new ResizeObserver(function () { drawMarkers(); });
      ro.observe(frameDoc.body);
    } catch (e) {}
  }
  return true;
}

function docOrigin() {
  var r = markerBox.getBoundingClientRect();
  var w = $("#frame").contentWindow;
  return { x: r.left + w.scrollX, y: r.top + w.scrollY };
}

function pointOf(rec) {
  var el = null;
  try { if (rec.selector) el = frameDoc.querySelector(rec.selector); } catch (e) {}
  var w = $("#frame").contentWindow;
  if (el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + w.scrollX + r.width * (rec.relX || 0.5),
             y: r.top + w.scrollY + r.height * (rec.relY || 0.5), el: el };
  }
  return { x: rec.absX || 0, y: rec.absY || 0, el: null };
}

function drawMarkers() {
  if (!frameDoc || !markerBox) return;
  markerBox.innerHTML = "";
  var o = docOrigin();
  pinnedFor(current.id).forEach(function (rec, i) {
    var p = pointOf(rec);
    var pin = frameDoc.createElement("div");
    pin.className = "gfbr-pin" + (rec.status === "resolved" ? " done" : "");
    pin.style.left = (p.x - o.x) + "px";
    pin.style.top = (p.y - o.y) + "px";
    pin.title = rec.author + ": " + rec.text;
    pin.innerHTML = "<span>" + (i + 1) + "</span>";
    pin.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      tab = "page"; renderPanel(); highlightNote(rec.id);
    });
    markerBox.appendChild(pin);
  });
}

function scrollToNote(rec) {
  if (!frameDoc) return;
  if (!rec.selector) { toast("That one is about the whole page, not a spot on it"); return; }
  var p = pointOf(rec);
  var w = $("#frame").contentWindow;
  w.scrollTo({ top: Math.max(0, p.y - w.innerHeight / 2), behavior: "smooth" });
  var pins = markerBox.querySelectorAll(".gfbr-pin");
  var idx = pinnedFor(current.id).findIndex(function (r) { return r.id === rec.id; });
  if (pins[idx]) {
    pins[idx].classList.add("on");
    setTimeout(function () { pins[idx].classList.remove("on"); }, 2200);
  }
}

/* --------------------------------------------------------------- pinning  */
function setPinning(on) {
  pinning = on;
  $("#frame-wrap").classList.toggle("pinning", on);
  $("#btn-pin").classList.toggle("on", on);
  $("#btn-pin").innerHTML = on ? "&#9679; Click the page" : "&#9679; Point at something";
  if (frameDoc) {
    frameDoc.documentElement.classList.toggle("gfbr-pinning", on);
    var hl = frameDoc.getElementById("gfbr-hl");
    if (!on && hl) hl.remove();
  }
}

function onFrameMove(e) {
  if (!pinning || !frameDoc) return;
  var el = targetOf(e.target);
  if (!el || el.classList && el.classList.contains("gfbr-pin")) return;
  var hl = frameDoc.getElementById("gfbr-hl");
  if (!hl) {
    hl = frameDoc.createElement("div"); hl.id = "gfbr-hl"; hl.className = "gfbr-hl";
    markerBox.appendChild(hl);
  }
  var r = el.getBoundingClientRect(), w = $("#frame").contentWindow, o = docOrigin();
  hl.style.left = (r.left + w.scrollX - o.x) + "px";
  hl.style.top = (r.top + w.scrollY - o.y) + "px";
  hl.style.width = r.width + "px";
  hl.style.height = r.height + "px";
}

function onFrameClick(e) {
  if (!pinning) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    var url;
    try { url = new URL(a.href); } catch (err) { return; }
    if (url.origin !== location.origin) { e.preventDefault(); window.open(url.href, "_blank"); return; }
    var rel = relOf(url.pathname);
    e.preventDefault();
    if (BY_ID[rel]) { selectPage(rel); }
    else { window.open(url.href, "_blank"); toast("That one is not part of the review list, so it opened in a new tab"); }
    return;
  }
  if (e.target.classList && e.target.classList.contains("gfbr-pin")) return;
  e.preventDefault(); e.stopPropagation();
  var el = targetOf(e.target);
  var r = el.getBoundingClientRect(), w = $("#frame").contentWindow;
  var rec = {
    id: uid(), kind: "note", project: CFG.project, page: current.id,
    pageTitle: current.title, author: who, text: "",
    selector: cssPath(el), label: labelOf(el),
    relX: r.width ? (e.clientX - r.left) / r.width : 0.5,
    relY: r.height ? (e.clientY - r.top) / r.height : 0.5,
    absX: e.clientX + w.scrollX, absY: e.clientY + w.scrollY,
    status: "open", created: now(), updated: now()
  };
  setPinning(false);
  openComposer(rec);
}

function newPageNote() {
  openComposer({
    id: uid(), kind: "note", project: CFG.project, page: current.id,
    pageTitle: current.title, author: who, text: "",
    selector: "", label: "", status: "open", created: now(), updated: now()
  });
}

/* ------------------------------------------------------------- composer   */
var draft = null;
function openComposer(rec) {
  draft = rec;
  $("#panel").classList.remove("hide");
  tab = "page";
  renderPanel();
  var ta = $("#composer-text");
  if (ta) { ta.focus(); ta.scrollIntoView({ block: "center", behavior: "smooth" }); }
}

function commitDraft() {
  var ta = $("#composer-text");
  if (!ta) return;
  var txt = ta.value.trim();
  if (!txt) { toast("Type what needs changing first"); ta.focus(); return; }
  draft.text = txt;
  draft.created = now();
  var rec = draft;
  draft = null;
  put(rec);
  toast("Note saved" + (CFG.endpoint ? " and shared" : ""));
}

/* ---------------------------------------------------------------- render  */
function renderAll() { renderRail(); renderPanel(); renderProgress(); drawMarkers(); }

function renderProgress() {
  var done = PAGES.filter(function (p) { return pageState(p.id) !== "todo"; }).length;
  $("#prog-done").textContent = done;
  $("#prog-total").textContent = PAGES.length;
  $("#prog-fill").style.width = (PAGES.length ? (done / PAGES.length * 100) : 0) + "%";
  var open = allOpenAsks().length;
  var chip = $("#todo-chip");
  chip.style.display = open ? "" : "none";
  $("#todo-count").textContent = open;
}

function renderRail() {
  var box = $("#rail-list"), html = "", lastGroup = "";
  var shown = PAGES.filter(function (p) {
    var st = pageState(p.id);
    if (filter === "todo" && st !== "todo") return false;
    if (filter === "changes" && st !== "changes") return false;
    if (filter === "approved" && st !== "approved") return false;
    if (search && (p.title + " " + p.id).toLowerCase().indexOf(search) === -1) return false;
    return true;
  });
  var counts = {};
  shown.forEach(function (p) { counts[p.group] = (counts[p.group] || 0) + 1; });
  shown.forEach(function (p) {
    if (p.group !== lastGroup) {
      lastGroup = p.group;
      html += '<div class="grp">' + esc(p.group) + '<span class="g-count">' + counts[p.group] + "</span></div>";
    }
    var n = openNotesFor(p.id).length, a = openAsksFor(p.id).length;
    html += '<div class="pitem' + (current && current.id === p.id ? " on" : "") +
      '" data-id="' + esc(p.id) + '" data-st="' + pageState(p.id) + '">' +
      '<span class="st"></span><div class="nm">' + esc(p.title) +
      '<div class="url">/' + esc(p.id) + "</div></div>" +
      '<span class="badges">' +
      (a ? '<span class="badge ask" title="things we need from you">' + a + "</span>" : "") +
      (n ? '<span class="badge">' + n + "</span>" : "") + "</span></div>";
  });
  box.innerHTML = html || '<div class="empty">Nothing matches.</div>';
}

function noteHtml(rec, showPage, idx) {
  var mark = rec.selector ? (idx === undefined ? "•" : idx) : "□";
  return '<div class="note' + (rec.status === "resolved" ? " resolved" : "") +
    (rec.selector ? "" : " whole") + '" data-id="' + rec.id + '">' +
    (showPage ? '<div class="note-page" data-goto="' + esc(rec.page) + '">' + esc(rec.pageTitle || rec.page) + "</div>" : "") +
    '<div class="note-top"><span class="note-pin">' + mark + "</span>" +
    '<span class="note-who">' + esc(rec.author) + "</span>" +
    '<span class="note-when">' + when(rec.created) + "</span></div>" +
    (rec.label ? '<div class="note-el">' + esc(rec.label) + "</div>"
               : '<div class="note-el">about the page as a whole</div>') +
    '<div class="note-txt">' + esc(rec.text) + "</div>" +
    '<div class="note-acts">' +
      (rec.selector ? '<button data-act="find">Show me</button>' : "") +
      '<button data-act="toggle">' + (rec.status === "resolved" ? "Reopen" : "Mark done") + "</button>" +
      (rec.author === who ? '<button data-act="del">Delete</button>' : "") +
    "</div></div>";
}

function askHtml(rec) {
  var ans = answerFor(rec.id), done = askDone(rec.id);
  return '<div class="ask' + (done ? " done" : "") + '" data-ask="' + rec.id + '">' +
    '<div class="ask-top"><span class="ask-tick">' + (done ? "&#10003;" : "") + "</span>" +
    '<div class="ask-title">' + esc(rec.title) + "</div>" +
    (rec.who ? '<span class="ask-who">' + esc(rec.who) + "</span>" : "") + "</div>" +
    '<div class="ask-txt">' + esc(rec.text) + "</div>" +
    (done
      ? '<div class="ask-answer"><b>' + esc(ans.author) + "</b> " + when(ans.updated || ans.created) +
        (ans.text ? '<div class="ask-answer-txt">' + esc(ans.text) + "</div>" : "") +
        '<div class="note-acts"><button data-askact="reopen">Not done after all</button></div></div>'
      : '<textarea class="ask-input" placeholder="Answer here, or say where you have sent it">' +
        esc(ans ? ans.text : "") + "</textarea>" +
        '<div class="note-acts"><button class="ask-go" data-askact="done">Mark supplied</button>' +
        '<button data-askact="save">Save for now</button>' +
        (isTeam() ? '<button data-askact="del">Delete request</button>' : "") + "</div>") +
    "</div>";
}

function askBlock(pageId) {
  var a = asksFor(pageId);
  if (!a.length && !isTeam()) return "";
  var open = openAsksFor(pageId).length;
  return '<div class="asks">' +
    '<div class="asks-head">What we need from you' +
      (a.length
        ? (open ? '<span class="asks-count">' + open + "</span>"
                : '<span class="asks-count ok">all done</span>')
        : "") +
    "</div>" +
    (a.length ? a.map(askHtml).join("") : '<div class="asks-none">Nothing needed on this page.</div>') +
    (isTeam() ? '<button class="btn ghost full" id="btn-add-ask">+ Add a request for this page</button>' : "") +
    "</div>";
}

function saveAnswer(askId, done) {
  var box = document.querySelector('.ask[data-ask="' + askId + '"] .ask-input');
  var ask = records[askId];
  var txt = box ? box.value.trim() : "";
  if (done && !txt) {
    /* some requests are a decision or a file sent by email, so an empty
       answer is allowed, but say so rather than leaving it blank */
    txt = "Done. Sent to Mel outside the tool.";
  }
  put({
    id: "ans-" + askId, kind: "answer", project: CFG.project, askId: askId,
    page: ask.page, pageTitle: ask.pageTitle, author: who, text: txt,
    status: done ? "done" : "open", created: now(), updated: now()
  });
  toast(done ? "Marked supplied" : "Saved");
}

function renderPanel() {
  if (!current) return;
  $("#pn-title").textContent = current.title;
  $$(".pn-tab").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === tab); });
  var body = $("#pn-body"), foot = $("#pn-foot"), html = "";

  /* ---- everything on the site ---- */
  if (tab === "all") {
    var all = list().filter(function (r) { return r.kind === "note"; });
    var open = all.filter(function (r) { return r.status !== "resolved"; });
    html = open.length
      ? open.map(function (r) { return noteHtml(r, true); }).join("")
      : '<div class="empty"><div class="big">&#10003;</div>No open notes anywhere on the site.</div>';
    var done = all.filter(function (r) { return r.status === "resolved"; });
    if (done.length) {
      html += '<div class="listsep">Done ' + done.length + "</div>";
      html += done.map(function (r) { return noteHtml(r, true); }).join("");
    }
    body.innerHTML = html;
    foot.innerHTML = '<button class="btn full" id="btn-overview2">Open the full list</button>';
    return;
  }

  /* ---- every outstanding request, across the site ---- */
  if (tab === "todo") {
    var asks = list().filter(function (r) { return r.kind === "ask"; });
    var byPage = {};
    asks.forEach(function (r) { (byPage[r.page] = byPage[r.page] || []).push(r); });
    var pages = Object.keys(byPage).sort(function (a, b) {
      return PAGES.findIndex(function (p) { return p.id === a; }) -
             PAGES.findIndex(function (p) { return p.id === b; });
    });
    if (!pages.length) {
      html = '<div class="empty">No requests yet.</div>';
    } else {
      pages.forEach(function (pid) {
        var openN = byPage[pid].filter(function (r) { return !askDone(r.id); }).length;
        html += '<div class="todo-page" data-goto="' + esc(pid) + '">' +
          esc((BY_ID[pid] || {}).title || pid) +
          '<span class="todo-count' + (openN ? "" : " ok") + '">' + (openN ? openN + " to do" : "done") + "</span></div>";
        byPage[pid].forEach(function (r) {
          html += '<div class="todo-item' + (askDone(r.id) ? " done" : "") + '" data-goto="' + esc(pid) + '">' +
            '<span class="ask-tick">' + (askDone(r.id) ? "&#10003;" : "") + "</span>" + esc(r.title) + "</div>";
        });
      });
    }
    body.innerHTML = html;
    foot.innerHTML = '<button class="btn full" id="btn-overview2">Open the full list</button>';
    return;
  }

  /* ---- this page ---- */
  html += askBlock(current.id);

  if (draft) {
    html += '<div class="composer">' +
      '<div class="cm-el">' + (draft.label ? "Note on " + esc(draft.label) : "A note about this page") + "</div>" +
      '<textarea id="composer-text" placeholder="What needs changing here? Plain English is perfect."></textarea>' +
      '<div class="cm-acts"><button class="btn go" id="cm-save">Save note</button>' +
      '<button class="btn ghost" id="cm-cancel">Cancel</button></div></div>';
  }

  var mine = notesFor(current.id), n = 0;
  html += mine.length
    ? mine.map(function (r) { if (r.selector) n++; return noteHtml(r, false, r.selector ? n : undefined); }).join("")
    : (draft ? "" : '<div class="empty">No notes on this page yet.<br>Use <b>Point at something</b> for a specific bit, or <b>Add a note</b> for the page as a whole.</div>');
  body.innerHTML = html;

  var st = pageState(current.id), v = verdictFor(current.id), stuck = openAsksFor(current.id).length;
  foot.innerHTML =
    '<div class="verdict"><h4>' + (st === "approved" ? "Approved" : st === "changes" ? "Changes requested" : "How is this page?") + "</h4>" +
    "<p>" + (stuck
      ? "There " + (stuck === 1 ? "is 1 request" : "are " + stuck + " requests") + " on this page still open. You can still approve the page, we just need those to finish it."
      : v ? esc(v.author) + " marked it " + (v.verdict === "approved" ? "approved" : "for changes") + " " + when(v.created) + "."
          : "Approve it, or leave notes above and mark it for changes.") + "</p>" +
    '<div class="row"><button class="btn go" data-verdict="approved">Approve page</button>' +
    '<button class="btn" data-verdict="changes">Needs changes</button></div></div>';
}

/* ------------------------------------------------------------------ nav   */
function selectPage(id, push) {
  var p = BY_ID[id];
  if (!p) return;
  current = p; draft = null; setPinning(false);
  $("#sb-title").textContent = p.title;
  $("#sb-url").textContent = "/" + p.id;
  $("#btn-tab").href = p.path;
  $("#frame-load").classList.remove("gone");
  frameDoc = null; markerBox = null;
  $("#frame").src = p.path;
  if (push !== false) {
    try { history.replaceState(null, "", "#" + p.id); } catch (e) {}
  }
  $("#rail").classList.remove("open");
  renderAll();
}

function nextPage() {
  var i = PAGES.findIndex(function (p) { return p.id === current.id; });
  for (var k = 1; k <= PAGES.length; k++) {
    var p = PAGES[(i + k) % PAGES.length];
    if (pageState(p.id) === "todo") { selectPage(p.id); return; }
  }
  selectPage(PAGES[(i + 1) % PAGES.length].id);
  toast("That's every page. Nice work.");
}

/* -------------------------------------------------------------- overview  */
function renderOverview() {
  var all = list().filter(function (r) { return r.kind === "note"; });
  var open = all.filter(function (r) { return r.status !== "resolved"; });
  var approved = PAGES.filter(function (p) { return pageState(p.id) === "approved"; }).length;
  var changes = PAGES.filter(function (p) { return pageState(p.id) === "changes"; }).length;
  var todo = PAGES.length - approved - changes;

  var html = '<div class="sum-grid">' +
    '<div class="sum ok"><div class="n">' + approved + '</div><div class="l">Approved</div></div>' +
    '<div class="sum open"><div class="n">' + changes + '</div><div class="l">Changes</div></div>' +
    '<div class="sum left"><div class="n">' + todo + '</div><div class="l">Not reviewed</div></div>' +
    '<div class="sum"><div class="n">' + open.length + '</div><div class="l">Open notes</div></div>' +
    '<div class="sum ask"><div class="n">' + allOpenAsks().length + '</div><div class="l">We need from you</div></div>' +
    "</div>";

  var oa = allOpenAsks();
  if (oa.length) {
    html += "<h3>Still needed from Gold Foil Books</h3>";
    oa.forEach(function (r) {
      html += '<div class="ov-ask"><b>' + esc(r.title) + "</b>" +
        '<span class="ov-ask-page" data-goto="' + esc(r.page) + '">' +
        esc((BY_ID[r.page] || {}).title || r.page) + "</span>" +
        '<div class="ask-txt">' + esc(r.text) + "</div></div>";
    });
  }

  var groups = {};
  open.forEach(function (r) { (groups[r.page] = groups[r.page] || []).push(r); });
  var keys = Object.keys(groups);
  if (!keys.length) {
    html += '<div class="empty">No open notes. Everything raised has been dealt with.</div>';
  } else {
    keys.forEach(function (pid) {
      html += "<h3>" + esc((BY_ID[pid] || {}).title || pid) + "</h3>";
      html += groups[pid].map(function (r, i) { return noteHtml(r, false, i); }).join("");
    });
  }
  $("#sheet-body").innerHTML = html;
}

function asText() {
  var out = ["Gold Foil Books website review", "Exported " + new Date().toLocaleString("en-AU"), ""];
  var oa0 = allOpenAsks();
  if (oa0.length) {
    out.push("STILL NEEDED FROM GOLD FOIL BOOKS");
    oa0.forEach(function (r) {
      out.push("  - " + r.title + "  (" + ((BY_ID[r.page] || {}).title || r.page) + ")");
    });
    out.push("");
  }
  PAGES.forEach(function (p) {
    var ns = notesFor(p.id), st = pageState(p.id), as = asksFor(p.id);
    if (!ns.length && st === "todo" && !as.length) return;
    out.push(p.title + "  (/" + p.id + ")");
    out.push("  Status: " + (st === "approved" ? "Approved" : st === "changes" ? "Changes requested" : "Not reviewed"));
    ns.forEach(function (r) {
      out.push("  - [" + (r.status === "resolved" ? "done" : "open") + "] " + r.author + ": " + r.text);
      out.push("      on " + (r.label || "the page as a whole"));
    });
    as.forEach(function (r) {
      var ans = answerFor(r.id);
      out.push("  * REQUEST [" + (askDone(r.id) ? "supplied" : "open") + "] " + r.title);
      if (ans && ans.text) out.push("      " + ans.author + ": " + ans.text);
    });
    out.push("");
  });
  return out.join("\n");
}

function asCsv() {
  var rows = [["Page", "URL", "Page status", "Type", "Element or request", "Reviewer", "Note or answer", "Item status", "Date"]];
  PAGES.forEach(function (p) {
    notesFor(p.id).forEach(function (r) {
      rows.push([p.title, "/" + p.id, pageState(p.id), "Note", r.label || "whole page", r.author, r.text,
        r.status === "resolved" ? "done" : "open", new Date(r.created).toLocaleString("en-AU")]);
    });
    asksFor(p.id).forEach(function (r) {
      var ans = answerFor(r.id);
      rows.push([p.title, "/" + p.id, pageState(p.id), "Request", r.title,
        ans ? ans.author : "", ans ? ans.text : "",
        askDone(r.id) ? "supplied" : "open",
        ans ? new Date(ans.updated || ans.created).toLocaleString("en-AU") : ""]);
    });
  });
  return rows.map(function (r) {
    return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
  }).join("\r\n");
}

/* ------------------------------------------------------------------ wire  */
function wire() {
  $("#rail-list").addEventListener("click", function (e) {
    var it = e.target.closest(".pitem");
    if (it) selectPage(it.dataset.id);
  });
  $("#search").addEventListener("input", function (e) { search = e.target.value.toLowerCase().trim(); renderRail(); });
  $$(".rf").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".rf").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on"); filter = b.dataset.filter; renderRail();
    });
  });
  $("#rail-toggle").addEventListener("click", function () { $("#rail").classList.toggle("open"); });
  $("#btn-panel").addEventListener("click", function () { $("#panel").classList.toggle("hide"); });
  $("#btn-pin").addEventListener("click", function () { setPinning(!pinning); });
  $("#btn-note").addEventListener("click", function () { setPinning(false); newPageNote(); });
  $("#todo-chip").addEventListener("click", function () { tab = "todo"; $("#panel").classList.remove("hide"); renderPanel(); });
  $("#btn-next").addEventListener("click", nextPage);

  $$("#widths button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("#widths button").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      $("#frame-box").dataset.w = b.dataset.w;
      setTimeout(drawMarkers, 320);
    });
  });

  $$(".pn-tab").forEach(function (b) {
    b.addEventListener("click", function () { tab = b.dataset.tab; renderPanel(); });
  });

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.id === "cm-save") return commitDraft();
    if (t.id === "cm-cancel") { draft = null; renderPanel(); return; }
    if (t.id === "btn-overview2") { $("#modal").classList.add("on"); renderOverview(); return; }
    if (t.dataset && t.dataset.verdict) {
      put({ id: uid(), kind: "verdict", project: CFG.project, page: current.id,
            pageTitle: current.title, author: who, verdict: t.dataset.verdict,
            text: "", created: now(), updated: now() });
      toast(t.dataset.verdict === "approved" ? "Page approved" : "Marked for changes");
      if (t.dataset.verdict === "approved") setTimeout(nextPage, 450);
      return;
    }
    if (t.id === "btn-add-ask") return addAsk();
    var askAct = t.dataset && t.dataset.askact;
    if (askAct) {
      var askId = t.closest(".ask").dataset.ask;
      if (askAct === "done") saveAnswer(askId, true);
      if (askAct === "save") saveAnswer(askId, false);
      if (askAct === "reopen") {
        var a = records["ans-" + askId];
        if (a) { a.status = "open"; put(a); }
      }
      if (askAct === "del") {
        var ask = records[askId];
        if (ask) { ask.deleted = true; put(ask); toast("Request removed"); }
      }
      return;
    }
    var goto = (t.dataset && t.dataset.goto) || (t.closest("[data-goto]") && t.closest("[data-goto]").dataset.goto);
    if (goto) {
      $("#modal").classList.remove("on");
      selectPage(goto); tab = "page"; renderPanel(); return;
    }
    var act = t.dataset && t.dataset.act;
    if (act) {
      var wrap = t.closest(".note"), rec = records[wrap.dataset.id];
      if (!rec) return;
      if (act === "toggle") { rec.status = rec.status === "resolved" ? "open" : "resolved"; put(rec); }
      if (act === "del") { rec.deleted = true; put(rec); toast("Note deleted"); }
      if (act === "find") {
        $("#modal").classList.remove("on");
        if (rec.page !== current.id) {
          selectPage(rec.page);
          setTimeout(function () { scrollToNote(rec); }, 1400);
        } else { scrollToNote(rec); }
      }
    }
  });

  $("#btn-overview").addEventListener("click", function () { $("#modal").classList.add("on"); renderOverview(); });
  $("#modal-close").addEventListener("click", function () { $("#modal").classList.remove("on"); });
  $("#modal").addEventListener("click", function (e) { if (e.target.id === "modal") $("#modal").classList.remove("on"); });

  $("#btn-copy").addEventListener("click", function () {
    navigator.clipboard.writeText(asText()).then(function () { toast("Copied. Paste it into an email to Mel."); });
  });
  $("#btn-csv").addEventListener("click", function () {
    var blob = new Blob([asCsv()], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gold-foil-books-feedback.csv";
    a.click();
  });

  $("#who-change").addEventListener("click", function () { $("#gate").classList.remove("off"); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setPinning(false); $("#modal").classList.remove("on"); }
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && $("#composer-text")) commitDraft();
      return;
    }
    if (e.key === "c") setPinning(!pinning);
    if (e.key === "]") nextPage();
  });

  $("#frame").addEventListener("load", function () {
    $("#frame-load").classList.add("gone");
    if (prepFrame()) {
      /* the client may have clicked a link inside the frame */
      try {
        var path = relOf($("#frame").contentWindow.location.pathname);
        if (path && BY_ID[path] && (!current || path !== current.id)) {
          current = BY_ID[path];
          $("#sb-title").textContent = current.title;
          $("#sb-url").textContent = "/" + current.id;
          $("#btn-tab").href = current.path;
          draft = null;
        }
      } catch (e) {}
      renderAll();
    }
  });
}

function addAsk() {
  var title = prompt("What do you need from them? Keep it to one line.");
  if (!title) return;
  var text = prompt("Any detail? What exactly, and why it matters.") || "";
  put({
    id: uid(), kind: "ask", project: CFG.project, page: current.id,
    pageTitle: current.title, title: title.trim(), text: text.trim(),
    who: "Either", author: who, created: now(), updated: now()
  });
  toast("Request added to this page");
}

/* ------------------------------------------------------------------ gate  */
function showGate() {
  var box = $("#gate-who");
  box.innerHTML = (CFG.reviewers || []).map(function (n) {
    return '<button data-name="' + esc(n) + '">' + esc(n) + "</button>";
  }).join("");
  box.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) setWho(b.dataset.name);
  });
  $("#gate-go").addEventListener("click", function () {
    var v = $("#gate-name").value.trim();
    if (v) setWho(v); else toast("Pick a name or type one");
  });
  $("#gate-name").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("#gate-go").click();
  });
}

function setWho(name) {
  who = name;
  save(LS_WHO, name);
  $("#who-name").textContent = name;
  $("#gate").classList.add("off");
  renderAll();
}

/* ------------------------------------------------------------------ boot  */
/* asks.json is a starter list. A seeded request is written once and then
   lives in the shared store like anything else, so editing asks.json later
   changes nothing. Deleting a request in the tool sticks, because the
   deleted record is still in the map. */
function seedAsks() {
  fetch("asks.json?t=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var added = 0;
      (data.asks || []).forEach(function (a) {
        if (records[a.id]) return;
        var page = BY_ID[a.page];
        if (!page) return;
        records[a.id] = {
          id: a.id, kind: "ask", project: CFG.project, page: a.page,
          pageTitle: page.title, title: a.title, text: a.text,
          who: a.who || "Either", author: "Mel Cox",
          created: now(), updated: now()
        };
        enqueue(a.id);
        added++;
      });
      if (added) { save(LS_RECORDS, records); renderAll(); }
    })
    .catch(function () {});
}

/* The shared store can be switched on after people have already used the
   tool. When the endpoint changes, everything in this browser is queued
   again so nothing written earlier is stranded. Re-sending a record is
   harmless, the sheet keys on id. */
function backfill() {
  if (!CFG.endpoint) return;
  var seen = "";
  try { seen = localStorage.getItem(LS_ENDPOINT) || ""; } catch (e) {}
  if (seen === CFG.endpoint) return;
  var ids = Object.keys(records);
  ids.forEach(function (id) { if (queue.indexOf(id) === -1) queue.push(id); });
  save(LS_QUEUE, queue);
  try { localStorage.setItem(LS_ENDPOINT, CFG.endpoint); } catch (e) {}
  if (ids.length) { setSync("saving"); flush(); }
}

function boot() {
  records = load(LS_RECORDS, {});
  queue = load(LS_QUEUE, []);
  who = load(LS_WHO, "");

  fetch("pages.json?t=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      PAGES = data.pages;
      PAGES.forEach(function (p) { BY_ID[p.id] = p; });
      wire();
      showGate();
      if (who) { $("#who-name").textContent = who; $("#gate").classList.add("off"); }
      backfill();
      seedAsks();
      var start = location.hash.slice(1);
      selectPage(BY_ID[start] ? start : PAGES[0].id, false);
      setSync(CFG.endpoint ? "ok" : "local");
      if (CFG.endpoint) {
        pull();
        setInterval(pull, Math.max(10, CFG.pollSeconds || 25) * 1000);
        flush();
      }
    })
    .catch(function () {
      document.body.innerHTML =
        '<div style="color:#fff;font:15px Inter,sans-serif;padding:60px;text-align:center">' +
        "Could not load pages.json. This tool has to be opened over http, not as a file on your computer." +
        "</div>";
    });
}

boot();
})();
