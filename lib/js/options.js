background = chrome.extension.getBackgroundPage();



var editableOptions = [{
        "key":"blacklist"
        ,"id":"blacklist"
        ,"type":"text"
        ,"save":"change"
    },{
        "key":"whitelist"
        ,"id":"whitelist"
        ,"type":"text"
        ,"save":"change"
    },{
        "key":"contentStrings"
        ,"id":"contentStrings"
        ,"type":"text"
        ,"save":"change"
    },{
        "key":"checkType"
        ,"id":"checkType"
        ,"type":"select-one"
        ,"event":{"type":"change","function":"setBodyClassName","dispatchOnLoad":true}
        ,"save":"change"
    },{
        "key":"ignore404"
        ,"id":"ignore404"
        ,"type":"checkbox"
        ,"save":"click"
    },{
        "key":"showStatusCode"
        ,"id":"showStatusCode"
        ,"type":"checkbox"
        ,"save":"click"
    },{
        "key":"ignoreHash"
        ,"id":"ignoreHash"
        ,"type":"checkbox"
        ,"save":"click"
    },{
        "key":"validateDomainOnly"
        ,"id":"validateDomainOnly"
        ,"type":"checkbox"
        ,"save":"click"
    },{
        "key":"maxQueueLength"
        ,"id":"maxQueueLength"
        ,"type":"range"
        ,"save":"change"
    }//,"maxQueueLength":50
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
            element.key = option.key;
            console.log(option.id +" - "+ value);
			if (option.type === "text" || option.type === "range"){
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
            if (option.save){
                element.addEventListener(option.save, function(e){
                    if (this.type === "checkbox"){
                        background.linkAudit.setLocalStore(this.key,  this.checked);
                    }else{
                        background.linkAudit.setLocalStore(this.key,  this.value);
                        if ($("#"+this.id +"Display").length){
                            $("#"+this.id +"Display").text( this.value );
                        }
                    }
                    background.linkAudit.updateBadge();
                }, false);
            }
            if ($("#"+option.id +"Display").length){
                $("#"+option.id +"Display").text( value );
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
	},
    /**
     * Method, shows the correct section depending on which tab was clicked
     * @id navigate
     * @return void
     */
    navigate:function(e){
        $("section").addClass("hidden");
        $("nav li.selected").removeClass('selected');
        $(e.target.hash).removeClass("hidden");
        $(e.target).parent("li").addClass("selected");
        e.preventDefault();
    }
}


$(function(){
    options.load();
    var section = "#sectionDonate";
    $('.save').on('click', options.save);
    $('.reset').on('click', options.reset);
    $('nav a').on('click',options.navigate);
    $("#formDonate").on("submit",function(){
        background.linkAudit.setLocalStore("ge98AA68e8njj9","8977XX-PZ34")
    })
    if(background.linkAudit.getLocalStore("ge98AA68e8njj9","") === "8977XX-PZ34"){
        section = "#sectionSettings";
    }
    $(section).removeClass("hidden");
    $("a").each(function(i,el){
        if ($(this).attr("href") == section){
            $(this).parent("li").addClass("selected");
            return false;
        }
    })
})
