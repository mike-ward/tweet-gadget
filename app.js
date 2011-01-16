/// <reference path="jquery.js" />
/*jslint browser: true, windows: true, onevar: true, undef: true, nomen: true, eqeqeq: true, bitwise: true, newcap: true */
/*global $: false, jQuery: false, OAuth: false, window: false, BigInteger: false */

var APP = {};

if (typeof Array.unique !== "function") {
  Array.prototype.unique = function () {
    var i, len = this.length, out = [], obj = {};
    for (i = 0; i < len; i++) { obj[this[i]] = 0; }
    for (i in obj) { if (obj.hasOwnProperty(i)) { out.push(i); } }
    return out;
  };
}

if (typeof Object.create !== "function") {
  Object.create = function (o) {
    var F = function () { };
    F.prototype = o;
    return new F();
  };
}

String.regexUrl = /(^|[^\/!=])((?:https?:\/\/|www\.)(?:[a-z0-9\/\u272a][a-z0-9\-\/\u272a]*)\.(?:[a-z0-9]+)(?:\w|\([!*';:=+$\/%#\[\]\-_,~.@?&"\w]+\)|\/(?=($|\s))|[!*';:=+$\/%#\[\]\-_,~.@?&"](?=\S))+)/gi;
String.regexHashTag = /(^|[^0-9a-z&\/]+)(#|\uff03)([0-9]*[a-z_][a-z0-9_\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff]*)/gi;
String.regexScreenName = /([^a-z0-9_]|^)(@|\uff20)([a-z0-9_]{1,20})(\/[a-z][a-z0-9_\-\x80-\xFF]{0,24})?/gi;

String.prototype.format = function () {
  var pattern = /\{\d+\}/g,
      placeHolder = /\d+/,
      args = arguments;
  return this.replace(pattern, function (capture) { return args[capture.match(placeHolder)]; });
};

String.prototype.contains = function (text) {
  return this.indexOf(text) !== -1;
};

String.prototype.htmlEntities = function () {
  return this.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

String.prototype.isBlank = function () {
  return (/^\s*$/).test(this);
};

String.prototype.urlsToLinks = function (showLinks) {
  return this.replace(String.regexUrl, function (text, c1, c2) {
    var amp, que, at, c3 = "";
    amp = text.indexOf("&");
    que = text.indexOf("?");
    if (/^.+@["'][a-zA-Z_\- ]+=/.test(text)) { // don't allow XSS after @
      at = text.indexOf("@") - 1;
      c3 = c2.slice(at);
      c2 = c2.slice(0, at);
    }
    else if (amp > 0 && que < 0) { // don't allow & without ?
      c3 = c2.slice(amp - 1);
      c2 = c2.slice(0, amp - 1);
    }
    return '{0}<a href="{1}" class="link">{2}</a>{3}'.format(c1, c2, (showLinks ? c2 : APP.locale.link), c3);
  })
  .replace("<a href=\"www.", "<a href=\"http://www.")
  .replace("<a href=\"WWW.", "<a href=\"http://WWW.");
};

String.prototype.atScreenNames = function () {
  return this.replace(String.regexScreenName, '$1<span class="screenname">$2$3</span>');
};

String.prototype.hashTags = function () {
  return this.replace(String.regexHashTag, '$1<span class="hashtag">$2$3</span>');
};

String.prototype.htmlDecode = function () {
  return $('<div/>').html(this.toString()).text();
};

String.prototype.findUrls = (function () {
  var href = /\bhref="([\S]+\b|$)"/g;
  return function () {
    var matches = this.match(href);
    if (matches) {
      $.each(matches, function (idx) {
        matches[idx] = this.replace(href, "$1");
      });
    }
    return matches;
  };
})();

$.fn.setCaretPos = function (pos) {
  return this.each(function () {
    var range = this.createTextRange();
    range.move('character', pos);
    range.select();
  });
};

$.fn.pulse = function (options) {
  return this.each(function () {
    var settings = $.extend({}, $.fn.pulse.defaults, options),
        n = settings.count,
        $this = $(this);
    function pulse() {
      $this.fadeOut(settings.speed, function () {
        $this.fadeIn(settings.speed, function () {
          if (--n) { pulse(); return; }
          settings.callback();
        });
      });
    }
    pulse();
  });
};

$.fn.pulse.defaults = {
  count: 3,
  speed: 400,
  callback: function () { }
};

$.fn.classAddOrRemove = function (className, add) {
  return this.each(function () {
    if (add) { $(this).addClass(className); }
    else { $(this).removeClass(className); }
  });
};

$.fn.loadStyleSheet = function (styleSheet) {
  $(this).attr("href", styleSheet);
};

jQuery.extend(jQuery.expr[':'], {
    focus: function(element) { 
        return element === document.activeElement; 
    }
});

APP.UTILITY = (function () {
  var that = this;

  that.setting = function (name, defaultValue) {
    var setting;
    return function (value) {
      if (value !== undefined) {
        System.Gadget.Settings.write(name, value);
      }
      else {
        setting = System.Gadget.Settings.read(name);
        return (setting !== "") ? setting : defaultValue;
      }
    };
  };

  that.modifyStyleSheet = function (selector, properties) {
    selector = selector.toLowerCase();
    $.each(document.styleSheets[0].rules, function () {
      if (this.selectorText.toLowerCase() === selector) {
        for (var property in properties) {
          if (properties.hasOwnProperty(property)) {
            this.style[property] = properties[property];
          }
        }
      }
    });
  };

  that.reverseLookup = function (links, link) {
    if (link.substr(0, 7) === "http://" && !links[link]) {
      $.getJSON("http://api.longurl.org/v2/expand",
        { url: link, format: "json" },
        function (r) { links[link] = r["long-url"]; });
    }
  };

  that.author = function (name) {
    return (name) ? '<span class="screenname author">' + name + "</span>" : "";
  };

  that.popup = function (id, text, element, yesAction) {
    var d, dlg, o, t, x, y, h, yes, no;
    $("#" + id).remove();
    d = System.Gadget.docked;
    dlg = $("<div>", { id: id, css: { top: 5000, width: d ? "100px" : "170px"} });
    dlg.append($("<div>", { text: text || "undefined" }));
    if (yesAction) {
      yes = $("<button>", { text: "Yes" }).click(function () { yesAction(); dlg.remove(); });
      no = $("<button>", { text: "No" }).click(function () { dlg.remove(); });
      dlg.append(yes, no);
    }
    $("#content").append(dlg);
    o = element ? element.offset() : { top: 10, left: 10 };
    t = dlg.height();
    x = Math.min(d ? 10 : 80, Math.max(10, o.left));
    y = o.top + (element ? element.height() : 0) + 10;
    h = d ? APP.settings.dockedHeight() : APP.settings.undockedHeight();
    if ((y + t + 10) > h) { y = o.top - t - 10; }
    dlg.hide().css({ "left": x, "top": y }).slideDown("fast");
  };

  that.shellRun = function (cmd) {
    var shell = new ActiveXObject("WScript.Shell");
    shell.Run(cmd);
  };

  that.showStatus = function (status) {
    $("#content").trigger("showStatus", [status]);
  };

  that.versionChecker = (function () {
    var self = {}, result, check, timer;

    result = function (xml) {
      var versionNumber = $(xml).find("tweetz31Result").text();
      if (System.Gadget.version !== versionNumber) {
        APP.UTILITY.popup("ask", APP.locale.new_version_available, null,
          function () { APP.UTILITY.shellRun("http://blueonionsoftware.com/tweetz.aspx"); });
      }
    };

    check = function () {
      var soapMessage = '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                        'xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
                        '<soap:Body><tweetz31 xmlns="http://blueonionsoftware.com/"></tweetz31></soap:Body></soap:Envelope>';
      $.ajax({
        url: "http://blueonionsoftware.com/version.asmx",
        type: "POST",
        dataType: "xml",
        data: soapMessage,
        success: function (data, status, xhr) { result(xhr.responseXML); },
        contentType: "text/xml; charset=\"utf-8\""
      });
    };

    timer = null;

    self.run = function () {
      if (APP.settings.checkForUpdates()) {
        if (timer === null) {
          timer = setInterval(function () { check(); }, 1000 * 3600 * 24);
          check();
        }
      }
      else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    return self;
  })();

  that.command = function (cmd, can) {
    var self = {};

    self.execute = function () {
      var args = Array.prototype.slice.call(arguments);
      return self.canExecute() ? cmd.apply(self, args) : undefined;
    };

    self.canExecute = function () {
      return (can) ? can() : true;
    };

    return self;
  };

  function isBigger(a, b) {
    var i, j, re;
    re = new RegExp('\\D', 'g');
    if (re.test(a) || re.test(b)) { return undefined; }

    a = a.replace(/^0+/g, '');
    b = b.replace(/^0+/g, '');
    if (a.length !== b.length) { return (a.length > b.length); }

    a = a.split('');
    b = b.split('');
    for (i = 0, j = a.length; i < j; ++i) { if (+a[i] > b[i]) { return true; } }
    return false;
  }

  that.maxId = function (id1, id2) {
    return isBigger(id1, id2) ? id1 : id2;
  };

  return that;
})();

APP.settings = {
  userId: APP.UTILITY.setting("userId", ""),
  username: APP.UTILITY.setting("username", ""),
  tokenAccess: APP.UTILITY.setting("tokenAccess", ""),
  tokenSecret: APP.UTILITY.setting("tokenSecret", ""),
  dockedHeight: APP.UTILITY.setting("dockedHeight", 400),
  undockedHeight: APP.UTILITY.setting("undockedHeight", 400),
  chirpOnStatus: APP.UTILITY.setting("chirpOnStatus", false),
  chirpOnMention: APP.UTILITY.setting("chirpOnMention", false),
  chirpOnMessage: APP.UTILITY.setting("chirpOnMessage", false),
  intervalHome: APP.UTILITY.setting("intervalHome", 2),
  intervalMentions: APP.UTILITY.setting("intervalMentions", 4),
  intervalMessages: APP.UTILITY.setting("intervalMessages", 6),
  showLinks: APP.UTILITY.setting("showLinks", false),
  fontSize: APP.UTILITY.setting("fontSize", "medium"),
  checkForUpdates: APP.UTILITY.setting("checkForUpdates", false),
  styleSheet: APP.UTILITY.setting("styleSheet", "css/original.css")
};

APP.comm = function () {
  var that = {}, accessor, ajax;

  accessor =
    {
      consumerKey: "n4Ce1XD9SEXKBpJlkrGpA",
      consumerSecret: "OKcBnIRHubrbKDbkXVEAVFLJ7yUC9glJ6Mhj6enXesU",
      tokenAccess: APP.settings.tokenAccess(),
      tokenSecret: APP.settings.tokenSecret(),
      userId: APP.settings.userId(),
      username: APP.settings.username()
    };

  ajax = function (type, url, data, success, complete, error) {
    var message = { action: url, method: type };
    if (data) { OAuth.setParameters(message, data); }
    if (accessor.tokenAccess.length > 0) { OAuth.setParameter(message, "oauth_token", accessor.tokenAccess); }
    OAuth.completeRequest(message, accessor);
    $("#content").trigger("commAccessing");
    $.ajax({ type: message.method, url: message.action, data: message.parameters,
      success: function (d, s, x) { $("#content").trigger("commSuccess"); if (success) { success(d, s, x); } },
      error: function (d, s, x) { $("#content").trigger("commError"); if (error) { error(d, s, x); } },
      complete: complete
    });
  };

  that.get = function (url, data, success, complete, error) { ajax("get", url, data, success, complete, error); };
  that.post = function (url, data, success, complete, error) { ajax("post", url, data, success, complete, error); };

  that.tokenAccess = function (t) {
    if (t === undefined) { return accessor.tokenAccess; }
    accessor.tokenAccess = t;
  };

  that.tokenSecret = function (t) {
    if (t === undefined) { return accessor.tokenSecret; }
    accessor.tokenSecret = t;
  };

  that.userId = function (id) {
    if (id === undefined) { return accessor.userId; }
    accessor.userId = id;
  };

  that.username = function (name) {
    if (name === undefined) { return accessor.username; }
    accessor.username = name;
  };

  return that;
};

APP.twitter = {
  getPin: function (comm, successCallback, errorCallback) {
    comm.tokenAccess("");
    comm.tokenSecret("");
    comm.get("http://twitter.com/oauth/request_token", null, function (data) {
      if (successCallback) { successCallback(); }
      var d = data.split("&");
      comm.tokenAccess(d[0].split("=")[1]);
      comm.tokenSecret(d[1].split("=")[1]);
      APP.UTILITY.shellRun("http://twitter.com/oauth/authorize?" + data + "&oauth_callback=oob");
    }, null, errorCallback);
  },

  getAccessToken: function (comm, pin, errorCallback) {
    var verifier = { oauth_verifier: $.trim(pin) };
    comm.post("http://twitter.com/oauth/access_token", verifier, function (data) {
      var d = data.split("&");
      comm.tokenAccess(d[0].split("=")[1]);
      comm.tokenSecret(d[1].split("=")[1]);
      comm.userId(d[2].split("=")[1]);
      comm.username(d[3].split("=")[1]);
      APP.settings.tokenAccess(comm.tokenAccess());
      APP.settings.tokenSecret(comm.tokenSecret());
      APP.settings.userId(comm.userId());
      APP.settings.username(comm.username());
      $("#container").trigger("accessTokenReceived");
    }, null, errorCallback);
  },

  getHome: function (model, more) {
    var params = { count: 50 }, max_id;
    if (more) { max_id = model.getOldestId("home"); if (max_id) { params.max_id = max_id; } }
    else { params.since_id = model.sinceIdHome || 1; }
    model.comm.get("http://twitter.com/statuses/home_timeline.json", params, function (data) { model.updateHome(data, more); });
  },

  getMentions: function (model, more) {
    var params = { count: 50 }, max_id;
    if (more) { max_id = model.getOldestId("mentions"); if (max_id) { params.max_id = max_id; } }
    else { params.since_id = model.sinceIdMentions || 1; }
    model.comm.get("http://api.twitter.com/1/statuses/mentions.json", params, function (data) { model.updateMentions(data, more); });
  },

  getMessages: function (model, more) {
    var params = { count: 50 }, max_id;
    if (more) { max_id = model.getOldestId("messages"); if (max_id) { params.max_id = max_id; } }
    else { params.since_id = model.sinceIdMessages || 1; }
    model.comm.get("http://api.twitter.com/1/direct_messages.json", params, function (data) { model.updateMessages(data, more); });
  },

  getMessagesSent: function (model, more) {
    var params = { count: 50 };
    model.comm.get("http://api.twitter.com/1/direct_messages/sent.json", params, function (data) { model.updateMessages(data, more); });
  },

  getFavorites: function (model, more) {
    var params = { count: 100 }, max_id;
    if (more) { max_id = model.getOldestId("favorites"); if (max_id) { params.max_id = max_id; } }
    model.comm.get("http://api.twitter.com/1/favorites.json", params, function (data) { model.updateFavorites(data, more); });
  },

  updateStatus: function (model, message, inReplyToId, callback) {
    try {
      var params = { status: message };
      if (inReplyToId) { params.in_reply_to_status_id = inReplyToId; }
      model.comm.post("http://twitter.com/statuses/update.json", params, function () {
        if (callback) { callback(); }
        APP.UTILITY.showStatus(APP.locale.status_updated);
        setTimeout(function () { APP.twitter.getHome(model, false); }, 500);
      });
    }
    catch (e) {
      System.Diagnostics.EventLog.writeEntry(e.toString());
      $("#content").trigger("internalError");
    }
  },

  search: function (model, params) {
    model.comm.get("http://search.twitter.com/search.json", params, model.updateSearch);
  },

  retweetedBy: function (model, tweet) {
    model.comm.get("http://api.twitter.com/1/statuses/{0}/retweeted_by/ids.json".format(tweet.retweeted_status_id),
      { count: 100 }, function (data) {
        var count = Math.max(0, data.length - 1);
        model.retweets[tweet.id] = APP.locale.retweeted_by_format.format(
          APP.UTILITY.author(tweet.retweeted_by),
          count ? APP.locale.retweeted_by_arg_1 : "",
          count ? count : "",
          count ? APP.locale.retweeted_by_arg_3 : "",
          count > 1 ? APP.locale.retweeted_by_arg_4 : "",
          APP.locale.retweeted_by);
      });
  },

  createFavorite: function (model, id) {
    model.comm.post("http://api.twitter.com/1/favorites/create/" + id + ".json", null, function () {
      APP.UTILITY.showStatus(APP.locale.favorites_updated);
      APP.twitter.getFavorites(model);
    });
  },

  deleteFavorite: function (model, id) {
    model.comm.post("http://api.twitter.com/1/favorites/destroy/" + id + ".json", null, function () {
      setTimeout(function () { model.removeFavorite(id); }, 500);
    });
  },

  deleteTweet: function (model, id) {
    model.comm.post("http://api.twitter.com/1/statuses/destroy/" + id + ".json", null, function () {
      model.removeStatus(id);
    });
  },

  sendMessage: function (model, screen_name, message, success, error) {
    try {
      var params = { screen_name: screen_name, text: message };
      model.comm.post("http://api.twitter.com/1/direct_messages/new.json", params, function () {
        if (success) { success(); }
        APP.UTILITY.showStatus(APP.locale.message_sent);
        setTimeout(function () { APP.twitter.getMessagesSent(model); }, 500);
      }, undefined, error);
    }
    catch (e) {
      System.Diagnostics.EventLog.writeEntry(e.toString());
      $("#content").trigger("internalError");
    }
  },

  retweet: function (model, id) {
    model.comm.post("http://api.twitter.com/1/statuses/retweet/" + id + ".json", null, function () {
      APP.UTILITY.showStatus(APP.locale.retweet_sent);
      setTimeout(function () { APP.twitter.retweetedByMe(model); }, 500);
    });
  },

  retweetedByMe: function (model) {
    var params = { count: 50 };
    model.comm.get("http://api.twitter.com/1/statuses/retweeted_by_me.json", params, function (data) {
      $.each(data, function () {
        var tweet, retweet;
        if (!this.retweeted_status) { return true; }
        tweet = model.findRetweetedTweet(this.retweeted_status.id);
        if (tweet) {
          retweet = model.retweets[tweet.id];
          retweet = (retweet) ?
            retweet.replace(APP.locale.retweeted_by, APP.locale.retweeted_by_you_comma) :
            " " + APP.locale.retweeted_by_you;
          model.retweets[tweet.id] = retweet;
          model.fireUpdateEvent("homeUpdated");
        }
      });
    });
  },

  getStatus: function (id, callback) {
    $.ajax({
      url: "http://twitter.com/statuses/show/" + id + ".json",
      dataType: "json",
      success: callback
    });
  },

  getUserInfo: function (screenName, successCallback, errorCallback) {
    $.ajax({
      url: "http://api.twitter.com/1/users/show.json",
      data: { screen_name: screenName },
      success: successCallback,
      error: errorCallback
    });
  },

  deleteFriendship: function (model, screenName, callback) {
    model.comm.post("http://api.twitter.com/1/friendships/destroy.json", { "screen_name": screenName }, callback);
  },

  createFriendship: function (model, screenName, callback) {
    model.comm.post("http://api.twitter.com/1/friendships/create.json", { "screen_name": screenName }, callback);
  }
};

APP.tabs = function () {
  var tab, locale = APP.locale;
  tab = function (id, src, title) {
    return '<img id="' + id + '" src="' + src + '" title="' + title + '"/>';
  };
  return '<div id="tabs">' +
    tab("tab_all", "images/tab/unified.png", locale.tab_all_tooltip) +
    tab("tab_home", "images/tab/home.png", locale.tab_home_tooltip) +
    tab("tab_mentions", "images/tab/mentions.png", locale.tab_mentions_tooltip) +
    tab("tab_messages", "images/tab/messages.png", locale.tab_messages_tooltip) +
    tab("tab_search", "images/tab/find.png", locale.tab_search_tooltip) +
    tab("tab_favorites", "images/tab/favorites.png", locale.tab_favorites_tooltip) +
    '</div>';
};

APP.edit = function (model) {
  var that = {},
      action, tweet, inReplyToId, toScreenName, dlg, title, textarea, counter,
      countChars, sendNow, shortenUrl, shortenUrls, buildDialog;

  countChars = function () {
    var count = textarea.val().length;
    counter.text(count);
    counter.removeClass("counter_ok counter_near counter_over");
    counter.addClass((count > 135) ? ((count > 140) ? "counter_over" : "counter_near") : "counter_ok");
  };

  sendNow = function () {
    var text = textarea.val(),
        length = text.length,
        successCallback, errorCallback;
    if (length <= 0 || length > 140) { textarea.focus(); return; }
    successCallback = function () { that.hide(); textarea.empty(); model.locked(false); };
    errorCallback = function (xhr) { title.text($.parseJSON(xhr.responseText).error); };
    switch (action) {
      case "tweet": APP.twitter.updateStatus(model, text, undefined, successCallback, errorCallback); break;
      case "reply_command": APP.twitter.updateStatus(model, text, inReplyToId, successCallback, errorCallback); break;
      case "reply_all_command": APP.twitter.updateStatus(model, text, inReplyToId, successCallback, errorCallback); break;
      case "message_command": APP.twitter.sendMessage(model, toScreenName, text, successCallback, errorCallback); break;
      case "retweet_command": APP.twitter.updateStatus(model, text, undefined, successCallback, errorCallback); break;
    }
    title.text(APP.locale.send_now_sending).pulse();
  };

  shortenUrl = function (url) {
    if (url.contains('http://is.gd') === false) {
      $.get("http://is.gd/api.php", { longurl: url }, function (shortUrl) {
        textarea.val(textarea.val().replace(url, shortUrl));
        countChars();
      });
    }
  };

  shortenUrls = function () {
    var length,
        text = textarea.val(),
        matches = text.match(String.regexUrl);
    if (matches) {
      length = matches.length;
      while (length--) { shortenUrl(matches[length]); }
    }
  };

  buildDialog = function () {
    var shorten, cancel, send, actions, button;
    title = $("<div>", { text: APP.locale.edit_whats_happening }).bind("mousedown", that.hide);
    textarea = $("<textarea>").bind("keyup", function (e) {
      var sKey = 83, kKey = 75;
      if (e.ctrlKey && e.keyCode === sKey) { sendNow(); }
      else if (e.ctrlKey && e.keyCode === kKey) { shortenUrls(); }
      else { countChars(); }
      return false;
    });
    counter = $("<span>", { id: "counter", text: 0 });
    button = function (id, txt, tip, cmd) {
      return $("<span>", { id: id, text: txt, title: tip, "class": "hover" }).bind("mousedown", cmd);
    };
    shorten = button("shorten", APP.locale.edit_shorten, APP.locale.edit_shorten_tooltip, shortenUrls);
    cancel = button("cancel", APP.locale.edit_cancel, "Esc", that.hide);
    send = button("send", APP.locale.edit_send, "ctrl+S", sendNow);
    actions = $("<div>", { css: { "text-align": "right"} }).append(counter, shorten, cancel, send);
    return $("<div>", { id: "edit" }).append(title, textarea, actions).bind("keydown", function (e) {
      var escapeKey = 27;
      if (e.keyCode === escapeKey) {
        that.hide();
        return false;
      }
    });
  };

  that.dialog = function () {
    return (dlg = dlg || buildDialog());
  };

  that.show = function (actionArg, tweetArg) {
    action = actionArg || "tweet";
    tweet = tweetArg || { screen_name: "" };
    switch (action) {
      case "reply_command":
        title.text("@" + tweet.screen_name);
        textarea.val("@" + tweet.screen_name + " ");
        inReplyToId = tweet.id;
        break;
      case "reply_all_command":
        title.text("@" + tweet.screen_name);
        textarea.val("@{0} {1} ".format(tweet.screen_name, function () {
          var names = tweet.text.match(String.regexScreenName);
          return names ? names.unique().join(" ") : "";
        } ()));
        inReplyToId = tweet.id;
        break;
      case "message_command":
        title.text(APP.locale.edit_message_to + " " + tweet.screen_name);
        toScreenName = tweet.screen_name;
        break;
      case "retweet_command":
        title.text(APP.locale.edit_retweet + " " + tweet.screen_name);
        textarea.val("RT @{0} {1}".format(tweet.screen_name, tweet.text));
        break;
      default:
        title.text(APP.locale.edit_whats_happening);
        break;
    }
    countChars();
    dlg.show();
    setTimeout(function () { textarea.focus().setCaretPos(1000); }, 100);
  };

  that.hide = function () {
    dlg.hide();
    textarea.empty();
    $("#content").focus();
  };

  that.toggle = function (actionArg, tweetArg) {
    if (dlg.is(":hidden")) { that.show(actionArg, tweetArg); }
    else { that.hide(); }
  };

  return that;
};

APP.FORM = {
  login: function () {
    var that = {};

    that.render = function (model) {
      var content =
        '<div style="height:400px;">' +
        '<div style="margin-top:2pc; margin-left:13;">' +
        '<div><button id="get_pin" style="width:100;">{0}</button></div><br/>' +
        '<div><input id="pin_text" value="{1}" class="blur" type="text" style="width:90; margin-left:2;"/></div><br/>' +
        '<div><button id="login" style="width:100;" disabled="disabled">{2}</button><br/></div><br/>' +
        '<p><a href="http://blueonionsoftware.com/tweetz-help.aspx">{3}</a></p>' +
        '<p id="pin_error"></p>' +
        '</div></div>';
      return content.format(APP.locale.login_get_pin, APP.locale.login_enter_pin, APP.locale.login_login, APP.locale.settings_help);
    };

    that.onSize = function () {
      var docked = System.Gadget.docked,
          height = docked ? APP.settings.dockedHeight() : APP.settings.undockedHeight();
      $(document.body, "#container").css({ "width": docked ? "130px" : "300px", "height": height });
    };

    that.selectTab = function () { };
    return that;
  },

  formBase: (function () {
    var that = {}, contentHeight, setFontSizes, relativeTime, timeStamp, inReplyTo, locale, author, tabs;

    contentHeight = function (height) {
      return height - $("#tabs").outerHeight() - $("#title").outerHeight() -
        $("#tabs_divider").outerHeight() - $("#search").outerHeight() - 2;
    };

    setFontSizes = function () {
      var fontClass;
      switch (APP.settings.fontSize()) {
        case "small": fontClass = "small_font"; break;
        case "large": fontClass = "large_font"; break;
        default: fontClass = "medium_font"; break;
      }
      $("#content, #status, #tip, #ask, #edit, #more, #panel")
        .removeClass("small_font medium_font large_font")
        .addClass(fontClass);
    };

    that.onSize = function () {
      var docked = System.Gadget.docked,
          height = docked ? APP.settings.dockedHeight() : APP.settings.undockedHeight();
      $("#base_style_sheet").loadStyleSheet("css/base.css");
      $("#style_sheet").loadStyleSheet(APP.settings.styleSheet());
      $(document.body).css({ width: (docked ? 130 : 300), "height": height });
      $("#container").css({ "height": height - 2 });
      $("#container, #edit").classAddOrRemove("docked", docked);
      $("#content").css({ "height": contentHeight(height) });
      setFontSizes();
    };

    relativeTime = function (date) {
      var diff = ((new Date()).getTime() - date.getTime()) / 1000;
      return true && (
        diff < 20 && locale.time_seconds_ago ||
        diff < 120 && locale.time_minute_ago ||
        diff < 3600 && locale.time_minutes_ago.format(Math.floor(diff / 60)) ||
        diff < 7200 && locale.time_hour_ago ||
        diff < 86400 && locale.time_hours_ago.format(Math.floor(diff / 3600)) ||
        Math.floor(diff / 86400) === 1 && locale.time_yesterday || "");
    };

    timeStamp = function (time) {
      var minutes = time.getMinutes();
      if (minutes < 10) { minutes = "0" + minutes; }
      return relativeTime(time) ||
        "{0} {1}, {2} {3}:{4} {5}".format(
        locale.months[time.getMonth()],
        time.getDate(),
        time.getYear(),
        (time.getHours() % 12) || "12", minutes,
        (time.getHours() < 12) ? locale.time_am : locale.time_pm);
    };

    that.updateTimeStamps = function (model) {
      $(".time").each(function () {
        var text,
            stamp = $(this),
            id = stamp.closest(".tweet").attr("id"),
            tweet = model.getTweet(id);
        if (tweet) {
          text = timeStamp(tweet.created_at);
          if (stamp.text() !== text) { stamp.text(text); }
        }
      });
    };

    inReplyTo = function (tweet) {
      if (tweet.in_reply_to_screen_name) {
        return ' {2} <span name="{0}" class="inreplyto">{1}</span>'.format(
        tweet.in_reply_to_status_id, tweet.in_reply_to_screen_name, locale.foot_in_reply_to);
      }
      return "";
    };

    that.divider = function () {
      return '<div id="tabs_divider" class="divider" />';
    };

    that.assembleForm = function (content) {
      return tabs + that.divider() + content;
    };

    that.selected = (function () {
      var selectedId = "";
      return function (id) {
        if (id !== undefined) { selectedId = id; }
        return selectedId;
      };
    })();

    that.renderTweet = function (model, tweet) {
      var classNames, htmlFormat;
      classNames = "tweet" +
        ((tweet.id.toString() === that.selected().toString()) ? " selected_tweet" : "") +
        ((tweet.timelines.contains("mentions")) ? " mention" : "") +
        ((tweet.timelines.contains("messages")) ? " message" : "");
      htmlFormat =
        '<div id="{0}" class="{1}"><img id="p{0}" src="{2}" class="pic"/>' +
        '<div class="tweet_text">{3}{4}{5} {6}</div>' +
        '<div class="info"><span class="time">{7}</span>{8}{9}{10}<span class="{11}">&bull;</span></div>' +
        '<div class="divider"/></div>';
      if (!tweet.html) {
        tweet.html = tweet.text.htmlEntities().atScreenNames().urlsToLinks(APP.settings.showLinks()).hashTags();
      }
      return htmlFormat.format(
        tweet.id,
        classNames,
        tweet.profile_image_url,
        (tweet.timelines.contains("messages")) ? '<img src="images/invisible.gif" class="msg"/>' : "",
        (tweet.retweeted_status_id) ? '<img src="images/invisible.gif" class="retweet"/>' : "",
        author(tweet.screen_name),
        tweet.html,
        timeStamp(tweet.created_at),
        tweet.source ? " " + locale.foot_via + " " : "",
        tweet.source,
        model.retweets[tweet.id] || inReplyTo(tweet),
        model.unread[tweet.id] ? " unread" : "read");
    };

    that.render = function (model) {
      var tweets = this.getTweets(model), length = tweets.length, content = "", i, t = that;
      if (!locale) { locale = APP.locale; }
      if (!author) { author = APP.UTILITY.author; }
      if (!tabs) { tabs = APP.tabs(); }
      model.locked(false);
      for (i = 0; i < length; ++i) { content += t.renderTweet(model, tweets[i]); }
      if (content.length) { content += this.more(); }
      return this.assembleForm('<div id="content">' + content + '</div>');
    };

    that.more = function () {
      return '<div id="more">' + locale.foot_more + '</div>';
    };

    return that;
  } ()),

  all: function () {
    var that = Object.create(APP.FORM.formBase);
    that.tabId = "tab_all";
    that.getTweets = function (model) { return model.getAllTweets(); };
    that.more = function () { };
    return that;
  },

  home: function () {
    var that = Object.create(APP.FORM.formBase);
    that.tabId = "tab_home";
    that.getTweets = function (model) { return model.getHomeTweets(); };
    return that;
  },

  search: function () {
    var that = Object.create(APP.FORM.formBase);
    that.tabId = "tab_search";
    that.getTweets = function (model) { return model.getSearchTweets(); };
    that.assembleForm = function (content) {
      var query = $("#search_query").val() || "",
          div = '<div id="search"><input id="search_query" value="{0}"/><span id="search_button">{1}</span></div>',
          textarea = div.format(query, APP.locale.search_button);
      return APP.tabs() + that.divider() + textarea + content;
    };
    return that;
  },

  favorites: function () {
    var that = Object.create(APP.FORM.formBase);
    that.tabId = "tab_favorites";
    that.getTweets = function (model) { return model.getFavorites(); };
    that.more = function () { };
    return that;
  },

  mentions: function () {
    var that = Object.create(APP.FORM.formBase);
    that.tabId = "tab_mentions";
    that.getTweets = function (model) { return model.getMentions(); };
    return that;
  },

  messages: function () {
    var that = Object.create(APP.FORM.formBase);
    that.tabId = "tab_messages";
    that.getTweets = function (model) { return model.getMessages(); };
    return that;
  }
};

APP.model = function (comm) {
  var that = {},
      statuses = {},
      searches = {},
      pendingUpdateEvents = {},
      update,
      asArraySortedByTime,
      filterBy,
      whereRetweetStatusId;

  that.comm = comm;
  that.links = {};
  that.unread = {};
  that.retweets = {};
  that.sinceIdHome = "0";
  that.sinceIdMentions = "0";
  that.sinceIdMessages = "0";

  that.readTweet = function (data, timeline) {
    try {
      var tweet = {},
          user = data.user || (data.sender_id_str === comm.userId() ? data.recipient : data.sender);
      tweet.id = data.id_str;
      tweet.screen_name = (user) ? user.screen_name : data.from_user;
      tweet.profile_image_url = (user) ? user.profile_image_url : data.profile_image_url;
      tweet.text = data.text.htmlDecode();
      tweet.created_at = new Date((data.created_at || "").replace("+0000", "GMT"));
      tweet.favorited = data.favorited;
      tweet.source = (data.from_user) ? data.source.htmlDecode() : data.source;
      tweet.in_reply_to_screen_name = data.in_reply_to_screen_name;
      tweet.in_reply_to_status_id = data.in_reply_to_status_id_str;
      tweet.retweeted_status_id = data.retweeted_status && data.retweeted_status.id_str;
      if (tweet.retweeted_status_id) {
        tweet.text = data.retweeted_status.text;
        tweet.retweeted_by = tweet.screen_name;
        tweet.screen_name = data.retweeted_status.user.screen_name;
        tweet.profile_image_url = data.retweeted_status.user.profile_image_url;
        that.retweets[tweet.id] = " Retweeted by {0}".format(APP.UTILITY.author(tweet.retweeted_by));
      }
      tweet.timelines = timeline || "";
      return tweet;
    }
    catch (e) {
      return null;
    }
  };

  that.fireUpdateEvent = function (updateEvent, params) {
    if (pendingUpdateEvents[updateEvent]) { clearTimeout(pendingUpdateEvents[updateEvent]); }
    pendingUpdateEvents[updateEvent] = setTimeout(function () {
      pendingUpdateEvents[updateEvent] = null;
      $("#container").trigger(updateEvent, params);
    }, 2000);
  };

  that.locked = (function () {
    var locked = false;
    return function (lock) {
      if (lock === undefined) { return locked; }
      locked = lock;
      $("#content").trigger("lockIndicator", [locked]);
    };
  })();

  that.isMention = (function () {
    var nameExp;
    return function (tweet) {
      if (!nameExp) { nameExp = new RegExp("([^a-z0-9_]|^)(@|\\uff20)" + comm.username(), "i"); }
      return nameExp.test(tweet.text.htmlEntities());
    };
  } ());

  update = function (store, data, timeline, updateEvent, more) {
    var updated = false, sinceId = "0", forceChirp = false, maxId = APP.UTILITY.maxId;
    $.each(data.results || data, function () {
      var tweet = that.readTweet(this, timeline), matches;
      if (tweet) {
        if (store[tweet.id] === undefined) {
          store[tweet.id] = tweet;
          tweet.html = tweet.text.htmlEntities().atScreenNames().urlsToLinks(APP.settings.showLinks()).hashTags();
          matches = tweet.html.findUrls();
          if (matches) { $.each(matches, function (idx, val) { APP.UTILITY.reverseLookup(that.links, val); }); }
          if (tweet.retweeted_status_id) { APP.twitter.retweetedBy(that, tweet); }
          if (!more) { that.unread[tweet.id] = true; }
          sinceId = maxId(tweet.id, sinceId);
          updated = true;
        }
        tweet = store[tweet.id];
        if (tweet.timelines.contains(timeline) === false) {
          tweet.timelines += timeline + " ";
          updated = true;
        }
        if (tweet.timelines.contains("mentions") === false && that.isMention(tweet)) {
          tweet.timelines += "mentions ";
          if (APP.settings.chirpOnMention()) { forceChirp = true; }
        }
      }
    });
    if (updated) {
      switch (timeline) {
        case "home":
          that.sinceIdHome = maxId(sinceId, that.sinceIdHome);
          if (APP.settings.chirpOnStatus() || forceChirp) { that.fireUpdateEvent("chirp"); }
          break;
        case "mentions":
          that.sinceIdMentions = maxId(sinceId, that.sinceIdMentions);
          if (APP.settings.chirpOnMention() || forceChirp) { that.fireUpdateEvent("chirp"); }
          break;
        case "messages":
          that.sinceIdMessages = maxId(sinceId, that.sinceIdMessages);
          if (APP.settings.chirpOnMessage() || forceChirp) { that.fireUpdateEvent("chirp"); }
          break;
        case "search":
          break;
      }
      if (!that.locked() || timeline === "search" || more) {
        that.fireUpdateEvent(updateEvent, [more]);
      }
    }
  };

  that.updateHome = function (data, more) { update(statuses, data, "home", "homeUpdated", more); };
  that.updateMentions = function (data, more) { update(statuses, data, "mentions", "mentionsUpdated", more); };
  that.updateMessages = function (data, more) { update(statuses, data, "messages", "messagesUpdated", more); };
  that.updateFavorites = function (data, more) { update(statuses, data, "favorites", "favoritesUpdated", more); };
  that.updateSearch = function (data, more) { update(searches, data, "search", "searchUpdated", more); };

  asArraySortedByTime = function (obj) {
    var items = [];
    $.each(obj, function () { items.push(this); });
    items.sort(function (a, b) { return b.created_at.getTime() - a.created_at.getTime(); });
    return items;
  };

  filterBy = function (timeline) {
    var items = {};
    $.each(statuses, function () {
      if (this.timelines.contains(timeline)) {
        items[this.id] = this;
      }
    });
    return items;
  };

  that.clearTweetHtml = function () {
    $.each(statuses, function () { delete this.html; });
    $.each(searches, function () { delete this.html; });
  };

  that.purgeOldTweetsFromTimeline = function (timeline) {
    var i,
        item,
        items = asArraySortedByTime(filterBy(timeline)),
        length = items.length;
    for (i = 251; i < length; i += 1) {
      item = items[i];
      item.timelines = item.timelines.replace(timeline, "");
      if (item.timelines.isBlank()) { delete statuses[item.id]; }
    }
  };

  that.getOldestId = function (timeline) {
    var t = asArraySortedByTime(filterBy(timeline)),
        l = t.length;
    return l ? t[l - 1].id : undefined;
  };

  that.getAllTweets = function () { return asArraySortedByTime(statuses); };
  that.getHomeTweets = function () { return asArraySortedByTime(filterBy("home")); };
  that.getSearchTweets = function () { return asArraySortedByTime(searches); };
  that.getFavorites = function () { return asArraySortedByTime(filterBy("favorites")); };
  that.getMentions = function () { return asArraySortedByTime(filterBy("mentions")); };
  that.getMessages = function () { return asArraySortedByTime(filterBy("messages")); };
  that.getTweet = function (id) { return statuses[id] || searches[id]; };
  that.clearSearches = function () { searches = {}; };

  whereRetweetStatusId = function (items, id) {
    var tweet;
    $.each(items, function () {
      if (this.retweeted_status_id === id) { tweet = this; return false; }
    });
    return tweet;
  };

  that.findRetweetedTweet = function (id) {
    return whereRetweetStatusId(statuses, id) || that.getTweet(id);
  };

  that.removeStatus = function (id) {
    if (statuses[id]) {
      delete statuses[id];
      that.fireUpdateEvent("homeUpdated", [true]);
    }
  };

  that.removeFavorite = function (id) {
    if (statuses[id]) {
      statuses[id].favorited = false;
      statuses.timelines = statuses.timelines.replace("favorites", "");
      that.fireUpdateEvent("favoritesUpdated");
    }
  };

  return that;
};

APP.view = function (model) {
  var that = {},
      currentFormName = "home",
      controller = APP.controller(model, that),
      forms,
      statusBar,
      panel,
      showFormMap,
      settingsClosed,
      setActiveTab;

  forms = {
    login: APP.FORM.login(),
    all: APP.FORM.all(),
    home: APP.FORM.home(),
    search: APP.FORM.search(),
    favorites: APP.FORM.favorites(),
    mentions: APP.FORM.mentions(),
    messages: APP.FORM.messages()
  };

  statusBar = '<div id="status"/>';
  $(document.body).append(statusBar);

  panel = function () {
    var item = function (text, shortcut, commandId) {
      return $("<tr>", { id: commandId })
          .bind("mousedown", function () { $("#panel").trigger(commandId); })
          .append($("<td>", { text: text }), $("<td>", { text: shortcut }));
    },
    separator = function () {
      return $("<tr>", { "class": "panelseparator" }).append($("<td>", { "colspan": "2" }));
    };
    return $("<table>", { id: "panel" }).append(
        item(APP.locale.panel_reply, APP.locale.panel_reply_shortcut, "reply_command"),
        item(APP.locale.panel_reply_all, APP.locale.panel_reply_all_shortcut, "reply_all_command"),
        item(APP.locale.panel_message, APP.locale.panel_message_shortcut, "message_command"),
        item(APP.locale.panel_retweet, APP.locale.panel_retweet_shortcut, "retweet_command"),
        item(APP.locale.panel_retweet_api, APP.locale.panel_retweet_api_shortcut, "native_retweet_command"),
        separator(),
        item(APP.locale.panel_favorite, APP.locale.panel_favorite_shortcut, "favorite_command"),
        item(APP.locale.panel_delete, "", "delete_command"),
        separator(),
        item(APP.locale.panel_browser, "", "open_in_browser_command"),
        item(APP.locale.panel_copy, APP.locale.panel_copy_shortcut, "copy_command")
        );
  };
  $("#container").after(panel());

  that.showStatus = function (status) {
    var sb, offset;
    sb = $("#status");
    offset = $("#content").offset();
    sb.text(status);
    sb.css({ "top": offset.top + 2, right: System.Gadget.docked ? "5px" : "21px" });
    sb.fadeIn("normal", function () { $(this).fadeOut(); }).delay(800);
  };

  that.selected = function (id) {
    var form = forms[currentFormName];
    if (form && form.selected) {
      if (id === undefined) { return form.selected(); }
      form.selected(id);
    }
  };

  that.edit = APP.edit(model);
  $(document.body).append(that.edit.dialog());

  showFormMap = {
    "all": function (more) { that.updateForm("all", more); },
    "home": function (more) { that.updateForm("home", more); },
    "mentions": function (more) { that.updateForm("mentions", more); },
    "messages": function (more) { that.updateForm("messages", more); },
    "favorites": function (more) { that.updateForm("favorites", more); },
    "search": function (more) { that.showForm("search", more); }
  };

  $("#container").live("homeUpdated mentionsUpdated messagesUpdated favoritesUpdated searchUpdated", function (e, more) {
    showFormMap[currentFormName](more);
  });

  that.showForm = function (formName, keepScrollTop, callback) {
    var form, title, formContent, scrollTop;
    title = '<div id="title" title="{0}"><span id="comm_indicator">&bull;</span><span id="lock_indicator" style="display:none"/></div>'.format(APP.locale.compose_tweet);
    form = forms[formName];
    formContent = title + form.render(model, that);
    scrollTop = (keepScrollTop) ? $("#content").scrollTop() : 0;
    $("#container").empty().html(formContent);
    setActiveTab(form.tabId);
    if (keepScrollTop) { $("#content").scrollTop(scrollTop); }
    currentFormName = formName;
    System.Gadget.onDock = form.onSize;
    System.Gadget.onUndock = form.onSize;
    form.onSize();
    that.updateCommIndicator();
    if (callback) { callback(); }
  };

  that.updateForm = function (formName, more) {
    var form, content, tweet, updates;
    if (more) { that.showForm(formName, more); }
    updates = [];
    form = forms[formName];
    content = $(form.render(model, that));
    content.find(".tweet").each(function (idx) {
      var t, id = "#" + this.id;
      if (idx > 4) {
        updates.length = 0;
        that.showForm(formName, more);
        return false;
      }
      if ($(id).length) { return false; }
      t = $(this).hide();
      updates.push(t.clone());
    });
    content.remove();
    tweet = updates.pop();
    while (tweet) {
      $("#content").prepend(tweet);
      $(tweet).slideDown("slow");
      tweet = updates.pop();
    }
  };

  setActiveTab = function (tabId) {
    $("#tabs > img").removeClass("active");
    $("#" + tabId).addClass("active");
  };

  that.updateTimeStamps = function () {
    if (forms[currentFormName].updateTimeStamps) {
      forms[currentFormName].updateTimeStamps(model);
    }
  };

  that.getCurrentFormName = function () {
    return currentFormName;
  };

  that.cursor = function (cursor) {
    $("#container").css("cursor", cursor);
  };

  settingsClosed = function (e) {
    if (e.closeAction === e.Action.commit) {
      model.clearTweetHtml();
      setTimeout(function () {
        that.showForm(currentFormName);
        APP.UTILITY.versionChecker.run();
      }, 500);
    }
  };

  System.Gadget.settingsUI = "settings.html";
  System.Gadget.onSettingsClosed = settingsClosed;

  that.updateCommIndicator = (function () {
    var timer,
        lastColor = "#f00",
        setIndicator = function (color) { $("#comm_indicator").css("color", color); };
    return function (state) {
      if (timer) { clearTimeout(timer); timer = null; }
      if (state === undefined) { setIndicator(lastColor); return; }
      if (state === "accessing") { lastColor = "#ff0"; setIndicator("#ff0"); return; }
      lastColor = (state === "success") ? "#0d0" : "#f00";
      timer = setTimeout(function () { setIndicator(lastColor); }, 1500);
    };
  })();

  that.lockIndicator = function (locked) {
    var l = $("#lock_indicator");
    if (locked) { l.show(); }
    else { l.hide(); }
  };

  that.showStatusFlyout = function (tweet) {
    var form = APP.FORM.home(), renderedTweet = form.renderTweet(model, tweet);
    APP.statusParams = { tweet: renderedTweet };
    System.Gadget.Flyout.file = "inreplyto.html";
    System.Gadget.Flyout.show = true;
  };

  that.start = function () {
    if (APP.settings.username()) { controller.startTimelines(); }
    else { that.showForm("login"); }
  };

  return that;
};

APP.controller = function (model, view) {
  var that = {}, homeTimer, mentionsTimer, messagesTimer, timeStampTimer,
      stopTimer, canDelete, isFavorite, scroll, tooltip, submitSearch, switchStyleSheet;

  stopTimer = function (timerId) {
    if (timerId !== undefined) { clearInterval(timerId); }
  };

  that.startTimelines = function () {
    var start = function (getTimeline, interval, id) {
      stopTimer(id);
      getTimeline(model, true);
      return setInterval(function () { getTimeline(model, false); }, interval * 1000 * 60);
    };
    $("#base_style_sheet").loadStyleSheet("css/base.css");
    $("#style_sheet").loadStyleSheet(APP.settings.styleSheet());
    view.showForm("all");
    homeTimer = start(APP.twitter.getHome, APP.settings.intervalHome(), homeTimer);
    mentionsTimer = start(APP.twitter.getMentions, APP.settings.intervalMentions(), mentionsTimer);
    messagesTimer = start(APP.twitter.getMessages, APP.settings.intervalMessages(), messagesTimer);
    APP.twitter.getMessagesSent(model);
    if (timeStampTimer === undefined) { timeStampTimer = setInterval(view.updateTimeStamps, 60000); }
    setTimeout(function () { APP.twitter.retweetedByMe(model); }, 2000);
    setTimeout(function () { APP.UTILITY.versionChecker.run(); }, 20000);
  };

  $("#container").live("accessTokenReceived", function () {
    that.startTimelines();
  });

  $("#title").live("mousedown", function () {
    view.edit.toggle("tweet");
  });

  $("#container").live("keydown", function (e) {
    var sKey = 83, dKey = 68, source, w;
    if (e.ctrlKey && e.keyCode === sKey) {
      view.edit.show("tweet");
      return false;
    }
    if (e.ctrlKey && e.keyCode === dKey) {
      w = window.open('', 'DOM', '');
      w.document.write('<html><head><title>Document Dump</title></head><body><pre>');
      w.document.write('</head><body><pre>');
      source = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">\x0d<html>';
      source += document.getElementsByTagName("html")[0].innerHTML;
      source += "\x0d</html>";
      w.document.write(source.htmlEntities());
      w.document.write('</pre></body></html>');
      w.document.close();
      return false;
    }
  });

  that.commands = {
    reply: APP.UTILITY.command("reply", function () { }, true),
    replyAll: APP.UTILITY.command("reply_all", function () { }, true)
  };

  canDelete = function (id) {
    var tweet = model.getTweet(id);
    return (tweet && tweet.screen_name === model.comm.username());
  };

  isFavorite = function (id) {
    var tweet = model.getTweet(id);
    return (tweet && tweet.favorited);
  };

  (function () {
    var timerId;
    $(".pic").live("mouseenter mouseleave", function (e) {
      var pic;
      if (e.type === "mouseenter") {
        pic = $(this);
        timerId = setTimeout(function () {
          var offset, id, panel, diff, top;
          if ($("#edit").is(":visible")) { return false; }
          offset = pic.offset();
          id = pic.attr("id").slice(1);
          panel = $("#panel");
          panel.data("id", id);
          $("#delete_command").classAddOrRemove("menu_off", !canDelete(id));
          $("#favorite_command > td:first").html((isFavorite(id) ? "<b>!</b> " : "") + APP.locale.panel_favorite);
          diff = $("#container").outerHeight() - (offset.top + panel.outerHeight());
          top = (diff < 0) ? offset.top + diff - 4 : offset.top;
          panel.css({ "top": top, "left": offset.left - 4, display: "block" });
          return false;
        }, 300);
      }
      else if (e.type === "mouseleave") {
        clearTimeout(timerId);
      }
    });
  })();

  $("#panel").live("mousemove", function () {
    return false;
  });

  $("body").live("mousemove mouseleave", function () {
    $("#panel").css("display", "none");
  });

  $("#usr_button").live("mousedown", function () {
    var tweet = model.getTweet($("#panel").data("id"));
    APP.showUserParams = { model: model, view: view, showUserName: "@" + tweet.screen_name };
    System.Gadget.Flyout.file = "showuser.html";
    System.Gadget.Flyout.show = true;
  });

  $("#panel").live("reply_command", function (evt) {
    var panel = $(this);
    panel.hide();
    view.edit.show(evt.type, model.getTweet(panel.data("id")));
  });

  $("#panel").live("reply_all_command", function (evt) {
    var panel = $(this);
    panel.hide();
    view.edit.show(evt.type, model.getTweet(panel.data("id")));
  });

  $("#panel").live("message_command", function (evt) {
    var panel = $(this);
    panel.hide();
    view.edit.show(evt.type, model.getTweet(panel.data("id")));
  });

  $("#panel").live("retweet_command", function (evt) {
    var panel = $(this);
    panel.hide();
    view.edit.show(evt.type, model.getTweet(panel.data("id")));
  });

  $("#panel").live("native_retweet_command", function () {
    var panel = $(this);
    panel.hide();
    APP.UTILITY.popup("ask", APP.locale.retweet_confirmation, $(this), function () {
      APP.twitter.retweet(model, panel.data("id"));
    });
  });

  $("#panel").live("delete_command", function () {
    var panel;
    panel = $(this);
    panel.hide();
    APP.twitter.deleteTweet(model, panel.data("id"));
  });

  $("#panel").live("favorite_command", function () {
    var panel = $(this), id = panel.data("id"), func;
    panel.hide();
    func = isFavorite(id) ? APP.twitter.deleteFavorite : APP.twitter.createFavorite;
    func(model, id);
  });

  $("#panel").live("open_in_browser_command", function () {
    var panel = $(this),
        tweet = model.getTweet(panel.data("id")),
        url = "http://twitter.com/{0}/statuses/{1}".format(tweet.screen_name, tweet.id);
    panel.hide();
    APP.UTILITY.shellRun(url);
  });

  $("#panel").live("copy_command", function () {
    var panel = $(this),
        tweet = model.getTweet(panel.data("id"));
    panel.hide();
    if (tweet) { window.clipboardData.setData("text", tweet.text); }
  });

  $("#container").live("keydown", function (e) {
    var cKey = 67, fKey = 70, mKey = 77, rKey = 82, tKey = 84, command, tweetId = view.selected(), panel;
    if (!tweetId || $("input").is(":focus")) { return; }
    switch (e.keyCode) {
      case cKey: if (e.ctrlKey) { command = "copy_command"; } else { return; } break;
      case fKey: command = "favorite_command"; break;
      case mKey: command = "message_command"; break;
      case rKey: command = (e.shiftKey ? "reply_all_command" : "reply_command"); break;
      case tKey: command = (e.shiftKey ? "native_retweet_command" : "retweet_command"); break;
      default: return true;
    }
    panel = $("#panel");
    if (panel) {
      panel.data("id", tweetId);
      panel.trigger(command);
    }
    return false;
  });

  scroll = function (delta) {
    var i,
        content = $("#content"),
        s = content.scrollTop(),
        o = content.offset().top - s,
        t = 0, p1 = 0, p2, gap = 7,
        tweets = content.find(".tweet"),
        length = tweets.length;
    for (i = 0; i < length; i += gap) {
      if (($(tweets[i]).offset().top - o) > s) { i -= (gap + 1); break; }
    }
    if (i > tweets.length) { i -= (gap + 1); }
    for (i = Math.max(0, i); i < length; i += 1) {
      p2 = p1;
      p1 = t;
      t = $(tweets[i]).offset().top - o;
      if (t > s) {
        if (delta > 0) { t = p2; }
        break;
      }
    }
    content.scrollTop(t);
    model.locked(t !== 0);
  };

  $("#content").live("mousewheel", function (e) {
    scroll(e.wheelDelta);
    return false;
  });

  $("#content").live("keydown", function (e) {
    var up = 38, down = 40, pgUp = 33, pgDn = 34, home = 36, end = 35, direction = 0;
    if (e.keyCode === up) { direction = 1; }
    if (e.keyCode === down) { direction = -1; }
    if (e.keyCode === pgUp) { direction = 3; }
    if (e.keyCode === pgDn) { direction = -3; }
    if (e.keyCode === home) { model.locked(false); }
    if (e.keyCode === end) { model.locked(true); }
    if (direction) { scroll(direction); return false; }
  });

  $("#tab_all").live("mousedown", function () {
    var refresh = view.getCurrentFormName() === "all";
    model.purgeOldTweetsFromTimeline("home");
    model.purgeOldTweetsFromTimeline("mentions");
    model.purgeOldTweetsFromTimeline("messages");
    $("#content").empty();
    view.showForm("all");
    if (refresh) {
      APP.twitter.getHome(model);
      APP.twitter.getMentions(model);
      APP.twitter.getMessages(model);
    }
  });

  $("#tab_home").live("mousedown", function () {
    var refresh;
    model.purgeOldTweetsFromTimeline("home");
    refresh = view.getCurrentFormName() === "home";
    view.showForm("home", false, function () {
      if (refresh) { APP.twitter.getHome(model); }
    });
  });

  $("#tab_mentions").live("mousedown", function () {
    var refresh;
    model.purgeOldTweetsFromTimeline("mentions");
    refresh = view.getCurrentFormName() === "mentions";
    view.showForm("mentions", false, function () {
      if (refresh) { APP.twitter.getMentions(model); }
    });
  });

  $("#tab_messages").live("mousedown", function () {
    var refresh;
    model.purgeOldTweetsFromTimeline("messages");
    refresh = view.getCurrentFormName() === "messages";
    view.showForm("messages", false, function () {
      if (refresh) { APP.twitter.getMessages(model); }
    });
  });

  $("#tab_search").live("mousedown", function () {
    view.showForm("search");
  });

  $("#tab_favorites").live("mousedown", function () {
    view.showForm("favorites");
    APP.twitter.getFavorites(model);
  });

  tooltip = function (tipText, element) {
    APP.UTILITY.popup("tip", tipText, element);
  };

  (function () {
    var timerId;
    $(".link").live("mouseenter mouseleave", function (e) {
      var link = $(this), href;
      if (e.type === "mouseenter" && $("#tip").length === 0) {
        timerId = setTimeout(function () {
          timerId = 0;
          href = link.attr("href");
          tooltip(model.links[href] || href, link);
        }, 300);
      }
      else if (e.type === "mouseleave") {
        if (timerId) { clearTimeout(timerId); }
        else { $("#tip").slideUp("fast", function () { $(this).remove(); }); }
      }
    });
  })();

  submitSearch = function (params) {
    if (params === undefined) {
      params = {};
    }
    params.q = $("#search_query").val();
    APP.twitter.search(model, params);
  };

  $("#search_button").live("mousedown", submitSearch);

  $("#search_query").live("keydown", function (e) {
    if (e.keyCode === 13) { submitSearch(); }
  });

  $(".hashtag").live("mousedown", function () {
    var query = $(this).text().replace("\uff03", "#");
    view.showForm("search", false, function () {
      $("#search_query").val(query);
      submitSearch();
    });
  });

  $(".screenname").live("mousedown", function () {
    APP.showUserParams = { model: model, view: view, showUserName: $(this).text().replace("\uff20", "@") };
    System.Gadget.Flyout.file = "showuser.html";
    System.Gadget.Flyout.show = true;
  });

  $(".tweet").live("mousedown", function () {
    var oldId = view.selected(),
        newId = $(this).attr("id");
    $(".tweet").removeClass("selected_tweet");
    view.selected(0);
    if (oldId !== newId) {
      $(this).addClass("selected_tweet");
      view.selected($(this).attr("id"));
    }
  });

  $("#container").live("chirp", function () {
    System.Sound.playSound("notify.wav");
  });

  $("#content:not(:text, textarea)").live("keydown", function (e) {
    var cKey = 67, tweet;
    if (e.ctrlKey && e.keyCode === cKey) {
      tweet = model.getTweet(view.selected());
      if (tweet) { window.clipboardData.setData("text", tweet.text); }
      return false;
    }
  });

  $("#content").live("selectstart", function () {
    // Kill selection of text in gadget
    return false;
  });

  $("#content").live("showStatus", function (e, status) {
    view.showStatus(status);
  });

  $("#content").live("commAccessing", function () {
    view.updateCommIndicator("accessing");
  });

  $("#content").live("commSuccess", function () {
    view.updateCommIndicator("success");
  });

  $("#content").live("commError", function () {
    view.updateCommIndicator("error");
  });

  $("#content").live("internalError", function () {
    view.updateCommIndicator("internal error");
  });

  $("#content").live("lockIndicator", function (e, locked) {
    view.lockIndicator(locked);
  });

  $(".inreplyto").live("mousedown", function () {
    var id = $(this).attr("name"),
        tweet = model.getTweet(id);
    if (tweet) { view.showStatusFlyout(tweet); }
    else {
      APP.twitter.getStatus(id, function (data) {
        var replyTweet = model.readTweet(data, "");
        view.showStatusFlyout(replyTweet);
      });
    }
  });

  $("#more").live("mousedown", function () {
    switch (view.getCurrentFormName()) {
      case "home": APP.twitter.getHome(model, true); break;
      case "mentions": APP.twitter.getMentions(model, true); break;
      case "messages": APP.twitter.getMessages(model, true); break;
      case "search": submitSearch({ max_id: model.oldestIdSearch }); break;
      default: return false;
    }
    $(this).empty().append($("<img>", { src: "images/waiting.gif" }));
  });

  switchStyleSheet = (function () {
    var index, styleSheet,
        styleSheets = ["css/original.css", "css/o2.css", "css/aqua.css", "css/white.css"];
    return function () {
      index = $.inArray(APP.settings.styleSheet(), styleSheets);
      styleSheet = styleSheets[(index + 1) % styleSheets.length];
      APP.settings.styleSheet(styleSheet);
      $("#style_sheet").loadStyleSheet(styleSheet);
    };
  })();

  $("#container").live("keydown", function (e) {
    var qKey = 81;
    if (e.ctrlKey && e.keyCode === qKey) {
      switchStyleSheet();
      return false;
    }
  });

  $(".tweet").live("mouseenter", function () {
    $(this).find(".unread").removeClass("unread").addClass("read");
    delete model.unread[this.id];
  });

  //  $("#container").live("keydown", function (e) {
  //    var pKey = 80;
  //    if (e.keyCode === pKey) {
  //      $("#content div.tweet:first").remove();
  //      $("#content div.tweet:first").remove();
  //      $("#content div.tweet:first").remove();
  //      model.fireUpdateEvent("homeUpdated");
  //      return false;
  //    }
  //  });

  $("#get_pin").live("click", function () {
    $("#pin_error").hide();
    APP.twitter.getPin(model.comm,
        function () { },
        function (x, t, e) { $("#pin_error").text(t).show(); });
    return false;
  });

  $("#pin_text").live("focus", function (e) {
    $(this).val("").removeClass("blur");
    $("#login").attr("disabled", "");
  });

  $("#login").live("click", function () {
    APP.twitter.getAccessToken(model.comm, $("#pin_text").find("input").val(), function (x, t, e) {
      $("#pin_error").text(t).show();
      return false;
    });
  });

  return that;
};

APP.run = function () {
  var view = APP.view(APP.model(APP.comm()));
  view.start();
};

// x-auth
// consider new tweet notification like chrome bird
// different action panels for different states (delete for your own tweets)
// localize
// popup send to list
// spell checker
// geolocation
// switch panels using left/right arrows
// more keyboard shortcuts
// twittpic
// search near you
// tooltips on panel
// twittlonger
// choose sounds
// Translate tweet (ctrl+T)
// Auto translate?
// indicate private account
// hide user icons option
// accessibility
// publish future tweets
// multiple replies
// tall tweets

// add unfavorites
// fix keyboard accelerators
// add help link
