
(function () {
  "use strict";

  var odr = (window.odr = window.odr || {});

  odr.onError = function (code, message) {
    console.error("error " + code + " message " + message);
  };

  var errorIllegalEditNewLine = {
    code: 1,
    message: "new line not supported by this document",
  };

  var modified = {};

  odr.generateDiff = function () {
    var result = { modifiedText: {} };
    for (var path in modified) {
      if (Object.prototype.hasOwnProperty.call(modified, path)) {
        result.modifiedText[path] = modified[path].innerText;
      }
    }
    return JSON.stringify(result);
  };

  new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; ++i) {
      if (mutations[i].type !== "characterData") {
        continue;
      }
      // The nearest owner, not the direct parent: a search `<mark>` may sit
      // between the edited text and the element carrying the path.
      var parent = mutations[i].target.parentElement;
      var owner = parent && parent.closest("[data-odr-path]");
      if (owner) {
        modified[owner.getAttribute("data-odr-path")] = owner;
      }
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      odr.onError(errorIllegalEditNewLine.code, errorIllegalEditNewLine.message);
    }
  });
})();
