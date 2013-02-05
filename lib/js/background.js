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

	//chrome.tabs.executeScript(tab.id, {}, function (){
		console.log('browserAction clicked ');
		var blacklist = linkAudit.toArray("blacklist"),
			whitelist = linkAudit.toArray("whitelist"),
            contentSearch = (linkAudit.toArray("contentStrings").length && linkAudit.getLocalStore("checkType") === "GET");

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
                linkAudit.log(response.action);
                if (response.action === "validateLinks"){
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
    toArray:function(key){
        var value = linkAudit.getLocalStore(key),
            array = [];
        if (value && Array.isArray(value)){
			array = value;
        }
		if (array.length){
            array = value.split("\n");
			array = array.trimValues();;
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
            for (var i = 0; i < linkAudit.linkArray.length ; i++){
                linkAudit.linkArray[i].validate = true;// mark as having been validated
                linkAudit.linkArray[i].completed = true;// mark as completed
            }
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
        clearTimeout(linkAudit.updateUIDisplaySoon);
        if (!link.completed){
            chrome.tabs.sendMessage(linkAudit.currentTabId,{
                'link':link,
                'action':'update-single-link'
            })
            linkAudit.updateUIDisplaySoon = setTimeout(function(){
                chrome.tabs.sendMessage(linkAudit.currentTabId,{
                    'linkArray':linkAudit.linkArray,
                    'action':'update-display'
                })
            },40);
        }
        link.completed = true;
        var newlink = _.find(linkAudit.linkArray, function(link){return (link.validate) ? false : true ; });
        if ( newlink ){
            linkAudit.log('found !!!!!!!!');
            linkAudit.validateLink( newlink );
        }
        /*
        chrome.tabs.sendMessage(linkAudit.currentTabId,{
            'linkArray':linkAudit.linkArray,
            'action':'update-display'
        })
        */
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
        }
        catch(e){
            console.log(e);
        }

        XMLHttpTimeout=setTimeout(function(){
            xmlHttpRequest.abort();
            link["http-status-code"] = 0;
            link["status"] = "unknown";
            linkAudit.onComplete(link);
        }, timeout );
    },
    /**
     * Method, writes message to console if debug mode is one
     * @id log
     * @param {Object} message
     * @return void
     */
    log:function(message){
        if (DEBUG){
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
    updateBadge:function(rH,gH,oH){

        var canvas = (document.getElementsByTagName("canvas").length) ? document.getElementsByTagName("canvas")[0] : document.createElement("canvas"),
            ctx;

        rH = rH || 8;// default heights
        gH = gH || 12;
        oH = oH || 6;

        //document.getElementsByTagName('body')[0].appendChild(canvas);
        ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 19, 19);
        ctx.roundRect(0, 0, 19, 19, 5, true, false);
        ctx.fillStyle = "rgba(150,150,150,0.7)";
        ctx.fill();

        if (linkAudit.toArray("contentStrings").length && linkAudit.getLocalStore("checkType") === "GET"){

            ctx.roundRect(2, (16-rH), 4, rH, [2,0,0,0], true, false);
            ctx.fillStyle = "rgba(255,50,50,1)";// the red one
            ctx.fill();

            ctx.roundRect(6, (16-gH), 7, gH, [2,2,0,0], true, false);
            ctx.fillStyle = "rgba(0,255,0,1)";// the green one in the middle
            ctx.fill();//rgba(255,204,0,1)

            ctx.roundRect(13, (16-oH), 4, oH, [0,2,0,0], true, false);
            ctx.fillStyle = "rgba(255,204,0,1)";// the orange one at the side
            ctx.fill();//rgba(255,204,0,1)
        } else {
            ctx.roundRect(3, (16-rH), 7, rH, [2,0,0,0], true, false);
            ctx.fillStyle = "rgba(255,50,50,1)";
            ctx.fill();

            ctx.roundRect(9, (16-gH), 7, gH, [2,2,0,0], true, false);
            ctx.fillStyle = "rgba(0,255,0,1)";
            ctx.fill();//rgba(255,204,0,1)
        }
        var imageData = ctx.getImageData(0, 0, 19, 19);

        chrome.browserAction.setIcon({
            imageData: imageData
        });
        // document.getElementsByTagName('body')[0].removeChild(canvas);


    }

}
chrome.extension.onMessage.addListener(linkAudit.onMessage);
linkAudit.updateBadge();