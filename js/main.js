/* ==========================================================================
   GOLD FOIL BOOKS
   Vanilla JS only. No dependencies, no build step, no routing.
   Every behaviour degrades to a working page if this file fails to load.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ----------------------------------------------------------------------
     Header. Turns solid once the first full bleed scene is behind it.
     ---------------------------------------------------------------------- */
  function header() {
    var el = document.querySelector("[data-header]");
    if (!el) return;
    var trigger = document.querySelector("[data-header-trigger]");
    var offset = trigger ? trigger.offsetHeight - el.offsetHeight : 40;

    function update() {
      /* Pages with no full bleed hero have no trigger, so the header must be
         solid from the first paint. Without this the white wordmark and nav
         sit on cream until the page is scrolled 40px. */
      el.classList.toggle("is-solid", !trigger || window.scrollY > offset);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", function () {
      offset = trigger ? trigger.offsetHeight - el.offsetHeight : 40;
      update();
    }, { passive: true });
  }

  /* ----------------------------------------------------------------------
     Mobile navigation.
     ---------------------------------------------------------------------- */
  function nav() {
    var btn = document.querySelector("[data-burger]");
    var menu = document.querySelector("[data-nav]");
    if (!btn || !menu) return;

    function setOpen(open) {
      menu.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Close" : "Menu";
      document.documentElement.style.overflow = open ? "hidden" : "";
    }

    btn.addEventListener("click", function () {
      setOpen(btn.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ----------------------------------------------------------------------
     Reveal on scroll. Purely additive.
     ---------------------------------------------------------------------- */
  function reveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    items.forEach(function (n) { io.observe(n); });
  }

  /* ----------------------------------------------------------------------
     Compare. Drag, click or arrow keys move the divide between the original
     illustration and the finished book.
     ---------------------------------------------------------------------- */
  function compare() {
    document.querySelectorAll("[data-compare]").forEach(function (root) {
      var grip = root.querySelector("[data-compare-grip]");
      var dragging = false;

      function set(pct) {
        pct = Math.max(2, Math.min(98, pct));
        root.style.setProperty("--pos", pct + "%");
        if (grip) grip.setAttribute("aria-valuenow", Math.round(pct));
      }

      function fromEvent(e) {
        var rect = root.getBoundingClientRect();
        var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        set((x / rect.width) * 100);
      }

      root.addEventListener("pointerdown", function (e) {
        dragging = true;
        root.setPointerCapture(e.pointerId);
        fromEvent(e);
      });
      root.addEventListener("pointermove", function (e) {
        if (dragging) fromEvent(e);
      });
      ["pointerup", "pointercancel"].forEach(function (t) {
        root.addEventListener(t, function () { dragging = false; });
      });

      if (grip) {
        grip.addEventListener("keydown", function (e) {
          var now = parseFloat(root.style.getPropertyValue("--pos")) || 50;
          if (e.key === "ArrowLeft") { set(now - 4); e.preventDefault(); }
          if (e.key === "ArrowRight") { set(now + 4); e.preventDefault(); }
          if (e.key === "Home") { set(2); e.preventDefault(); }
          if (e.key === "End") { set(98); e.preventDefault(); }
        });
      }
      set(50);
    });
  }

  /* ----------------------------------------------------------------------
     Process video. Muted, inline, poster first, paused when out of view.
     Reduced motion keeps the poster and offers a manual play.
     ---------------------------------------------------------------------- */
  function video() {
    document.querySelectorAll("[data-video]").forEach(function (wrap) {
      var vid = wrap.querySelector("video");
      var toggle = wrap.querySelector("[data-video-toggle]");
      if (!vid) return;

      var wanted = !reduceMotion.matches;

      function play() {
        var p = vid.play();
        if (p && p.catch) p.catch(function () { /* autoplay refused, poster stays */ });
      }
      function label() {
        if (toggle) toggle.textContent = vid.paused ? "Play" : "Pause";
      }

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && wanted) { play(); }
            else { vid.pause(); }
            label();
          });
        }, { threshold: 0.35 }).observe(wrap);
      } else if (wanted) {
        play();
      }

      if (toggle) {
        toggle.addEventListener("click", function () {
          if (vid.paused) { wanted = true; play(); } else { wanted = false; vid.pause(); }
          label();
        });
        label();
      }
    });
  }

  /* ----------------------------------------------------------------------
     Product gallery. Thumbnails swap the main image.
     ---------------------------------------------------------------------- */
  function gallery() {
    document.querySelectorAll("[data-gallery]").forEach(function (root) {
      var main = root.querySelector("[data-gallery-main]");
      if (!main) return;
      root.querySelectorAll("[data-gallery-thumb]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var img = btn.querySelector("img");
          if (!img) return;
          main.src = img.src;
          main.alt = img.alt;
          root.querySelectorAll("[data-gallery-thumb]").forEach(function (b) {
            b.setAttribute("aria-current", String(b === btn));
          });
        });
      });
    });
  }

  /* ----------------------------------------------------------------------
     SQUARESPACE ADD TO CART
     The mockup only demonstrates presentation. On the live site this button
     is replaced by the native Squarespace product block, which owns
     inventory, variants, cart state and checkout.
     ---------------------------------------------------------------------- */
  function cartStub() {
    document.querySelectorAll("[data-add-to-cart]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var note = btn.parentNode.querySelector("[data-cart-note]");
        if (note) {
          note.hidden = false;
          note.textContent = "Prototype only. Squarespace commerce handles the cart on the live site.";
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
     Sticky buy bar. Rises once the main add to cart button leaves the screen.
     ---------------------------------------------------------------------- */
  function buybar() {
    var bar = document.querySelector("[data-buybar]");
    var anchor = document.querySelector("[data-buybar-anchor]");
    if (!bar || !anchor || !("IntersectionObserver" in window)) return;

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        bar.classList.toggle("is-up", !entry.isIntersecting && entry.boundingClientRect.top < 0);
      });
    }, { threshold: 0 }).observe(anchor);
  }

  /* ----------------------------------------------------------------------
     Artwork protection.
     The illustrations are sold as downloads, so the site should not hand them
     over on a right click. This blocks the context menu, dragging and the iOS
     save sheet on artwork only, and never on product photography or text.

     Be clear about the limits: this stops casual saving. It does not stop a
     screenshot, developer tools, or a direct request to the image URL. The
     real protection is that the served files are capped at 1400px on the long
     edge, which looks correct on screen and prints badly.
     ---------------------------------------------------------------------- */
  function protectArt() {
    var art = document.querySelectorAll("[data-protect]");
    if (!art.length) return;

    art.forEach(function (img) {
      img.setAttribute("draggable", "false");
      var host = img.closest("picture, figure, a, span, div") || img.parentNode;
      if (host && !host.classList.contains("gfb-guard")) host.classList.add("gfb-guard");
    });

    function inArtwork(target) {
      if (!target || !target.closest) return false;
      return !!target.closest(".gfb-guard");
    }

    document.addEventListener("contextmenu", function (e) {
      if (inArtwork(e.target)) e.preventDefault();
    });
    document.addEventListener("dragstart", function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-protect")) e.preventDefault();
    });
  }

  /* ----------------------------------------------------------------------
     Back to top. Appears once the first screen is behind you.
     ---------------------------------------------------------------------- */
  function totop() {
    var btn = document.querySelector("[data-totop]");
    if (!btn) return;

    function update() { btn.classList.toggle("is-up", window.scrollY > window.innerHeight * 0.9); }
    update();
    window.addEventListener("scroll", update, { passive: true });

    btn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? "auto" : "smooth"
      });
    });
  }

  /* ----------------------------------------------------------------------
     Year stamp.
     ---------------------------------------------------------------------- */
  function year() {
    document.querySelectorAll("[data-year]").forEach(function (n) {
      n.textContent = String(new Date().getFullYear());
    });
  }

  function init() {
    header(); nav(); reveal(); compare(); video(); gallery(); cartStub(); buybar(); protectArt(); totop(); year();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
