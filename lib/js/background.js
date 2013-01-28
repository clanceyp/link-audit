"use strict";




chrome.browserAction.onClicked.addListener(function (tab) {

	//chrome.tabs.executeScript(tab.id, {}, function (){
console.log('browserAction clicked ');
		var blacklist = linkAudit.toArray("blacklist"),
			whitelist = linkAudit.toArray("whitelist"),
            contentSearch = (linkAudit.toArray("contentStrings").length && linkAudit.getLocalStore("checkType") === "GET");

		chrome.tabs.sendRequest(tab.id, {
			"action":"getLinkArray"
			,"options":{
                "blacklist":blacklist
			    ,"whitelist":whitelist
                ,"contentSearch":contentSearch
                ,"showStatusCode":linkAudit.getLocalStore("showStatusCode")
            }
		}, function(response){
            linkAudit.log('hello');
            linkAudit.log(response);
            if (response.action === "validateLinks"){
                linkAudit.contentStrings = linkAudit.toArray("contentStrings");
                linkAudit.linkArray = response.linkArray;
                linkAudit.currentTabId = tab.id;
                linkAudit.validateLinks(  );
            }
        });

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
        if (Array.isArray(value)){
            array = value;
        } else if (value.length){
            array = value.trim().split("\n");
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
        for (var i = 0; i < linkAudit.linkArray.length; i++){
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
    }
}
chrome.extension.onMessage.addListener(linkAudit.onMessage);