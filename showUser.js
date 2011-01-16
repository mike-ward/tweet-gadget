/// <reference path="jquery.js" />
/*jslint browser: true, windows: true */
/*global $: false, OAuth: false, jQuery: false, window: false */

String.prototype.format = function () {
  var pattern = /\{\d+\}/g;
  var args = arguments;
  return this.replace(pattern, function (capture) { return args[capture.match(/\d+/)]; });
};

Number.prototype.prettyNumber = function () {
  return $.format(+this, "n0");
};

var USER = {};
USER.isFollowing = false;

USER.followText = function (yes, is_protected) {
  var locale = System.Gadget.document.parentWindow.APP.locale;
  return yes ? locale.showuser_yes : is_protected ? locale.showuser_protected : locale.showuser_no;
};

USER.friendship = function (screen_name, is_protected) {
  $.get("http://twitter.com/friendships/show.json",
    { "target_screen_name": screen_name, source_screen_name: System.Gadget.document.parentWindow.APP.settings.username() },
    function (data) {
      var locale = System.Gadget.document.parentWindow.APP.locale;
      $("#waiting").css("visibility", "hidden");
      USER.isFollowing = data.relationship.source.following;
      $("#following").text(USER.followText(USER.isFollowing, is_protected)).attr("title",
        USER.isFollowing ? locale.showuser_unfollow : is_protected ? locale.showuser_protected : locale.showuser_follow);
      $("#follower").text(USER.followText(data.relationship.source.followed_by));
    });
};

USER.rateField = function (label, data) {
  return $("<div>").append($("<span>", { text: label, "class": "label" }), ($("<span>", { text: data, "class": "right" })));
};

USER.rateLimitStatus = function (userName) {
  $("#following").parent().css("display", "none");
  var div = $("#follower").parent().empty();
  var parentWindow = System.Gadget.document.parentWindow;
  parentWindow.APP.showUserParams.model.comm.get("http://twitter.com/account/rate_limit_status.json", null, function (data) {
    var locale = System.Gadget.document.parentWindow.APP.locale;
    var limit = USER.rateField(locale.showuser_hourly_limit, data.hourly_limit.prettyNumber());
    var remaining = USER.rateField(locale.showuser_remaining, data.remaining_hits.prettyNumber());
    var reset = USER.rateField(locale.showuser_reset, USER.minutesRemaining(data.reset_time_in_seconds)).append(" " + locale.showuser_minutes);
    div.append(limit, remaining, reset);
  });
};

USER.minutesRemaining = function (seconds) {
  var start = new Date().getTime();
  var end = new Date(seconds * 1000).getTime();
  var expires = new Date(end - start);
  return expires.getMinutes().toString();
};

USER.localize = function (locale) {
  $("#followers_label").text(locale.showuser_followers);
  $("#friends_label").text(locale.showuser_friends);
  $("#tweets_label").text(locale.showuser_tweets);
  $("#following_label").text(locale.showuser_following);
  $("#followed_by_label").text(locale.showuser_followed_by);
  $("#message").text(locale.showuser_message);
  $("#close").text(locale.showuser_close);
};

$(function () {
  var parentWindow = System.Gadget.document.parentWindow;
  $("#style_sheet").attr("href", parentWindow.APP.settings.styleSheet());
  var screenName = parentWindow.APP.showUserParams.showUserName.replace("@", "");
  var userName = parentWindow.APP.settings.username();
  USER.localize(parentWindow.APP.locale);
  parentWindow.APP.twitter.getUserInfo(screenName, function (user) {
    $("#info").html(
      "<b>" + user.name + "</b> - <i>" + (user.location || "no location specified") + "</i><br/>" +
      (user.description || "no description specified"));
    $("#userUrl").html((user.url) ? ("<a href='" + user.url + "'>" + user.url + "</a>") : "no link specified");
    $("#pic").attr("src", user.profile_image_url);
    $("#followers").text(user.followers_count.prettyNumber());
    $("#friends").text(user.friends_count.prettyNumber());
    $("#tweets").text(user.statuses_count.prettyNumber());
    var homePage = "http://twitter.com/" + screenName;
    $("#homepage").attr("href", homePage).text(homePage);
    $("#message").click(function () {
      parentWindow.APP.showUserParams.view.edit.show("msg_button", { screen_name: "@" + screenName });
      System.Gadget.Flyout.show = false;
    });
    if (screenName != userName) { USER.friendship(screenName, user["protected"]); }
    else { USER.rateLimitStatus(); }
  },
  function (xhr, status) {
    var json = $.parseJSON(xhr.responseText);
    $("#content").empty().append(json.error);
  });

  $("#close").bind("click", function (e) {
    System.Gadget.Flyout.show = false;
  });

  $("#following").live("click", function () {
    $("#waiting").css("visibility", "visible");
    var friendship = (USER.isFollowing) ?
      parentWindow.APP.twitter.deleteFriendship :
      parentWindow.APP.twitter.createFriendship;
    friendship(parentWindow.APP.showUserParams.model, screenName, function () {
      USER.friendship(screenName);
    });
  });
});
