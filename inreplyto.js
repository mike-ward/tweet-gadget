/// <reference path="jquery.js" />
/*jslint browser: true, windows: true */
/*global $: false, OAuth: false, jQuery: false, window: false */

$(function () {
  var parentWindow = System.Gadget.document.parentWindow;
  $("#style_sheet").attr("href", parentWindow.APP.settings.styleSheet());
  var tweet = parentWindow.APP.statusParams.tweet;
  $("#content").html(tweet).append("<button>" + parentWindow.APP.locale.showuser_close + "</button>");
  $("button").bind("click", function () { System.Gadget.Flyout.show = false; });
});