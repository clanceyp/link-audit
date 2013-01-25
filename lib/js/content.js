"use strict";


var linkAudit = {
	ops:{
		ignoreHash:true
		,whitelist:[]
		,blacklist:["logout.action"]
	},
	content:{
		init:function(request, sender, sendResponse){
			if (request.action === "getLinkArray"){
				linkAudit.content.createUI();
				linkAudit.content.getLinkArray(request, sendResponse );
			}
		},
		getLinkArray:function(request, sendResponse){
			var linkArray = [],
				item = {},
				href = "",
				link,
				a = document.getElementsByTagName('a');

			for (var i = 0; i < a.length; i++){
				link = a[i];
				var id = linkAudit.content.addHrefAndReturnId(link, linkArray);
				if (id !== ""){
					$(link).addClass( id );
				}
			}

			sendResponse({
				"linkArray":linkArray
			})
		},
		addHrefAndReturnId:function(link,linkArray){
			var test = link.getAttribute("href"),
				whitelist = linkAudit.ops.whitelist,
				isWhitelist = true,
				blacklist = linkAudit.ops.blacklist,
				isBlacklist = false,
				href = (linkAudit.ops.ignoreHash === true) ? link.href.split("#")[0] : link.href;
			if (!test || test === "" || test.indexOf("#") === 0){
				return "";
			}
			if (whitelist.length){
				isWhitelist = false;
				for (var i = 0; i < whitelist.length ; i ++){
					if (href.match(whitlist[i])){
						isWhitelist = true;
						break;
					}
				}
			}
			if (isWhitelist === false){
				return "CE-linkAudit-notWhitelisted";
			}
			if (blacklist.length){
				for (var i = 0; i < blacklist.length ; i++){
					if (href.match(blacklist[i])){
						isBlacklist = true;
						break;
					}
				}
			}
			if (isBlacklist === true ){
				return "CE-linkAudit-blacklisted";
			}
			var item = _.find(linkArray, function(item){ return item.href === href });
			if (!item){
				item = {
					"id":createId()
					,"href":href
				}
				linkArray.push(item);
			}
			return item.id;

			function createId(){
				return "CE-linkAudit-"+ linkArray.length;
			};
		},
		createUI:function(){
			if ($('#CE-linkAuditDisplay').length === 0){
				$('body').append('<div id="CE-linkAuditDisplay">hello</div>')
			}
		},
		loadPreRequisites:function(){
			var script = document.createElement('script'),
				css = document.createElement('link');

			css.setAttribute("type","text/css");
			css.setAttribute("rel","STYLESHEET");
			css.setAttribute("href", chrome.extension.getURL("lib/css/link-audit.css") );
			document.getElementsByTagName("head")[0].appendChild( css );

			return true;
		}
	}
}


chrome.extension.onMessage.addListener(linkAudit.content.init);