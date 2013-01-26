"use strict";


var linkAudit = {
	ops:{
		ignoreHash:true
        ,showStatusCode:false
		,whitelist:[]
		,blacklist:[]
	},
	content:{
        /**
         * Method, creates ui, gathers links on page
         * @id init
         * @param {Object} request
         * @param {Object} sender
         * @param {Object} sendResponse
         * @return void
         */
		init:function(request, sender, sendResponse){
            linkAudit.content.log('Recived request, request.action '+ request.action);
			if (request.action === "getLinkArray"){
				linkAudit.content.createUI();
                linkAudit.content.setOptions(request.options);
				linkAudit.content.getLinkArray(request, sendResponse );
			} else if (request.action === "updateDisplay"){
                linkAudit.content.updateDisplay(request);
                sendResponse({"message":"updated thanks"});
            }
		},
        /**
         * Method, sets content script options from background page
         * @id setOptions
         * @param {Object} options
         * @return void
         */
        setOptions:function(options){
            if (options){
                linkAudit.content.log('setting options');
                for (var item in options){
                    linkAudit.ops[item] = option[item];
                }
            }
        },
        /**
         * Method, gathers unique links on page and returns them to the background page for processing
         * @id getLinkArray
         * @param {Object} request
         * @param {Object} sendResponse
         * @return void
         */
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
					$(link).addClass( id).addClass("CE-linkAudit");
				}
			}
            linkAudit.content.log('Found '+ linkArray.length + ' links to validate');
			sendResponse({
                "action" : "validateLinks",
				"linkArray" : linkArray
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
                    ,"status":""
                    ,"httpStatusCode":0
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
                var baseStyles = document.createTextNode("a.CE-linkAudit{background-color:#cecece;color:#888;-webkit-transition-property: box-shadow, background-color;-webkit-transition-duration: 300ms, 300ms;-webkit-transition-timing-function: linear, linear;}");

                linkAudit.content.log('Adding display HTML');
                $("head").append('<style id="linkAuditStyleSheet" type="text/css" />');
                $('body').append('<div id="CE-linkAuditDisplay">hello</div>');
                document.getElementById("linkAuditStyleSheet").appendChild( baseStyles );
			}
		},
		loadPreRequisites:function(){
            linkAudit.content.log('loading pre-requisites');

			var script = document.createElement('script'),
				css = document.createElement('link');

			css.setAttribute("type","text/css");
			css.setAttribute("rel","STYLESHEET");
			css.setAttribute("href", chrome.extension.getURL("lib/css/link-audit.css") );
			document.getElementsByTagName("head")[0].appendChild( css );

			return true;
		},
        /**
         * Method, gets the current linksArray and updates the ui
         * @id updateDisplay
         * @param {Object} request
         * @return void
         */
        updateDisplay:function(linkArray){
            linkAudit.content.log("updating the display");
            linkAudit.content.log(linkArray);
            for (var i = 0; i < linkArray.length; i++){
                linkAudit.content.updateSingleLink( linkArray[i] );
            }
        },
        /**
         * Method, gets the current linksArray and updates the ui
         * @id updateDisplay
         * @param {Object} request
         * @return void
         */
        updateSingleLink:function(link){
            linkAudit.content.log("update single link");
            linkAudit.content.log(link);

            var colour = {"success":["#080","#fff"],"failed":["#800","#fff"],"unknown":["#ff0","#000"]},
                style = document.createTextNode("a."+ link.id +" {background: "+ colour[link.status][0] +" !important; color: "+ colour[link.status][1] +" !important;}"),
                status = document.createTextNode("a."+ link.id +":after {content:' ("+ link.httpStatusCode +")'}"),
                linkAuditStyleSheet = document.getElementById("linkAuditStyleSheet");

            linkAuditStyleSheet.appendChild(style);
            if (linkAudit.ops.showStatusCode){
                linkAuditStyleSheet.appendChild(status);
            }
        },
        log:function(message){
            if (DEBUG){
                console.log(message);
            }
        },
        /**
         * Method, onmessage event listener
         * @id onMessage
         * @param {Object} request
         * @return void
         */
        onMessage:function(request){
            if (request.action === "update-display"){
                linkAudit.content.updateDisplay(request.linkArray);
            } else if (request.action === "update-single-link"){
                linkAudit.content.updateSingleLink(request.link);
            }
        }
	}
}


chrome.extension.onRequest.addListener(linkAudit.content.init);
chrome.extension.onMessage.addListener(linkAudit.content.onMessage);