
(function () {
  "use strict";

  var table = document.querySelector(".odr-sheet");
  if (table === null) {
    return;
  }

  var merged = table.querySelector("td[colspan],td[rowspan]") !== null;

  var style = document.createElement("style");
  document.head.appendChild(style);

  var hovered = -1;
  var pinnedColumn = -1;
  var pinnedRow = null;
  var pinnedCell = null;

  // Column 0 is the gutter, which labels no column.
  function columnRule(index, wash, scope) {
    if (index < 1) {
      return "";
    }
    return (
      ".odr-sheet " +
      scope +
      "tr>:nth-child(" +
      (index + 1) +
      "){background-image:linear-gradient(" +
      wash +
      "," +
      wash +
      ")}"
    );
  }

  // The ruler reacts harder than the cells: it is the label being followed.
  function paint() {
    style.textContent =
      columnRule(hovered, "var(--odr-sheet-wash)", "") +
      columnRule(pinnedColumn, "var(--odr-sheet-wash-pinned)", "") +
      columnRule(hovered, "var(--odr-sheet-wash-ruler)", "thead ") +
      columnRule(pinnedColumn, "var(--odr-sheet-wash-ruler)", "thead ");
  }

  function columnOf(cell) {
    return cell !== null && !merged ? cell.cellIndex : -1;
  }

  var raisedCell = null;
  var raisedWrapper = null;
  var raisedContent = null;

  // The block the cell writes, or the cell where it writes none. `null` for
  // anything else — a shape, several blocks — which is not raised.
  function boxOf(cell) {
    if (cell.childElementCount === 0) {
      return cell;
    }
    var only = cell.firstElementChild;
    return cell.childElementCount === 1 && only.tagName === "X-P" ? only : null;
  }

  // Past the cell's edge by the spill `translate_sheet` measured, at the edge
  // where it clips, unbounded where it does neither.
  function visibleRight(cell) {
    var style = getComputedStyle(cell);
    var right = cell.getBoundingClientRect().right;
    var inset = /inset\(([^)]*)\)/.exec(style.clipPath || "");
    if (inset !== null) {
      var sides = inset[1].trim().split(/\s+/);
      return sides.length > 1 ? right - parseFloat(sides[1]) : right;
    }
    return style.overflow === "visible" ? Infinity : right;
  }

  // On the text, not the box: what is cut off is the string running past where
  // the cell still paints.
  function cutOff(cell, box) {
    var range = document.createRange();
    range.selectNodeContents(box);
    var ink = range.getBoundingClientRect();
    var rect = cell.getBoundingClientRect();
    return (
      ink.width > 0 &&
      (ink.right > visibleRight(cell) + 1 ||
        (getComputedStyle(cell).overflow !== "visible" &&
          ink.bottom > rect.bottom + 1))
    );
  }

  function lower() {
    if (raisedCell === null) {
      return;
    }
    raisedCell.classList.remove("odr-sheet-raised");
    if (raisedWrapper !== null) {
      while (raisedWrapper.firstChild) {
        raisedCell.insertBefore(raisedWrapper.firstChild, raisedWrapper);
      }
      raisedWrapper.remove();
      raisedWrapper = null;
    }
    raisedContent = null;
    raisedCell = null;
  }

  // Over its neighbours rather than pushing them aside.
  function raise(cell) {
    lower();
    if (cell === null || cell.tagName !== "TD") {
      return;
    }
    var box = boxOf(cell);
    if (box === null || !cutOff(cell, box)) {
      return;
    }
    if (box === cell) {
      raisedWrapper = document.createElement("span");
      raisedWrapper.className = "odr-sheet-raised-box";
      while (cell.firstChild) {
        raisedWrapper.appendChild(cell.firstChild);
      }
      cell.appendChild(raisedWrapper);
      box = raisedWrapper;
    }
    cell.classList.add("odr-sheet-raised");
    raisedCell = cell;
    raisedContent = box;
  }

  function pin(column, row, cell) {
    lower();
    if (pinnedRow !== null) {
      pinnedRow.classList.remove("odr-sheet-pinned");
    }
    if (pinnedCell !== null) {
      pinnedCell.classList.remove("odr-sheet-pinned-cell");
    }

    pinnedColumn = column;
    pinnedRow = row;
    pinnedCell = cell;

    if (pinnedRow !== null) {
      pinnedRow.classList.add("odr-sheet-pinned");
    }
    if (pinnedCell !== null) {
      pinnedCell.classList.add("odr-sheet-pinned-cell");
      raise(pinnedCell);
    }
    paint();
  }

  table.addEventListener("mouseover", function (event) {
    var column = columnOf(event.target.closest("td,th"));
    if (column !== hovered) {
      hovered = column;
      paint();
    }
  });

  table.addEventListener("mouseleave", function () {
    hovered = -1;
    paint();
  });

  table.addEventListener("click", function (event) {
    // Selecting inside what is raised must not put the cell back.
    if (raisedContent !== null && raisedContent.contains(event.target)) {
      return;
    }

    var cell = event.target.closest("td,th");
    if (cell === null) {
      return;
    }

    // Clicking what is pinned clears it.
    if (cell === pinnedCell) {
      pin(-1, null, null);
      return;
    }

    if (cell.classList.contains("odr-sheet-column-header")) {
      pin(columnOf(cell), null, cell);
    } else if (cell.classList.contains("odr-sheet-row-header")) {
      pin(-1, cell.parentElement, cell);
    } else if (cell.classList.contains("odr-sheet-corner")) {
      pin(-1, null, null);
    } else {
      pin(columnOf(cell), cell.parentElement, cell);
    }
  });

  // The canvas around the sheet included.
  document.addEventListener("click", function (event) {
    if (event.target.closest(".odr-sheet") === null) {
      pin(-1, null, null);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      pin(-1, null, null);
    }
  });

  var body = table.tBodies[0];
  var original = null;
  var sortedColumn = -1;
  var sortedDirection = 0;

  // Only the rendered text is in the markup, not the number behind it. The last
  // separator is the decimal one, which settles 1,234.56 against 1.234,56.
  function toNumber(text) {
    var cleaned = text.replace(/[^0-9,.eE+-]/g, "");
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
    var value = parseFloat(cleaned);
    return isFinite(value) ? value : NaN;
  }

  // Numbers, then text, then blanks: no column is forced into one kind.
  var NUMBER = 0;
  var TEXT = 1;
  var BLANK = 2;

  function keyOf(row, index) {
    var cell = row.children[index];
    var text = cell === undefined ? "" : cell.textContent.trim();
    if (text === "") {
      return { rank: BLANK, value: 0 };
    }
    if (cell.classList.contains("odr-value-type-float")) {
      var value = toNumber(text);
      if (!isNaN(value)) {
        return { rank: NUMBER, value: value };
      }
    }
    return { rank: TEXT, value: text };
  }

  function reorder(rows) {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < rows.length; ++i) {
      fragment.appendChild(rows[i]);
    }
    body.appendChild(fragment);
  }

  function sortBy(index, direction) {
    if (original === null) {
      original = Array.prototype.slice.call(body.rows);
    }
    if (direction === 0) {
      reorder(original);
      return;
    }

    var rows = Array.prototype.slice.call(body.rows);
    var keys = new Map();
    for (var i = 0; i < rows.length; ++i) {
      keys.set(rows[i], keyOf(rows[i], index));
    }

    // A blank is an absent value, not the smallest one, so it stays last either
    // way round. The stable sort keeps the document's order for ties.
    rows.sort(function (a, b) {
      var x = keys.get(a);
      var y = keys.get(b);
      if (x.rank === BLANK || y.rank === BLANK) {
        return x.rank === y.rank ? 0 : x.rank === BLANK ? 1 : -1;
      }
      if (x.rank !== y.rank) {
        return (x.rank - y.rank) * direction;
      }
      var result =
        x.rank === NUMBER
          ? x.value - y.value
          : x.value.localeCompare(y.value, undefined, { numeric: true });
      return result * direction;
    });
    reorder(rows);
  }

  // A `rowspan` would reach into a row no longer beneath it and a `colspan`
  // breaks the column index, so a merged sheet gets no sort control.
  if (!merged) {
    var headers = table.tHead.rows[0].children;
    for (var column = 1; column < headers.length; ++column) {
      var control = document.createElement("span");
      control.className = "odr-sheet-sort";
      control.setAttribute("title", "sort by column " + headers[column].textContent);
      headers[column].appendChild(control);
    }

    table.addEventListener(
      "click",
      function (event) {
        var control = event.target.closest(".odr-sheet-sort");
        if (control === null) {
          return;
        }
        // The header itself pins the column; only this control sorts it.
        event.stopPropagation();

        var index = control.parentElement.cellIndex;
        var direction =
          index !== sortedColumn ? 1 : sortedDirection === 1 ? -1 : 0;

        sortBy(index, direction);

        control.classList.remove("odr-sheet-sort-asc", "odr-sheet-sort-desc");
        if (direction === 1) {
          control.classList.add("odr-sheet-sort-asc");
        } else if (direction === -1) {
          control.classList.add("odr-sheet-sort-desc");
        }
        if (sortedColumn !== index && sortedColumn >= 0) {
          headers[sortedColumn]
            .querySelector(".odr-sheet-sort")
            .classList.remove("odr-sheet-sort-asc", "odr-sheet-sort-desc");
        }

        sortedColumn = direction === 0 ? -1 : index;
        sortedDirection = direction;
      },
      true
    );
  }
})();
