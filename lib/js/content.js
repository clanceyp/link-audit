"use strict";


var linkAudit = {
	linkArray:[],
	ops:{
		ignoreHash:true
        ,showStatusCode:false
        ,showInfoInTitle:true
        ,validateDomainOnly:false
		,whitelist:[]
		,blacklist:[]
		,className:"CE-linkAudit"
        ,contentSearch:false
        ,colour:{
            "success":["#080","#fff"]
            ,"failed":["#800","#fff"]
            ,"unknown":["#ff0","#000"]
            ,"content-match":["#f00","#000"]
            ,"pending":["#cecece","#888"]
        }
		,displayHeight:50
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
					$(link).addClass( id ).addClass(linkAudit.ops.className);
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
			var path = link.getAttribute("href"),
				whitelist = linkAudit.ops.whitelist,
				isWhitelist = true,
				blacklist = linkAudit.ops.blacklist,
				isBlacklist = false,
				href = (linkAudit.ops.ignoreHash === true) ? link.href.split("#")[0] : link.href;

			if (!path || path === "" || path.indexOf("#") === 0 || link.href.substring(0,4) !== "http"){
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
					,"path":path
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
                    baseStyles = document.createTextNode("a."+linkAudit.ops.className+"{background-color:"+bg+"!important;color:"+linkAudit.ops.colour["pending"][1]+";}#CE-linkAuditDisplay-status span.success{background-color:"+ linkAudit.ops.colour["success"][0] +";}#CE-linkAuditDisplay-status span.failed{background-color:"+ linkAudit.ops.colour["failed"][0] +";}#CE-linkAuditDisplay-status span.matched{background-color:"+ linkAudit.ops.colour["content-match"][0] +";}#CE-linkAuditDisplay-status span.unknown{background-color:"+ linkAudit.ops.colour["unknown"][0] +";}#CE-linkAuditDisplay-status span.pending{background-color:"+ bg +";}");

				linkAudit.content.log('Adding display HTML');
				if ($("#CE-linkAuditStyleSheet").length){
					$("#CE-linkAuditStyleSheet").remove();
				}
                $("head").append('<style id="CE-linkAuditStyleSheet" type="text/css" />');
                $('body').append('<aside id="CE-linkAuditDisplay"><span class="close">x</span><h2>Link Audit</h2><div id="CE-linkAuditDisplay-status"></div><input type="button" value="show audit"/><div id="CE-linkAuditDisplay-details-wrapper"><table id="CE-linkAuditDisplay-details"></table></div></aside>');
				$("#CE-linkAuditDisplay").drag("h2");
				$("#CE-linkAuditDisplay span.close").on("click",linkAudit.content.clean);
				$("#CE-linkAuditDisplay input").on("click",linkAudit.content.showAudit);
                document.getElementById("CE-linkAuditStyleSheet").appendChild( baseStyles );
				$("#CE-linkAuditDisplay-status").css({"height":linkAudit.ops.displayHeight+"px"});
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
			linkAudit.linkArray = linkArray;

            var total = linkArray.length,
                pending = _.filter(linkArray, function(link){return link.httpStatusCode === -1;}).length,
				success = _.filter(linkArray, function(link){return (link.httpStatusCode > 199 && link.httpStatusCode < 400 && link.status !=="content-match");}).length,
                failed = _.filter(linkArray, function(link){return link.status === "failed";}).length,
                matched = _.filter(linkArray, function(link){return link.status === "content-match";}).length,
                colLength = (linkAudit.ops.contentSearch) ? 4 : 3,
				cols = ["success","failed","matched","pending"],
				spans = $("#CE-linkAuditDisplay-status span"),
				displayHeight = linkAudit.ops.displayHeight,
				zoom = 100/linkArray.length;

            if (spans.length == 0){
                for (var i = 0; i < cols.length; i++){
                    $("#CE-linkAuditDisplay-status").append('<span class="'+ cols[i] +'"></span>');
                }
                $("#CE-linkAuditDisplay-status").addClass("CE-linkAudit-cols-"+colLength);
				if (colLength === 3){
					$("#CE-linkAuditDisplay-status span.matched").css('display','none');
				}
				spans = $("#CE-linkAuditDisplay-status span");
			}
			spans.eq(0).css('height',(displayHeight/100*success) * zoom ).html(success);
			spans.eq(1).css('height',(displayHeight/100*failed) * zoom ).html(failed);
			spans.eq(2).css('height',(displayHeight/100*matched) * zoom ).html(matched);
			spans.eq(3).css('height',(displayHeight/100*pending) * zoom ).html(pending);

			if (pending === 0){
				$("#CE-linkAuditDisplay").addClass("complete");
			}
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
                style = document.createTextNode("a."+ link.id +" {background-color:"+bg+"!important; color: "+ linkAudit.ops.colour[status][1] +" !important;}"),
                httpStatusCode = document.createTextNode("a."+ link.id +":after {content:' ("+ link.httpStatusCode +")'}"),
                linkAuditStyleSheet = document.getElementById("CE-linkAuditStyleSheet");

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
        },
		/**
		 * Method, removes styles and other stuff added to the UI
		 * @id clean
		 * @return void
		 */
		clean:function(){
			for (var i = 0,link; i<linkAudit.linkArray.length; i++){
				link = linkAudit.linkArray[i];
				$("a."+ link.id).removeClass(link.id);
			}
			$("a."+ linkAudit.ops.className).removeClass(linkAudit.ops.className);
			$("#CE-linkAuditDisplay").animate({opacity: 0}, 400);
			setTimeout(function(){
				// waite for all a while and remove style sheet
				$("#CE-linkAuditStyleSheet").remove();
				$("#CE-linkAuditDisplay").remove();
			},500);

		},
		/**
		 * Method, displays the results to screen
		 * @id showAudit
		 * @return void
		 */
		showAudit:function(){
			var html = "",
				linkArray = _.sortBy(linkAudit.linkArray,function(link){ return link.status })
			for (var i = 0,link,path; i<linkArray.length; i++){
				link = linkArray[i];
				path = (link.path.length > 20) ? "..." + link.path.substring( link.path.length - 20 , link.path.length) : link.path ;
				html+= '<tr class="'+link.status+'"><td>'+link.status+'</td><td><a target="_blank" href="'+ link.href +'" title="'+ link.href +'"> '+ path +' ('+link.httpStatusCode+')</a></td></tr>';
			}
			$("#CE-linkAuditDisplay").animate({
				"width":$("#CE-linkAuditDisplay").offset().width + 50,
				"left":$("#CE-linkAuditDisplay").offset().left - 50
			},{complete:function(){
				$("#CE-linkAuditDisplay-details").html(html);
			}})
		}

	}
}


chrome.extension.onRequest.addListener(linkAudit.content.init);
chrome.extension.onMessage.addListener(linkAudit.content.onMessage);