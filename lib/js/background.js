"use strict";




chrome.browserAction.onClicked.addListener(function (tab) {

	//chrome.tabs.executeScript(tab.id, {}, function (){
console.log('browserAction clicked ');
		var blacklist = linkAudit.getLocalStore("blacklist"),
			whitelist = linkAudit.getLocalStore("whitelist");

		chrome.tabs.sendRequest(tab.id, {
			"action":"getLinkArray"
			,"blacklist":blacklist
			,"whitelist":whitelist
		}, function(response){
            linkAudit.log('hello');
            linkAudit.log(response);
            if (response.action === "validateLinks"){
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
        chrome.tabs.sendMessage(linkAudit.currentTabId,{
            'link':link,
            'action':'update-single-link'
        })
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
                var ops = {
                    "status":xmlHttpRequest.status
                    ,'checkType':checkType
                    ,"responseText":xmlHttpRequest.responseText
                }
                if (checkType === "GET"){
                    //ops.contentStrings = getItem("contentStrings");
                    // check content scring match
                }
                link["httpStatusCode"] = xmlHttpRequest.status;
                if (xmlHttpRequest.status > 199 && xmlHttpRequest.status < 400){
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
    }
}
chrome.extension.onMessage.addListener(linkAudit.onMessage);