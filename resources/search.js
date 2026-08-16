
(function () {
  "use strict";

  var odr = (window.odr = window.odr || {});

  var marks = [];
  var current = -1;
  var keyword = "";

  // Case- and diacritic-folded `text` plus a folded-index to source-index map
  // (with an end sentinel), so a match maps back onto the source string.
  // Folding per character is what keeps that map right when a character folds
  // to none or to several.
  function fold(text) {
    var folded = "";
    var map = [];
    for (var i = 0; i < text.length; ++i) {
      var character = text[i]
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      for (var j = 0; j < character.length; ++j) {
        map.push(i);
      }
      folded += character;
    }
    map.push(text.length);
    return { text: folded, map: map };
  }

  // Rejected by the subtree, `aria-hidden` included: that is what keeps a pdf's
  // glyph layer out of a search of the same page's text layer.
  function textNodes() {
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          if (node.nodeType !== Node.TEXT_NODE) {
            var name = node.nodeName;
            return name === "SCRIPT" ||
              name === "STYLE" ||
              name === "MARK" ||
              node.getAttribute("aria-hidden") === "true"
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_SKIP;
          }
          return node.nodeValue.length > 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      }
    );
    var nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  function markNode(node, needle) {
    var found = [];
    while (true) {
      var folded = fold(node.nodeValue);
      var at = folded.text.indexOf(needle);
      if (at === -1) {
        return found;
      }
      var match = node.splitText(folded.map[at]);
      node = match.splitText(folded.map[at + needle.length] - folded.map[at]);
      var mark = document.createElement("mark");
      mark.className = "highlight";
      match.parentNode.replaceChild(mark, match);
      mark.appendChild(match);
      found.push(mark);
    }
  }

  function select(index) {
    if (current >= 0 && marks[current]) {
      marks[current].classList.remove("current");
    }
    current = index;
    marks[current].classList.add("current");
    // A hit inside a folded section is scrolled to but not shown.
    for (
      var element = marks[current].parentElement;
      element !== null;
      element = element.parentElement
    ) {
      if (element.nodeName === "DETAILS") {
        element.open = true;
      }
    }
    marks[current].scrollIntoView({ block: "center", inline: "center" });
  }

  function step(delta, next) {
    if (next !== undefined && next !== null && fold(String(next)).text !== keyword) {
      return odr.search(next);
    }
    if (marks.length === 0) {
      return 0;
    }
    select((current + delta + marks.length) % marks.length);
    return marks.length;
  }

  odr.resetSearch = function () {
    for (var i = 0; i < marks.length; ++i) {
      var parent = marks[i].parentNode;
      if (!parent) {
        continue;
      }
      while (marks[i].firstChild) {
        parent.insertBefore(marks[i].firstChild, marks[i]);
      }
      parent.removeChild(marks[i]);
      parent.normalize();
    }
    marks = [];
    current = -1;
    keyword = "";
  };

  // Highlights every occurrence, selects the first and returns the count.
  odr.search = function (text) {
    odr.resetSearch();
    keyword = fold(text === undefined || text === null ? "" : String(text)).text;
    if (keyword === "") {
      return 0;
    }
    var nodes = textNodes();
    for (var i = 0; i < nodes.length; ++i) {
      marks = marks.concat(markNode(nodes[i], keyword));
    }
    if (marks.length > 0) {
      select(0);
    }
    return marks.length;
  };

  // An argument is searched for first unless it is already the highlighted
  // keyword, so a host can drive search and step from the same string.
  odr.searchNext = function (text) {
    return step(1, text);
  };

  odr.searchPrevious = function (text) {
    return step(-1, text);
  };
})();
