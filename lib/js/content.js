"use strict";


var linkAudit = {
	ops:{
		ignoreHash:true
        ,showStatusCode:false
        ,showInfoInTitle:true
        ,validateDomainOnly:false
		,whitelist:[]
		,blacklist:[]
        ,colour:{
            "success":["#080","#fff"]
            ,"failed":["#800","#fff"]
            ,"unknown":["#ff0","#000"]
            ,"content-match":["#f00","#000"]
            ,"pending":["#cecece","#888"]
        }
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
                    linkAudit.content.log(item + '='+ options[item]);
                    linkAudit.ops[item] = options[item];
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
					$(link).addClass( id ).addClass("CE-linkAudit");
				}
			}
            linkAudit.content.log('Found '+ linkArray.length + ' links to validate');
			sendResponse({
                "action" : "validateLinks",
				"linkArray" : linkArray
			})
		},
        /**
         * Method, checks link href and if unique adds to array and returns the ID
         * @id addHrefAndReturnId
         * @param {Object} link
         * @param {Array} linkArray
         * @return string
         */
		addHrefAndReturnId:function(link,linkArray){
			var test = link.getAttribute("href"),
				whitelist = linkAudit.ops.whitelist,
				isWhitelist = true,
				blacklist = linkAudit.ops.blacklist,
				isBlacklist = false,
				href = (linkAudit.ops.ignoreHash === true) ? link.href.split("#")[0] : link.href;

			if (!test || test === "" || test.indexOf("#") === 0 || link.href.substring(0,4) !== "http"){
                linkAudit.content.log('not valid href '+ link.href.substring(0,4));
				return "";
			}
            if (linkAudit.ops.validateDomainOnly && !link.href.match(location.hostname)){
                //TODO do this check properly
                linkAudit.content.log('not current domain');
                return "";
            }
			if (whitelist.length){
				isWhitelist = false;
                linkAudit.content.log('whitelist');
				for (var i = 0; i < whitelist.length ; i ++){
                    linkAudit.content.log(href +" - "+ whitelist[i]);
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
                linkAudit.content.log('Blacklist');
				for (var i = 0; i < blacklist.length ; i++){
                    linkAudit.content.log(href +" - "+ blacklist[i]);
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
                    ,"httpStatusCode":-1
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

                var bg = linkAudit.ops.colour["pending"][0],
                    baseStyles = document.createTextNode("a.CE-linkAudit{background-image:-webkit-linear-gradient(top, "+ bg +", "+ bg +")!important;background-color:"+bg+"!important;color:"+linkAudit.ops.colour["pending"][1]+";}");

                linkAudit.content.log('Adding display HTML');
                $("head").append('<style id="linkAuditStyleSheet" type="text/css" />');
                $('body').append('<aside id="CE-linkAuditDisplay"><h2>Link Audit</h2><div id="CE-linkAuditDisplay-status"></div><input type="button" value="show audit"/><table id="CE-linkAuditDisplay-details"></table></aside>');
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

            var total = linkArray.length,
                queued = _.filter(linkArray, function(link){return link.httpStatusCode === -1;}).length,
                okay = _.filter(linkArray, function(link){return (link.httpStatusCode > 199 && link.httpStatusCode < 400);}).length,
                failed = _.filter(linkArray, function(link){return link.status === "failed";}).length,
                contentMatched = _.filter(linkArray, function(link){return link.status === "content-match";}).length;


            if ($("#CE-linkAuditDisplay-status span").length == 0){
                for (var i = 0; i < 4; i++){
                    $("#CE-linkAuditDisplay-status").append("<span />");
                }
            }
            $("#CE-linkAuditDisplay-status span").eq(0).text(total);
            $("#CE-linkAuditDisplay-status span").eq(1).text(queued);
            $("#CE-linkAuditDisplay-status span").eq(2).text(okay);
            $("#CE-linkAuditDisplay-status span").eq(3).text(contentMatched);
            //for (var i = 0; i < linkArray.length; i++){
                //linkAudit.content.updateSingleLink( linkArray[i] );
            //}
        },
        /**
         * Method, gets the current updates a single link item (may be mapped to multiple a tags)
         * @id updateSingleLink
         * @param {Object} request
         * @return void
         */
        updateSingleLink:function(link){
            linkAudit.content.log("update single link");
            linkAudit.content.log(link);

            var status = link.status || "unknown",
                bg = linkAudit.ops.colour[ status ][0],
                style = document.createTextNode("a."+ link.id +" {background-image:-webkit-linear-gradient(top, "+ bg +", "+ bg +")!important;background-color:"+bg+"!important; color: "+ linkAudit.ops.colour[status][1] +" !important;}"),
                httpStatusCode = document.createTextNode("a."+ link.id +":after {content:' ("+ link.httpStatusCode +")'}"),
                linkAuditStyleSheet = document.getElementById("linkAuditStyleSheet");

            linkAuditStyleSheet.appendChild(style);
            if (linkAudit.ops.showStatusCode){
                linkAuditStyleSheet.appendChild(httpStatusCode);
            }
            if (linkAudit.ops.showInfoInTitle){
                var message = (link.contentMatch === false) ? status + " " + link.httpStatusCode : "content found - "+ link.contentMatch ;
                $("a."+ link.id).attr("title","linkAudit status: "+ message);
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