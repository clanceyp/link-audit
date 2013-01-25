"use strict";




chrome.browserAction.onClicked.addListener(function (tab) {

	//chrome.tabs.executeScript(tab.id, {}, function (){
console.log('browserAction clicked ');
		var blacklist = linkAudit.getLocalStore("blacklist"),
			whitelist = linkAudit.getLocalStore("whitelist");

		chrome.tabs.sendMessage(tab.id, {
			"action":"getLinkArray"
			,"blacklist":blacklist
			,"whitelist":whitelist
		}, linkAudit.validateLinkSet);

	//});
})

var linkAudit = {
	validateLinkSet:function(ops){
		console.log(ops);
	},
	getLocalStore:function(key, def){
		var value = window.localStorage.getItem(key);
		if (value === null && def){
			value = def;
		}
		if (value === null && DEFAULTS && DEFAULTS[key]){
			value = DEFAULTS[key];
		}
		return value;
	},
	setLocalStore:function(key, value){
		window.localStorage.setItem(key, value);
	}
}
chrome.extension.onMessage.addListener(linkAudit.onMessage);