
(function () {
  "use strict";

  var odr = (window.odr = window.odr || {});
  var SVG = "http://www.w3.org/2000/svg";

  var tool = null;
  var color = [1, 0.9, 0.2];
  var width = 2;
  var pending = [];
  var nextId = 1;

  function pages() {
    return Array.prototype.slice.call(
      document.querySelectorAll("[data-odr-space]")
    );
  }

  function pageOf(index) {
    var all = pages();
    for (var i = 0; i < all.length; ++i) {
      if (+all[i].getAttribute("data-odr-page") === index) {
        return all[i];
      }
    }
    return null;
  }

  /// A viewport point to page-box points (y-down, the unit the overlay draws
  /// in). The page box is laid out in inches, so its own layout width in css
  /// pixels gives the scale a zoom transform is applied on top of.
  function toBox(page, clientX, clientY) {
    var rect = page.getBoundingClientRect();
    var zoom = page.offsetWidth ? rect.width / page.offsetWidth : 1;
    return [
      ((clientX - rect.left) / zoom) * 0.75,
      ((clientY - rect.top) / zoom) * 0.75,
    ];
  }

  /// Page-box points to pdf user space, through the page's own inverse.
  function toUserSpace(page, x, y) {
    var m = page.getAttribute("data-odr-space").split(",").map(Number);
    return [
      m[0] * x + m[2] * y + m[4],
      m[1] * x + m[3] * y + m[5],
    ];
  }

  /// Two overlays per page: `multiply` for the washes that have to let the
  /// text through, and a normal one for the marks drawn on top of it.
  function overlay(page, multiply) {
    var name = multiply ? "an an-m" : "an";
    var svg = page.querySelector(
      ':scope > svg[class="' + name + '"]'
    );
    if (!svg) {
      svg = document.createElementNS(SVG, "svg");
      svg.setAttribute("class", name);
      svg.setAttribute("preserveAspectRatio", "none");
      page.appendChild(svg);
    }
    svg.setAttribute(
      "viewBox",
      "0 0 " + page.offsetWidth * 0.75 + " " + page.offsetHeight * 0.75
    );
    return svg;
  }

  function css(c) {
    return (
      "rgb(" +
      c
        .map(function (v) {
          return Math.round(Math.max(0, Math.min(1, v)) * 255);
        })
        .join(",") +
      ")"
    );
  }

  function draw(annotation) {
    var page = pageOf(annotation.page);
    if (!page) {
      return;
    }
    var svg = overlay(page, annotation.type === "highlight");
    var node;
    if (annotation.type === "ink") {
      node = document.createElementNS(SVG, "path");
      node.setAttribute(
        "d",
        annotation.strokes
          .map(function (s) {
            var d = "M " + s[0] + " " + s[1];
            for (var i = 2; i < s.length; i += 2) {
              d += " L " + s[i] + " " + s[i + 1];
            }
            return d;
          })
          .join(" ")
      );
      node.setAttribute("fill", "none");
      node.setAttribute("stroke", css(annotation.color));
      node.setAttribute("stroke-width", annotation.width);
      node.setAttribute("stroke-linecap", "round");
      node.setAttribute("stroke-linejoin", "round");
    } else {
      node = document.createElementNS(SVG, "path");
      node.setAttribute("d", annotation.boxes.map(barPath(annotation.type)).join(" "));
      if (annotation.type === "squiggly") {
        node.setAttribute("fill", "none");
        node.setAttribute("stroke", css(annotation.color));
        node.setAttribute("stroke-width", 1);
      } else {
        node.setAttribute("fill", css(annotation.color));
      }
    }
    node.setAttribute("data-odr-annotation", annotation.id);
    svg.appendChild(node);
  }

  /// The shape one covered box gets, in page-box points.
  function barPath(type) {
    return function (b) {
      var h = b[3] - b[1];
      if (type === "highlight") {
        return rect(b[0], b[1], b[2] - b[0], h);
      }
      if (type === "underline") {
        return rect(b[0], b[3] - h / 16, b[2] - b[0], Math.max(h / 16, 0.5));
      }
      if (type === "strikeOut") {
        return rect(b[0], b[1] + h / 2, b[2] - b[0], Math.max(h / 16, 0.5));
      }
      var step = Math.max(h / 8, 1);
      var d = "M " + b[0] + " " + (b[3] - step);
      var up = true;
      for (var x = b[0] + step; x < b[2]; x += step, up = !up) {
        d += " L " + x + " " + (up ? b[3] - step * 2 : b[3] - step);
      }
      return d;
    };
  }

  function rect(x, y, w, h) {
    return "M " + x + " " + y + " h " + w + " v " + h + " h " + -w + " Z";
  }

  function redraw() {
    pages().forEach(function (page) {
      page.querySelectorAll(":scope > svg.an").forEach(function (svg) {
        svg.textContent = "";
      });
    });
    pending.forEach(draw);
  }

  /// The boxes a selection covers, per page, in page-box points. Zero-width
  /// rects are the selection layer's spacer spans and carry no text.
  function selectionBoxes() {
    var selection = window.getSelection();
    var byPage = {};
    if (!selection || selection.isCollapsed) {
      return byPage;
    }
    for (var r = 0; r < selection.rangeCount; ++r) {
      var rects = selection.getRangeAt(r).getClientRects();
      for (var i = 0; i < rects.length; ++i) {
        var rect = rects[i];
        if (rect.width < 0.5 || rect.height < 0.5) {
          continue;
        }
        var page = pageAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (!page) {
          continue;
        }
        var index = +page.getAttribute("data-odr-page");
        var a = toBox(page, rect.left, rect.top);
        var b = toBox(page, rect.right, rect.bottom);
        (byPage[index] = byPage[index] || []).push([a[0], a[1], b[0], b[1]]);
      }
    }
    return byPage;
  }

  function pageAt(x, y) {
    var all = pages();
    for (var i = 0; i < all.length; ++i) {
      var rect = all[i].getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return all[i];
      }
    }
    return null;
  }

  function markSelection() {
    var byPage = selectionBoxes();
    var added = false;
    Object.keys(byPage).forEach(function (index) {
      pending.push({
        id: nextId++,
        page: +index,
        type: tool,
        boxes: byPage[index],
        color: color.slice(),
      });
      added = true;
    });
    if (added) {
      window.getSelection().removeAllRanges();
      redraw();
    }
    return added;
  }

  var stroke = null;
  var pointerDown = false;
  var settle = null;

  /// A drag fires `selectionchange` on every character it covers, so the mark
  /// waits for the gesture that makes it to end rather than taking the first
  /// character and tearing the selection out from under the pointer.
  function scheduleMark() {
    if (!tool || tool === "ink" || pointerDown) {
      return;
    }
    window.clearTimeout(settle);
    settle = window.setTimeout(markSelection, 50);
  }

  function onPointerDown(event) {
    pointerDown = true;
    // a new gesture supersedes a mark the previous one had queued
    window.clearTimeout(settle);
    if (tool !== "ink" || event.button !== 0) {
      return;
    }
    var page = pageAt(event.clientX, event.clientY);
    if (!page) {
      return;
    }
    event.preventDefault();
    var p = toBox(page, event.clientX, event.clientY);
    stroke = {
      id: nextId++,
      page: +page.getAttribute("data-odr-page"),
      type: "ink",
      strokes: [[p[0], p[1]]],
      color: color.slice(),
      width: width,
    };
    pending.push(stroke);
    page.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!stroke) {
      return;
    }
    var page = pageOf(stroke.page);
    var p = toBox(page, event.clientX, event.clientY);
    var points = stroke.strokes[0];
    // drop the sub-point jitter a pointer emits while nearly still
    if (
      Math.abs(p[0] - points[points.length - 2]) +
        Math.abs(p[1] - points[points.length - 1]) <
      0.5
    ) {
      return;
    }
    points.push(p[0], p[1]);
    redraw();
  }

  function onPointerUp() {
    pointerDown = false;
    scheduleMark();
    if (!stroke) {
      return;
    }
    if (stroke.strokes[0].length < 4) {
      // a tap with no drag leaves a dot, which is a legitimate mark
      stroke.strokes[0].push(stroke.strokes[0][0], stroke.strokes[0][1]);
    }
    stroke = null;
    redraw();
  }

  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("selectionchange", scheduleMark);
  window.addEventListener("resize", redraw);

  odr.annotation = {
    /// null, "highlight", "underline", "strikeOut", "squiggly" or "ink".
    setTool: function (value) {
      tool = value || null;
      pages().forEach(function (page) {
        page.classList.toggle("an-draw", tool === "ink");
      });
    },
    getTool: function () {
      return tool;
    },
    /// DeviceRGB, each component in [0, 1].
    setColor: function (value) {
      color = value.slice(0, 3).map(Number);
    },
    setWidth: function (value) {
      width = Number(value);
    },
    /// What is pending, newest last. Geometry is in page-box points.
    list: function () {
      return pending.slice();
    },
    remove: function (id) {
      pending = pending.filter(function (a) {
        return a.id !== id;
      });
      redraw();
    },
    undo: function () {
      pending.pop();
      redraw();
    },
    clear: function () {
      pending = [];
      redraw();
    },
    /// The payload `PdfFile::annotate` takes, in pdf user space.
    getAnnotations: function () {
      return JSON.stringify({
        version: 1,
        annotations: pending.map(function (a) {
          var page = pageOf(a.page);
          if (a.type === "ink") {
            return {
              page: a.page,
              type: "ink",
              strokes: a.strokes.map(function (s) {
                var out = [];
                for (var i = 0; i < s.length; i += 2) {
                  var p = toUserSpace(page, s[i], s[i + 1]);
                  out.push(p[0], p[1]);
                }
                return out;
              }),
              width: a.width,
              color: a.color,
            };
          }
          return {
            page: a.page,
            type: a.type,
            quads: a.boxes.map(function (b) {
              // upper-left, upper-right, lower-left, lower-right
              var ul = toUserSpace(page, b[0], b[1]);
              var ur = toUserSpace(page, b[2], b[1]);
              var ll = toUserSpace(page, b[0], b[3]);
              var lr = toUserSpace(page, b[2], b[3]);
              return [ul[0], ul[1], ur[0], ur[1], ll[0], ll[1], lr[0], lr[1]];
            }),
            color: a.color,
          };
        }),
      });
    },
  };
})();
