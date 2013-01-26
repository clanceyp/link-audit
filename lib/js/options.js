background = chrome.extension.getBackgroundPage();



var editableOptions = [{
        "key":"blacklist"
        ,"id":"blacklist"
        ,"type":"text"
    },{
        "key":"whitelist"
        ,"id":"whitelist"
        ,"type":"text"
    },{
        "key":"contentStrings"
        ,"id":"contentStrings"
        ,"type":"text"
    },{
        "key":"checkType"
        ,"id":"requestType"
        ,"type":"select-one"
        ,"event":{"type":"change","function":"setBodyClassName","dispatchOnLoad":true}
    },{
        "key":"ignore404"
        ,"id":"ignore404"
        ,"type":"checkbox"
    },{
        "key":"showStatusCode"
        ,"id":"showStatusCode"
        ,"type":"checkbox"
    }
    ],
    background = chrome.extension.getBackgroundPage(),
    options = {};


options = {

    /**
     * Method, sets the value of form elements
     * @id load
     * @return void
     */
	 load: function(){
		/* load options saved or default values */
		for (var item in editableOptions){
			var option = editableOptions[item],
				value = background.linkAudit.getLocalStore( option.key ),
				element = document.getElementById( option.id );
            console.log(option.id +" - "+ value);
			if (option.type === "text"){
				/* text  (e.g. type=text, type=password, textarea etc...) */
				element.value = value;
			} else if (option.type === "select-one"){
				/* select  (single select) */
				var selectOptions = element.getElementsByTagName("option");
				for (var i = 0; i < selectOptions.length; i++){
					var o = selectOptions[i];
					if (o.value === value){
						o.selected = true;
						break;
					}
				}
			} else if (option.type === "checkbox"){
				element.checked = (value === "true" || value === true) ? true : false;
			} else {
				console.log("Not implemented option type: " + option.type );
			}
			/* if the option has any events associated attach and fire */
			if (option.event){
				element.addEventListener(option.event.type, options[option.event.function], false);
				if (option.event.dispatchOnLoad){
					var evt = document.createEvent('Event');
					evt.initEvent(option.event.type, true, true);
					element.dispatchEvent( evt );
				}
			}
		}
	},
    /**
     * Method, save current values
     * @id save
     * @return void
     */
	save:function(){
        console.log("saving something");
		for (var item in editableOptions){
			var option = editableOptions[item],
				value;
			if (option.type === "text" || option.type.match("select")) {
				value = document.getElementById( option.id ).value ;
				background.linkAudit.setLocalStore( option.key ,  value);
			} else if (option.type === "checkbox"){
				background.linkAudit.setLocalStore( option.key ,  document.getElementById( option.id ).checked);
			}else {
				console.log("Not implemented option type: " + option.type );
			}
		}
		// document.getElementById("msg").style.visibility = "visible";
	},
    /**
     * Method, reset default values
     * @id reset
     * @return void
     */
	reset:function(){
        background.linkAudit.clearLocalStore();
        location.reload();
	},
    /**
     * Method, set body class name depending on form element value
     * @id setBodyClassName
     * @return void
     */
	setBodyClassName:function(){
		// remove classes which start with the id value
		var body = document.getElementsByTagName("body")[0],
			currentClasses = body.className.split(" "),
			newClasses = [], item,
			key = this.getAttribute("id"),
			value = this.value;

		for (item in currentClasses){
			if (!currentClasses[item]){continue;}
			if (currentClasses[item].indexOf( key ) !== 0){
				newClasses.push( currentClasses[item] );
			}
		}
		newClasses.push( key +"-"+ value );
		body.className = newClasses.join(" ");
	}
}


$(function(){
    options.load();
    $('select').on('change', options.save);
    $('input[type=checkbox]').on('click', options.save);
    $('textarea').on('keyup',options.save);
    $('.reset').on('click', options.reset);
})
