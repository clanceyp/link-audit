"use strict";

Array.prototype.trimValues = function(){
    for(var i = 0; i < this.length; i++){
        if (typeof this[i] === "string"){
            this[i] = this[i].trim();
        }
    }
    return _.filter(this, function(item){ return item !== ""; });
}


	chrome.browserAction.onClicked.addListener(function (tab) {
		linkAudit.log('atempting check');
		chrome.tabs.executeScript(tab.id, {code:'if(!window.linkAudit){alert("Please reload the page to run Link Audit")}'})
	});
	chrome.browserAction.onClicked.addListener(function (tab) {

	//chrome.tabs.executeScript(tab.id, {}, function (){
	//chrome.tabs.executeScript(tab.id, {code:'if(linkAudit){alert(1234)}else{987654}'})
		linkAudit.log('browserAction clicked ');
		var blacklist = linkAudit.toArray("blacklist"),
			whitelist = linkAudit.toArray("whitelist"),
            contentSearch = (linkAudit.toArray("contentStrings").length && linkAudit.getLocalStore("checkType") === "GET");

		linkAudit.isTerminated = false; // reset this var

        if (linkAudit.linkArray.length && _.filter(linkAudit.linkArray, function(link){return link.httpStatusCode === -1;}).length){
            linkAudit.log("There is an active process, sorry :-| ");
            linkAudit.log('pending: '+ _.filter(linkAudit.linkArray, function(link){return link.httpStatusCode === -1;}).length);
        } else {

            chrome.tabs.sendRequest(tab.id, {
                "action":"getLinkArray"
                ,"options":{
                    "blacklist":blacklist
                    ,"whitelist":whitelist
                    ,"contentSearch":contentSearch
                    ,"showStatusCode":linkAudit.getLocalStore("showStatusCode")
                    ,"validateDomainOnly":linkAudit.getLocalStore("validateDomainOnly")
                }
            }, function(response){
                linkAudit.log('received response');
                //linkAudit.log(response.action);
                if (response && response.action === "validateLinks"){
                    linkAudit.contentStrings = linkAudit.toArray("contentStrings");
                    linkAudit.linkArray = response.linkArray;
                    linkAudit.currentTabId = tab.id;
                    linkAudit.validateLinks(  );
                }
            });
        }

	//});
})

