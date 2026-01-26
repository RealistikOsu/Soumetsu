/*!
 * ripple.js
 * Copyright (C) 2016-2018 Morgan Bazalgette and Giuseppe Guerra
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// Page-specific snippets for routes that need small JS handlers
const singlePageSnippets = {
  "/settings" : function() {
    // Custom badge icon preview
    $("input[name='custom_badge.icon']")
      .on("input", function() {
        $("#badge-icon")
          .attr("class", "fas fa-" + escapeHTML($(this).val()) + " text-4xl text-primary mb-2");
      });
    // Custom badge name preview
    $("input[name='custom_badge.name']")
      .on("input", function() {
        $("#badge-name").html(escapeHTML($(this).val()));
      });
    // Toggle custom badge fields
    $("input[name='custom_badge.show']")
      .change(function() {
        if ($(this).is(":checked"))
          {$("#custom-badge-fields").slideDown();}
        else
          {$("#custom-badge-fields").slideUp();}
      });

    // Form submission to API
    $("form")
      .submit(function(e) {
        e.preventDefault();

        const obj = formToObject($(this));
        let ps = 0;
        $(this)
          .find("input[data-sv]")
          .each(function(_, el) {
            el = $(el);
            if (el.is(":checked")) {
              ps |= el.data("sv");
            }
          });
        obj.play_style = ps;
        const f = $(this);
        fetch(soumetsuConf.baseAPI + "/api/v2/users/me/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(obj),
        })
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
          showMessage("success", "Your new settings have been saved.");
          f.removeClass("loading");
        })
        .catch(function() {
          showMessage("error", "An error occurred while saving settings.");
          f.removeClass("loading");
        });
        return false;
      });
  }
};

$(document)
  .ready(function() {
    // message close handlers
    $('.message .close').on('click', closeClosestMessage);

    // emojis!
    if (typeof twemoji !== "undefined") {
      $(".twemoji").each(function(k, v) { twemoji.parse(v); });
    }

    // RealistikOsu! stuff
    const f = singlePageSnippets[window.location.pathname];
    if (typeof f === 'function')
      {f();}
    if (typeof deferredToPageLoad === "function")
      {deferredToPageLoad();}

    $(document)
      .keydown(function(e) {
        const activeElement = $(document.activeElement);
        const isInput = activeElement.is(":input,[contenteditable]");
        if ((e.which === 83 || e.which === 115) && !isInput) {
          $("#user-search-input").focus();
          e.preventDefault();
        }
        if (e.which === 27 && isInput) {
          activeElement.blur();
        }
      });

    // setup timeago
    $.timeago.settings.allowFuture = true;
    $("time.timeago").timeago();

    $("#language-selector .item")
      .click(function() {
        const lang = $(this).data("lang");
        document.cookie = "language=" + lang + ";path=/;max-age=31536000";
        window.location.reload();
      });

    // Color navbar avatar (if we're logged in) based on our bancho status
    if (isLoggedIn() && soumetsuConf.banchoAPI) {
      fetch(soumetsuConf.banchoAPI + '/api/status/' + currentUserID)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var onlineClass = data.status === 200 ? "online" : "offline";
          $("#avatar").addClass(onlineClass);
        })
        .catch(function() {
          $("#avatar").addClass("offline");
        });
    }
  });

function closeClosestMessage() {
  $(this).closest('.alert-message').fadeOut(300, function() { $(this).remove(); });
};

function showMessage(type, message) {
  // Please dont steal this... Or at least credit us.

  let icon = "";
  let header = "";
  let bgColor = "";
  let borderColor = "";
  let headerColor = "";
  let iconColor = "";

  switch (type) {
    case "error":
      header = "Uh oh... There has been an error!";
      icon = "fas fa-fire";
      bgColor = "bg-red-900/30";
      borderColor = "border-red-700";
      headerColor = "text-red-300";
      iconColor = "text-red-400";
      break;

    case "positive":
    case "success":
      header = "Action completed successfully!";
      icon = "fas fa-check-circle";
      bgColor = "bg-green-900/30";
      borderColor = "border-green-700";
      headerColor = "text-green-300";
      iconColor = "text-green-400";
      break;

    case "warning":
      header = "Warning!";
      icon = "fas fa-exclamation-triangle";
      bgColor = "bg-orange-900/30";
      borderColor = "border-orange-700";
      headerColor = "text-orange-300";
      iconColor = "text-orange-400";
      break;

    default:
      header = "Notice";
      icon = "fas fa-info-circle";
      bgColor = "bg-blue-900/30";
      borderColor = "border-blue-700";
      headerColor = "text-blue-300";
      iconColor = "text-blue-400";
      break;
  }

  const newEl = $(`
    <div class="alert-message ${bgColor} border ${borderColor} rounded-lg p-4 mb-4 flex items-start gap-3" style="display: none;">
      <i class="${icon} ${iconColor} mt-1"></i>
      <div class="flex-grow">
        <div class="font-semibold ${headerColor} mb-1">${header}</div>
        <p class="text-sm text-gray-300">${message}</p>
      </div>
      <button class="close-btn text-gray-400 hover:text-white transition-colors">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `);
  newEl.find(".close-btn").click(closeClosestMessage);
  $("#messages-container").append(newEl);
  newEl.slideDown(300);
};

// function for all api calls
function _api(base, endpoint, data, success, failure, post, handleAllFailures) {
  if (typeof data === "function") {
    success = data;
    data = null;
  }
  if (typeof failure === "boolean") {
    post = failure;
    failure = undefined;
  }
  handleAllFailures = (typeof handleAllFailures !== undefined) ? handleAllFailures : false;

  const errorMessage =
      "An error occurred while contacting the RealistikOsu! API. Please report this to a RealistikOsu! developer.";

  $.ajax({
    method : (post ? "POST" : "GET"),
    dataType : "json",
    url : base + endpoint,
    data : (post ? JSON.stringify(data) : data),
    contentType : (post ? "application/json; charset=utf-8" : ""),
    success : function(data) {
      if (data.code != 200) {
        if (typeof failure === "function" &&
          (handleAllFailures || (data.code >= 400 && data.code < 500))
        ) {
          failure(data);
          return;
        }
        console.warn(data);
        showMessage("error", errorMessage);
      }
      success(data);
    },
    error : function(jqXHR, textStatus, errorThrown) {
      if (typeof failure === "function" &&
        (handleAllFailures || (jqXHR.status >= 400 && jqXHR.status < 500))
      ) {
        failure(jqXHR.responseJSON);
        return;
      }
      console.warn(jqXHR, textStatus, errorThrown);
      showMessage("error", errorMessage);
    },
  });
};

function api(endpoint, data, success, failure, post, handleAllFailures) {
  return _api(soumetsuConf.baseAPI + "/api/v2/", endpoint, data, success, failure, post, handleAllFailures);
}


const modes = {
  0 : "osu! standard",
  1 : "Taiko",
  2 : "Catch",
  3 : "osu!mania",
};
const modesShort = {
  0 : "std",
  1 : "taiko",
  2 : "ctb",
  3 : "mania",
};

const entityMap = {
  "&" : "&amp;",
  "<" : "&lt;",
  ">" : "&gt;",
  '"' : '&quot;',
  "'" : '&#39;',
  "/" : '&#x2F;',
};
function escapeHTML(str) {
  return String(str).replace(/[&<>"'\/]/g,
    function(s) { return entityMap[s]; });
}

window.URL = window.URL || window.webkitURL;

// thank mr stackoverflow
function addCommas(nStr) {
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  const rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' +
                             ',' +
                             '$2');
  }
  return x1 + x2;
}

// helper functions copied from user.js in old-frontend
function getScoreMods(m, noplus) {
	const r = [];
  // has nc => remove dt
  if ((m & 512) == 512)
    {m = m & ~64;}
  // has pf => remove sd
  if ((m & 16384) == 16384)
    {m = m & ~32;}
  modsString.forEach(function(v, idx) {
    const val = 1 << idx;
    if ((m & val) > 0)
      {r.push(v);}
  });
	if (r.length > 0) {
		return (noplus ? "" : "+ ") + r.join(", ");
	}
		return (noplus ? 'None' : '');

}

var modsString = [
  "NF",
	"EZ",
	"NV",
	"HD",
	"HR",
	"SD",
	"DT",
	"RX",
	"HT",
	"NC",
	"FL",
	"AU", // Auto.
	"SO",
	"AP", // Autopilot.
	"PF",
	"K4",
	"K5",
	"K6",
	"K7",
	"K8",
	"K9",
	"RN", // Random
	"LM", // LastMod. Cinema?
	"K9",
	"K0",
	"K1",
	"K3",
	"K2",
];

// time format (seconds -> hh:mm:ss notation)
function timeFormat(t) {
  const h = Math.floor(t / 3600);
  t %= 3600;
  const m = Math.floor(t / 60);
  const s = t % 60;
  let c = "";
  if (h > 0) {
    c += h + ":";
    if (m < 10) {
      c += "0";
    }
    c += m + ":";
  } else {
    c += m + ":";
  }
  if (s < 10) {
    c += "0";
  }
  c += s;
  return c;
}

// http://stackoverflow.com/a/901144/5328069
function query(name, url) {
  if (!url) {
    url = window.location.href;
  }
  name = name.replace(/[\[\]]/g, "\\$&");
  const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results)
    {return null;}
  if (!results[2])
    {return '';}
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// Useful for forms contacting the RealistikOsu! API
function formToObject(form) {
  const inputs = form.find("input, textarea, select");
  let obj = {};
  inputs.each(function(_, el) {
    el = $(el);
    if (el.attr("name") === undefined) {
      return;
    }
    const parts = el.attr("name").split(".");
    let value;
    switch (el.attr("type")) {
    case "checkbox":
      value = el.is(":checked");
      break;
    default:
      switch (el.data("cast")) {
      case "int":
        value = +el.val();
        break;
      default:
        value = el.val();
        break;
      }
      break;
    }
    obj = modifyObjectDynamically(obj, parts, value);
  });
  return obj;
}

// > modifyObjectDynamically({}, ["nice", "meme", "dude"], "lol")
// { nice: { meme: { dude: 'lol' } } }
function modifyObjectDynamically(obj, inds, set) {
  if (inds.length === 1) {
    obj[inds[0]] = set;
  } else if (inds.length > 1) {
    if (typeof obj[inds[0]] !== "object")
      {obj[inds[0]] = {};}
    obj[inds[0]] = modifyObjectDynamically(obj[inds[0]], inds.slice(1), set);
  }
  return obj;
}

function isLoggedIn() {
  return currentUserID > 0;
}
