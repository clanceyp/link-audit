"use strict";


var linkAudit = {
    linkArray:[],
    ctx:null,
    ctxColumnLength:0,
    ctxPendingHeight:ctxHEIGHT-20,
    ctxErrorHeight:10,
    ctxSuccessHeight:10,
    ctxMatchedHeight:10,
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
            ,"content-match":["rgba(255,204,0,1)","#000"]
            ,"pending":["#cecece","#888"]
        }
        ,displayHeight:ctxHEIGHT
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
                linkAudit.content.setOptions(request.options);
                linkAudit.content.createUI();
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
                if (linkAudit.ops["contentSearch"] == true){
                    linkAudit.ctxColumnLength = 3;
                } else {
                    linkAudit.ctxColumnLength = 2;
                }
                linkAudit.content.log('linkAudit.ctxColumnLength '+ linkAudit.ctxColumnLength)
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
                return "";
            }
            if (linkAudit.ops.validateDomainOnly && !link.href.match(location.hostname)){
                //TODO do this check properly
                linkAudit.content.log('not current domain');
                return "";
            }

            //linkAudit.content.log('blacklist: ' + blacklist.length);
            //linkAudit.content.log('white list: '+ whitelist.length);

            if (whitelist.length){
                isWhitelist = false;
                for (var i = 0; i < whitelist.length ; i ++){
                    if (href.match(whitelist[i])){
                        isWhitelist = true;
                        break;
                    }
                }
            }
            if (isWhitelist === false){
                linkAudit.content.log("Not in white list: " + href);
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
                linkAudit.content.log("blacklisted: " + href);
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
            if ($("#CE-linkAuditDisplay-status span").length){
                $("#CE-linkAuditDisplay-status").empty();
            }
            if ($('#CE-linkAuditDisplay').length === 0){

                var bg = linkAudit.ops.colour["pending"][0],
                    baseStyles = document.createTextNode("a."+linkAudit.ops.className+"{background-color:"+bg+"!important;color:"+linkAudit.ops.colour["pending"][1]+";}#CE-linkAuditDisplay-status span.success{background-color:"+ linkAudit.ops.colour["success"][0] +";}#CE-linkAuditDisplay-status span.failed{background-color:"+ linkAudit.ops.colour["failed"][0] +";}#CE-linkAuditDisplay-status span.matched{background-color:"+ linkAudit.ops.colour["content-match"][0] +";}#CE-linkAuditDisplay-status span.unknown{background-color:"+ linkAudit.ops.colour["unknown"][0] +";}#CE-linkAuditDisplay-status span.pending{background-color:"+ bg +";}");

                linkAudit.content.log('Adding display HTML');
                if ($("#CE-linkAuditStyleSheet").length){
                    $("#CE-linkAuditStyleSheet").remove();
                }
                $("head").append('<style id="CE-linkAuditStyleSheet" type="text/css" />');
                $('body').append('<aside id="CE-linkAuditDisplay"><span class="close">x</span><h2>Link Audit</h2><div id="CE-linkAuditDisplay-status"><canvas id="CE-linkAuditDisplayCanvas" width="'+ctxWIDTH+'" height="'+ctxHEIGHT+'"></canvas></div><input type="button" value="toggle audit"/><div id="CE-linkAuditDisplay-details-wrapper"><table id="CE-linkAuditDisplay-details"></table></div></aside>');
                $("#CE-linkAuditDisplay").drag("h2");
                $("#CE-linkAuditDisplay span.close").on("click",linkAudit.content.terminate);
                $("#CE-linkAuditDisplay input").on("click",linkAudit.content.showAudit);
                document.getElementById("CE-linkAuditStyleSheet").appendChild( baseStyles );
                //$("#CE-linkAuditDisplay-status").css({"height":linkAudit.ops.displayHeight+"px"});

                linkAudit.content.ctxInit();
            } else {
                $("#CE-linkAuditDisplay").removeClass("complete");
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
            //cols = ["success","failed","matched","pending"],
            //spans = $("#CE-linkAuditDisplay-status span"),
                displayHeight = linkAudit.ops.displayHeight - 20,
                zoom = 100/linkArray.length;

            linkAudit.ctxErrorHeight = (displayHeight/100*failed ) * zoom ;
            linkAudit.ctxSuccessHeight = (displayHeight/100*success) * zoom;
            linkAudit.ctxMatchedHeight = (displayHeight/100*matched) * zoom ;
            linkAudit.ctxPendingHeight = (displayHeight/100*pending) * zoom ;

            linkAudit.content.reDraw();

			chrome.extension.sendMessage({
					action: "updateBadge"
					,rH : (14/100*failed ) * zoom
					,gH : (14/100*success) * zoom
					,oH : (14/100*matched) * zoom
					,pending : pending
				}
			);


            /*
             if (spans.length == 0){
             for (var i = 0; i < cols.length; i++){
             $("#CE-linkAuditDisplay-status").append('<span class="'+ cols[i] +'"></span>');
             }
             $("#CE-linkAuditDisplay-status").removeClass('CE-linkAudit-cols-3').removeClass('CE-linkAudit-cols-4').addClass("CE-linkAudit-cols-"+colLength);
             if (colLength === 3){
             $("#CE-linkAuditDisplay-status span.matched").css('display','none');
             }
             spans = $("#CE-linkAuditDisplay-status span");
             }
             spans.eq(0).css('height',(displayHeight/100*success) * zoom ).html(success);
             spans.eq(1).css('height',(displayHeight/100*failed ) * zoom ).html(failed);
             spans.eq(2).css('height',(displayHeight/100*matched) * zoom ).html(matched);
             spans.eq(3).css('height',(displayHeight/100*pending) * zoom ).html(pending);
             */
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
            if (linkAudit.ops.showStatusCode == "true"){
                linkAuditStyleSheet.appendChild(httpStatusCode);
            }
            if (linkAudit.ops.showInfoInTitle){
                var message = status + " " + link.httpStatusCode ;
				if (link.reason){
					message = link.reason;
				} else if (link.contentMatch === true){
					message = "content found - "+ link.contentMatch ;
				}
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
				linkAudit.content.updateDisplay(request.linkArray)
            }
        },
        /**
         * Method, try and stop audit if possible
         * @id terminate
         * @return void
         */
        terminate:function(){
            linkAudit.content.clean();
            chrome.extension.sendMessage({action: "terminate"});
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
            if ($("#CE-linkAuditDisplay-details").hasClass('open')){
                linkAudit.content.log('close table');
                $("#CE-linkAuditDisplay-details").empty().removeClass('open');
            } else {
				$("#CE-linkAuditDisplay-details").addClass('open');
                linkAudit.content.updateAuditTable(true);
            }
        },
		/**
		 * Method, updates the audit table with the latest
		 * @id updateAuditTable
		 * @return void
		 */
		updateAuditTable:function(init){
			var tableId = 'CE-linkAuditDisplay-details';
			if (!$("#"+ tableId).hasClass('open')){
				return;
			}
			var success = _.filter(linkAudit.linkArray, function(link){return (link.httpStatusCode > 199 && link.httpStatusCode < 400 && link.status !=="content-match");}).length,
				failed = _.filter(linkAudit.linkArray, function(link){return link.status === "failed";}).length,
				matched = _.filter(linkAudit.linkArray, function(link){return link.status === "content-match";}).length,
				todo = _.filter(linkAudit.linkArray, function(link){return link.status === "content-match";}).length,
				mMessage = (matched > 0) ? ", matched "+ matched : "",
				totals = 'Total: '+ linkAudit.linkArray.length +', okay '+ success +', failed '+failed +  mMessage,
				html = '',
				sortedArray = _.sortBy(linkAudit.linkArray,function(link){ return link.status })

			if (init){
				$("#"+tableId).empty();
				html = '<tr><td colspan="2" id="'+tableId+'-totals">'+ totals +'</td></tr>';
				for (var i = 0,link,path,status; i<sortedArray.length; i++){
					link = sortedArray[i];
					path = (link.path.length > 20) ? "..." + link.path.substring( link.path.length - 20 , link.path.length) : link.path ;
					status = link.status || "pending";
					html+= '<tr id="CE-linkAudit-TR-'+ link.id +'" class="CE-linkAudit-status-'+link.status+'"><td>'+ status +'</td><td><a target="_blank" href="'+ link.href +'" title="'+ link.href +'"> '+ path +' ('+link.httpStatusCode+')</a></td></tr>';
				}
				$("#"+tableId).html(html);
			} else if ($("#"+tableId+" tr").length < linkAudit.linkArray.length){ // more links have been added update the display
				return linkAudit.content.updateAuditTable(true);
			} else {
				$("#"+tableId+"-totals").text(totals);
				for (var i = 0; i< linkAudit.linkArray.length; i++){
					var link =  linkAudit.linkArray[i],
						id = link.id,
						ref = $("#CE-linkAudit-TR-"+ link.id),
						loggedStatus = $(ref).attr('class'),
						path = (link.path.length > 20) ? "..." + link.path.substring( link.path.length - 20 , link.path.length) : link.path ,
						reason = link.reason;
					if (loggedStatus !== "CE-linkAudit-status-"+link.status){
						$(ref).attr('class',"CE-linkAudit-status-"+link.status).children("td:nth-child(1)").text( link.status).attr('title',reason);
						$(ref).find("td a").text( path +' ('+link.httpStatusCode+')' );
					}
				}
			}
			// keep checking until audit is closed
			setTimeout(function(){
				linkAudit.content.updateAuditTable();
			},1000)
		},/**
         * Method, adds roundRect method to
         * @id drawBox
         * @param {Object} ctx
         * @param {Int} x start
         * @param {Int} y start
         * @param {Int} width
         * @param {Int} height
         * @param {Int} radius, applied to all corners
         * @param {Array} radius, clockwise from top left [10, 10, 0, 0]
         * @param {Object} radius, hash table {"topRight":20}
         * @param {Boolean} fill
         * @param {Boolean} stroke
         * @param {String} fillStyle, colour for fill
         * @return void
         */
        drawBox:function(ctx, x, y, width, height, radius, fill, stroke, fillStyle){
            ctx.fillStyle = fillStyle || "rgba(200,200,200,0.3)";
            ctx.roundRect(x, y, width, height, radius, fill, stroke);
        },
        /**
         * Method to draw the process bar
         * @id reDraw
         * @return void
         *
         * */
        reDraw:function(setup){
            var ctx = linkAudit.ctx,
                maxHeight = ctxHEIGHT - 10,
                opacity = (setup) ? "0.5":"1";

            ctx.clearRect(0, 0, ctxWIDTH, ctxHEIGHT);

            ctx.save();
            ctx.roundRect(0, 0, ctxWIDTH, ctxHEIGHT, 10, true, false);
            ctx.fillStyle = "rgba(50,50,50,0.7)";
            ctx.fill();
            ctx.restore();





            // total
            if (linkAudit.ctxPendingHeight > 0){
                ctx.save();
                linkAudit.content.drawBox(ctx, 10, (ctxHEIGHT-linkAudit.ctxPendingHeight-10), (ctxWIDTH-20), (linkAudit.ctxPendingHeight), 5, true, false, "rgba(80,80,80,0.6)");
                ctx.restore();
            } else {
                ctx.save();
                linkAudit.content.drawBox(ctx, 10, (ctxHEIGHT-10), (ctxWIDTH-20), 4, 2, true, false, "rgba(80,80,80,0.6)");
                ctx.restore();
            }



            // error
            if (linkAudit.ctxErrorHeight > 0){
                ctx.save();
                linkAudit.content.drawBox(ctx
                    , 5 + (5*linkAudit.ctxColumnLength)
                    , (ctxHEIGHT-linkAudit.ctxErrorHeight-10)
                    , linkAudit.ctxColumnWidth
                    , (linkAudit.ctxErrorHeight)
                    , [2,2,0,0], true, false, "rgba(255, 0, 0, "+opacity+")");
                ctx.restore();
            }


            // okay
            if (linkAudit.ctxSuccessHeight > 0){
                ctx.save();
                linkAudit.content.drawBox(ctx
                    , (linkAudit.ctxColumnWidth) + (10*linkAudit.ctxColumnLength)         // x
                    , (ctxHEIGHT-linkAudit.ctxSuccessHeight-10) // y
                    , linkAudit.ctxColumnWidth+5                // width
                    , (linkAudit.ctxSuccessHeight)              // height
                    , [2,2,0,0], true, false,  "rgba(0,255,0,"+opacity+")");
                ctx.restore();
            }

            // conten-matched
            if (linkAudit.ctxColumnLength === 3){
                if (linkAudit.ctxMatchedHeight > 0){
                    ctx.save();
                    linkAudit.content.drawBox(ctx
                        , (linkAudit.ctxColumnWidth*2) + (43) // don't ask!
                        , (ctxHEIGHT-linkAudit.ctxMatchedHeight-10)
                        , linkAudit.ctxColumnWidth
                        , (linkAudit.ctxMatchedHeight)
                        , [2,2,0,0], true, false, "rgba(255,204,0,"+opacity+")");
                    ctx.restore();
                }
            }



        },

        /**
         * Method to draw the process bar initial state
         * @id ctxInit
         * @return void
         *
         * */
        ctxInit:function(){
            var ctx;
            linkAudit.ctx = ctx = document.getElementById('CE-linkAuditDisplayCanvas').getContext('2d');
            linkAudit.ctxColumnWidth = (ctxWIDTH - (20*linkAudit.ctxColumnLength)) / linkAudit.ctxColumnLength ;

            ctx.clearRect(0, 0, ctxWIDTH, ctxHEIGHT);

            linkAudit.content.reDraw(true);

            }
        }
    }


    chrome.extension.onRequest.addListener(linkAudit.content.init);
    chrome.extension.onMessage.addListener(linkAudit.content.onMessage);