var linkAudit = {
    linkArray:[],
    currentTabId:null,
    contentStrings:[],
    contentRegExp:[],
    updateUIDisplaySoon:null,
	linkXmlHTTPRequestArray:[],
	isTerminated:false,
    toArray:function(key){
        var value = linkAudit.getLocalStore(key),
            array = [];
        if (value && value.length){
			array = value.trim().split("\n");
		}
		if (array.length){
			array = array.trimValues();
        }
        return array;
    },
    /**
     * Method, gets local store value, or DEFAULT value if set
     * @id getLocalStore
     * @param {String} key
     * @param {Object} def, optional default value if no value set
     * @return void
     */
	getLocalStore:function(key, def){
		var value = window.localStorage.getItem(key);
		if (value === null && def){
			value = def;
		}
		if (value === null && DEFAULTS  && typeof DEFAULTS[key] !== "undefined"){
			value = DEFAULTS[key];
		}
		return value;
	},
	setLocalStore:function(key, value){
		window.localStorage.setItem(key, value);
	},
    clearLocalStore:function(){
        window.localStorage.clear();
    },
    onMessage:function(message){
        linkAudit.log(message);
        if (message.action === "validateLinks"){
            linkAudit.contentStrings = linkAudit.toArray("contentStrings");
            linkAudit.linkArray = message.linkArray;
            linkAudit.validateLinks(  );
        } else if (message.action === "terminate"){
            linkAudit.abortRequests();
			linkAudit.updateBadge();
			linkAudit.isTerminated = true;
        } else if (message.action === "updateBadge"){
			linkAudit.updateBadge(message.rH,message.gH,message.oH,message.pending);
		}
    },
    /**
     * Method, fired when link has been checked
     * @id onComplete
     * @param {Object} link
     * @return void
     */
    onComplete:function(link){
        linkAudit.log(link);
		if (!link.completed){
			try{
				chrome.tabs.sendMessage(linkAudit.currentTabId,{
					'link':link,
					'action':'update-single-link',
					'linkArray':linkAudit.linkArray
				})
			}catch(e){
				linkAudit.log(e)
			}
        }
        link.completed = true;
        var nextlink = _.find(linkAudit.linkArray, function(link){return (link.validate) ? false : true ; });
        if ( nextlink){
            linkAudit.log('found !!!!!!!!');
            linkAudit.validateLink( nextlink );
        }
        /*
        chrome.tabs.sendMessage(linkAudit.currentTabId,{
            'linkArray':linkAudit.linkArray,
            'action':'update-display'
        })
        */
		return true;
    },
    /**
     * Method, sends individual link object to be validated
     * @id validateLinks
     * @param {Object} linkArray
     * @return void
     */
    validateLinks:function(){
        linkAudit.log("validating links "+ linkAudit.linkArray.length);
        for (var i = 0; i < linkAudit.linkArray.length, i < parseInt(linkAudit.getLocalStore("maxQueueLength"),10) ; i++){
            linkAudit.validateLink( linkAudit.linkArray[i] );
        }
    },
    /**
     * Method, validates the link object
     * @id validateLink
     * @param {Object} link
     * @return void
     */
    validateLink:function(link){
        linkAudit.log("validating link "+ link.id);
        link.validate = true;

        var XMLHttpTimeout = null,
            xmlHttpRequest = new XMLHttpRequest(),
            checkType = linkAudit.getLocalStore("checkType"),
            timeout = linkAudit.getLocalStore("timeout"),
            url = link.href;

        xmlHttpRequest.onreadystatechange = function(oEvent){
            if (xmlHttpRequest.readyState == 4) {
				clearTimeout(XMLHttpTimeout);

                if (checkType === "GET"){
                    link["contentMatch"] = linkAudit.checkForContentMatch( xmlHttpRequest.responseText );
                }else{
                    link["contentMatch"] = false;
                }
                link["httpStatusCode"] = xmlHttpRequest.status;
                if (link["contentMatch"] !== false){
                    link["status"] = "content-match";
                } else if (xmlHttpRequest.status > 199 && xmlHttpRequest.status < 400){
                    link["status"] = "success";
                } else {
                    link["status"] = "failed";
                }

                return linkAudit.onComplete(link);
            }
        };

        try {
            xmlHttpRequest.open(checkType, url, true);
            xmlHttpRequest.send();
        } catch(e){
            linkAudit.log(e);
		}
		linkAudit.linkXmlHTTPRequestArray.push({
			"link":link,
			"xmlHttpRequest":xmlHttpRequest
		})
		//link.xmlHttpRequest = xmlHttpRequest;

		XMLHttpTimeout=setTimeout(function(){
			var reason = "timed out after "+ timeout / 1000 +"s"
			linkAudit.abortRequest(link,xmlHttpRequest,reason);
        }, timeout );
    },
	/**
	 * Method, kills the current request
	 * @id abortRequest
	 * @param {Object} link
	 * @return void
	 */
	abortRequest:function(link,xmlHttpRequest,reason){
		linkAudit.log('aborting '+ link.id +' request')
		try{
			xmlHttpRequest.abort();
			link["http-status-code"] = 0;
			link["reason"] = reason ;
			link["status"] = "unknown";
			linkAudit.onComplete(link);
		}catch(e){
			linkAudit.log(e)
		}
	},
	/**
	 * Method, kills all the current requests
	 * @id abortRequests
	 * @return void
	 */
	abortRequests:function(){
		linkAudit.log('aborting all requests')
		var reason = 'cancelled by user';
		while (linkAudit.linkXmlHTTPRequestArray.length){
			var item = linkAudit.linkXmlHTTPRequestArray.pop();
			linkAudit.abortRequest( item.link, item.xmlHttpRequest , reason);
		}
	},
    /**
     * Method, writes message to console if debug mode is one
     * @id log
     * @param {Object} message
     * @return void
     */
    log:function(message){
		var debug = linkAudit.getLocalStore("debug");
        if (DEBUG || debug === "true"){
           console.log(message);
        }
    },
    /**
     * Method, checks if responseText contains any of the contentStrings we are searching for
     * @id checkForContentMatch
     * @param {String} responseText
     * @return boolean
     */
    checkForContentMatch:function(responseText){
        linkAudit.log("validating link responseText ");
        if (!responseText || !responseText.length || !linkAudit.contentStrings.length){
            linkAudit.log("responseText.length "+ responseText.length +" contentStrings.length "+ linkAudit.contentStrings.length);
            return false;
        }
        for (var i = 0; i < linkAudit.contentStrings.length ; i++){
            linkAudit.log("validating link responseText "+ linkAudit.contentStrings[i]);
            if (linkAudit.contentRegExp.length == i){
                // this should only happen on the first run, there after the regexp length will be grater than i
                linkAudit.contentRegExp.push( new RegExp( linkAudit.contentStrings[i] , "i") );
            }
            if (responseText.match( linkAudit.contentRegExp[i] )){
                return linkAudit.contentStrings[i];
            }
        }
        return false;
    },
    /**
     *
     *
     *
     */
    updateBadge:function(RH,GH,OH,pending){
		if (linkAudit.isTerminated === true){
			return; // ignore badge updates until user resets
		}
        var canvas = (document.getElementsByTagName("canvas").length) ? document.getElementsByTagName("canvas")[0] : document.createElement("canvas"),
            ctx,
			colour = (pending && pending > 0) ? "rgba(0,0,0,1)" : "rgba(150,150,150,0.7)",
			rH = (RH || RH === 0) ? Math.ceil(RH) : 8,
			gH = (GH || GH === 0) ? Math.ceil(GH) : 12,
			oH = (OH || OH === 0) ? Math.ceil(OH) : 6,
			p = pending || "";


        //document.getElementsByTagName('body')[0].appendChild(canvas);
        ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 19, 19);
        ctx.roundRect(0, 0, 19, 19, 5, true, false);
        ctx.fillStyle = colour;
        ctx.fill();

        if (linkAudit.toArray("contentStrings").length && linkAudit.getLocalStore("checkType") === "GET"){

            ctx.roundRect(2, (16-rH), 4, rH, [1,0,0,0], true, false);
            ctx.fillStyle = "rgba(255,50,50,1)";// the red one
            ctx.fill();

            ctx.roundRect(6, (16-gH), 7, gH, [1,1,0,0], true, false);
            ctx.fillStyle = "rgba(0,255,0,1)";// the green one in the middle
            ctx.fill();//rgba(255,204,0,1)

            ctx.roundRect(13, (16-oH), 4, oH, [0,1,0,0], true, false);
            ctx.fillStyle = "rgba(255,204,0,1)";// the orange one at the side
            ctx.fill();//rgba(255,204,0,1)
        } else {
            ctx.roundRect(3, (16-rH), 7, rH, [1,0,0,0], true, false);
            ctx.fillStyle = "rgba(255,50,50,1)";
            ctx.fill();

            ctx.roundRect(9, (16-gH), 7, gH, [1,1,0,0], true, false);
            ctx.fillStyle = "rgba(0,255,0,1)";
            ctx.fill();//rgba(255,204,0,1)
        }
        var imageData = ctx.getImageData(0, 0, 19, 19);

        chrome.browserAction.setIcon({
            imageData: imageData
        });
		if (p && p > 0) {
			if (p > 9999){
				p = ">10k";
			}
		}

		chrome.browserAction.setBadgeText({text:p.toString()});


        // document.getElementsByTagName('body')[0].removeChild(canvas);


    }

}
chrome.extension.onMessage.addListener(linkAudit.onMessage);
linkAudit.updateBadge();