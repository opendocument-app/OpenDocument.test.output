
(function () {
  "use strict";

  var odr = (window.odr = window.odr || {});

  var root = document.documentElement;
  var body = document.body;

  var minZoom = 0.1;
  var maxZoom = 10;

  // Only a frame is fitted here: the viewport meta tag covers the top-level
  // document but is inert in a frame.
  var framed = window.top !== window.self;

  function declared(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  // `auto` where only we can measure the fit; a number where the css states it.
  var measures = declared("--odr-fit") === "auto";
  var fit = measures ? 1 : parseFloat(declared("--odr-fit")) || 1;

  // `null` while the view follows the fit.
  var pinned = parseFloat(declared("--odr-zoom"));
  if (!isFinite(pinned)) {
    pinned = null;
  }

  // The width the anchor below was taken at: a scroll arriving after the
  // viewport changed is the browser's doing, not the reader's.
  var width = 0;
  // Where the reader is, kept current: by the time a resize arrives the browser
  // has relaid out and moved the scroll.
  var held = null;
  // Our own scrolling, which must not be mistaken for the reader's.
  var restoring = false;
  // Identifies the settling run below, so a newer one - or the reader - ends it.
  var settling = 0;

  function applied() {
    return pinned !== null ? pinned : fit;
  }

  // The natural width of what the body holds, measured unscaled.
  function contentWidth() {
    var zoom = body.style.zoom;
    // `1`, not empty: a stylesheet may carry a zoom of its own to fall back to.
    body.style.zoom = "1";
    var natural = body.scrollWidth;
    body.style.zoom = zoom;
    return natural;
  }

  function measureFit() {
    var available = root.clientWidth;
    if (!available || !framed) {
      // Out of a frame the viewport meta tag has already fitted the document.
      return available ? 1 : fit;
    }
    var content = contentWidth();
    if (!content) {
      return fit;
    }
    // Only ever down: a page narrower than the viewport is shown at its size.
    return content > available ? available / content : 1;
  }

  // The element under @p point, and how far into it that point sits - a
  // fraction of the scroll height cannot stand in, the height scales too. Only
  // a given point pins x; the page column centres itself.
  function anchor(point) {
    var x = point ? point.x : Math.floor(root.clientWidth / 2);
    var y = point ? point.y : 1;
    var element = document.elementFromPoint(x, y);
    if (!element) {
      return null;
    }
    var box = element.getBoundingClientRect();
    return {
      element: element,
      x: point ? x : null,
      y: y,
      intoX: box.width ? (x - box.left) / box.width : 0,
      intoY: box.height ? (y - box.top) / box.height : 0,
    };
  }

  // `{x, y}`, or the `clientX`/`clientY` of a mouse or touch event.
  function point(value) {
    if (!value) {
      return null;
    }
    var x = value.x !== undefined ? value.x : value.clientX;
    var y = value.y !== undefined ? value.y : value.clientY;
    return isFinite(x) && isFinite(y) ? { x: x, y: y } : null;
  }

  function remember() {
    if (restoring) {
      return;
    }
    if (root.clientWidth !== width) {
      // The viewport changed without a resize event. What is on screen is the
      // browser's guess, not the reader's position, so fit from here instead.
      resized();
      return;
    }
    held = anchor();
  }

  function restore(target) {
    if (!target || !target.element.isConnected) {
      return;
    }
    var box = target.element.getBoundingClientRect();
    var deltaY = box.top + target.intoY * box.height - target.y;
    var deltaX =
      target.x === null ? 0 : box.left + target.intoX * box.width - target.x;
    if (deltaX || deltaY) {
      window.scrollBy(deltaX, deltaY);
    }
  }

  function notify() {
    if (typeof odr.onZoomChange === "function") {
      odr.onZoomChange(applied(), pinned === null);
    }
  }

  // The browser applies a scroll offset of its own a few frames later, so
  // @p target is re-asserted until it settles.
  function apply(target) {
    var zoom = applied();
    body.style.zoom = zoom;
    root.style.setProperty("--odr-zoom", zoom);

    restoring = true;
    restore(target);

    var token = ++settling;
    var frames = 30;
    (function again() {
      if (token !== settling || frames-- <= 0) {
        restoring = false;
        remember();
        return;
      }
      restore(target);
      requestAnimationFrame(again);
    })();

    notify();
  }

  function resized() {
    if (root.clientWidth === width) {
      // Nothing that changes the scale: a height-only change, or a pinch,
      // where restoring would fight the reader.
      return;
    }

    var target = held;
    width = root.clientWidth;

    if (pinned !== null || !measures) {
      // the scale does not follow the viewport
      remember();
      return;
    }

    fit = measureFit();
    apply(target);
  }

  function taken() {
    ++settling;
    restoring = false;
  }

  // `1` is actual size. Excludes the browser's own page and pinch zoom.
  odr.getZoom = function () {
    return applied();
  };

  odr.isZoomFitted = function () {
    return pinned === null;
  };

  // @p focus, a pinch's midpoint, is the point that stays put across the
  // change; the top of the viewport where none is given.
  odr.setZoom = function (value, focus) {
    var next = Number(value);
    if (!isFinite(next)) {
      return applied();
    }
    pinned = Math.min(maxZoom, Math.max(minZoom, next));
    // read now, unlike a resize, which arrives relaid out
    apply(anchor(point(focus)));
    return applied();
  };

  odr.adjustZoom = function (factor, focus) {
    return odr.setZoom(applied() * Number(factor), focus);
  };

  odr.resetZoom = function (focus) {
    pinned = null;
    var target = anchor(point(focus));
    if (measures) {
      fit = measureFit();
    }
    apply(target);
    return applied();
  };

  width = root.clientWidth;
  if (measures && pinned === null) {
    fit = measureFit();
    body.style.zoom = fit;
    root.style.setProperty("--odr-zoom", fit);
  }
  remember();

  window.addEventListener("scroll", remember, { passive: true });
  window.addEventListener("resize", resized);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resized);
  }
  // Anything the reader does ends the re-assertion above.
  window.addEventListener("wheel", taken, { passive: true });
  window.addEventListener("touchstart", taken, { passive: true });
  window.addEventListener("keydown", taken);
})();
