
(function () {
  "use strict";

  var table = document.querySelector(".odr-sheet");
  if (table === null) {
    return;
  }

  var odr = (window.odr = window.odr || {});

  var sheet = Number(table.getAttribute("data-odr-sheet") || 0);
  var editable = table.getAttribute("data-odr-editable") === "true";
  var editing = false;
  var lastRefusal = null;

  // One space with `odr.onError`'s codes, appended and never renumbered - 1 is
  // `errorIllegalEditNewLine`. The host maps the code to its own wording; the
  // message is for a developer who wires nothing.
  var refusals = {
    formula: { code: 2, message: "cell holds a formula" },
    rich: { code: 3, message: "cell holds more than one plain run" },
    shapes: { code: 4, message: "cell holds a drawing" },
    readOnly: { code: 5, message: "document cannot be edited" },
  };

  odr.onEditRefused = function (event) {
    console.warn("edit refused " + event.code + ": " + event.message);
  };
  odr.onEditModeChange = function (event) {
    console.log("editing " + (event.editing ? "on" : "off"));
  };
  odr.onEditChange = function () {};

  function fire(name, event) {
    if (typeof odr[name] === "function") {
      odr[name](event);
    }
  }

  /// Four taps on a locked cell are one snackbar: the same refusal within two
  /// seconds of the last is the page's to drop.
  function refuse(reason, column, row) {
    var refusal = refusals[reason] || refusals.readOnly;
    var key = reason + ":" + column + ":" + row;
    var now = Date.now();
    if (lastRefusal && lastRefusal.key === key && now - lastRefusal.at < 2000) {
      return;
    }
    lastRefusal = { key: key, at: now };
    fire("onEditRefused", {
      sheet: sheet,
      column: column,
      row: row,
      reason: reason,
      code: refusal.code,
      message: refusal.message,
    });
  }

  function modeChange(reason) {
    fire("onEditModeChange", {
      editing: editing,
      editable: editable,
      reason: reason || null,
      code: reason ? refusals[reason].code : 0,
      message: reason ? refusals[reason].message : "",
    });
  }

  odr.editing = {
    /// Answers whether the mode is on. A document that cannot be edited
    /// refuses and says why, so a host can grey its button before a click.
    enable: function () {
      if (!editable) {
        modeChange("readOnly");
        return false;
      }
      if (!editing) {
        editing = true;
        table.classList.add("odr-editing");
        modeChange(null);
      }
      return true;
    },
    disable: function () {
      if (editing) {
        editing = false;
        table.classList.remove("odr-editing");
        modeChange(null);
      }
    },
    isEnabled: function () {
      return editing;
    },
    /// Whether `enable` would succeed.
    isEditable: function () {
      return editable;
    },
    /// The lock on the cell at (@p column, @p row), or null where it has none.
    lockAt: function (column, row) {
      var cell = odr.sheet.cellAt(column, row);
      return cell === null ? null : cell.getAttribute("data-odr-lock");
    },
  };

  odr.editing.refuseAt = function (column, row) {
    if (!editable) {
      refuse("readOnly", column, row);
      return true;
    }
    var lock = odr.editing.lockAt(column, row);
    if (lock !== null) {
      refuse(lock, column, row);
      return true;
    }
    return false;
  };
})();
