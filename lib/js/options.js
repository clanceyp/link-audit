
(function($, chrome, document, window){
    "use strict";


    var background = chrome.extension.getBackgroundPage(),
        console = window.console,
        editableOptions = [{
            "key":"blacklist",
            "id":"blacklist",
            "type":"text",
            "save":"change"
        },{
            "key":"whitelist",
            "id":"whitelist",
            "type":"text",
            "save":"change"
        },{
            "key":"contentStrings",
            "id":"contentStrings",
            "type":"text",
            "save":"change"
        },{
            "key":"checkType",
            "id":"checkType",
            "type":"select-one",
            "event":{"type":"change","func":"setBodyClassName","dispatchOnLoad":true},
            "save":"change"
        },{
            "key":"ignore404",
            "id":"ignore404",
            "type":"checkbox",
            "save":"click"
        },{
            "key":"showStatusCode",
            "id":"showStatusCode",
            "type":"checkbox",
            "save":"click"
        },{
            "key":"ignoreHash",
            "id":"ignoreHash",
            "type":"checkbox",
            "save":"click"
        },{
            "key":"validateDomainOnly",
            "id":"validateDomainOnly",
            "type":"checkbox",
            "save":"click"
        },{
            "key":"maxQueueLength",
            "id":"maxQueueLength",
            "type":"range",
            "save":"change"
        }//,"maxQueueLength":50
    ],
    options = {};


    options = {

        /**
         * Method, sets the value of form elements
         * @id load
         * @return void
         */
         load: function(){
            function saveFunction(e){
                var self = this;
                if (self.type === "checkbox"){
                    background.linkAudit.setLocalStore(self.key,  self.checked);
                }else{
                    background.linkAudit.setLocalStore(self.key,  self.value);
                    if ($("#"+self.id +"Display").length){
                        $("#"+self.id +"Display").text( self.value );
                    }
                }
                background.linkAudit.updateBadge();
            }
            /* load options saved or default values */
            for (var item in editableOptions){
                if (editableOptions.hasOwnProperty(item)){
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
                        element.addEventListener(option.event.type, options[option.event.func], false);
                        if (option.event.dispatchOnLoad){
                            var evt = document.createEvent('Event');
                            evt.initEvent(option.event.type, true, true);
                            element.dispatchEvent( evt );
                        }
                    }
                    if (option.save){
                        element.addEventListener(option.save, saveFunction, false);
                    }
                    if ($("#"+option.id +"Display").length){
                        $("#"+option.id +"Display").text( value );
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
                if (editableOptions.hasOwnProperty(item)){
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
                if (currentClasses.hasOwnProperty(item) && !currentClasses[item]){
                    if (currentClasses[item].indexOf( key ) !== 0){
                        newClasses.push( currentClasses[item] );
                    }
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
    };


    $(document).ready(function(){
        options.load();
        var section = "#sectionSettings",
            manifest = chrome.runtime.getManifest();
        $('.save').on('click', options.save);
        $('.reset').on('click', options.reset);
        $('nav a').on('click',options.navigate);
        $("#formDonate").on("submit",function(){
            background.linkAudit.setLocalStore("ge98AA68e8njj9","8977XX-PZ34");
        });
        if(background.linkAudit.getLocalStore("ge98AA68e8njj9","") === "8977XX-PZ34"){
            section = "#sectionSettings";
        }
        $(section).removeClass("hidden");
        $("a").each(function(i,el){
            if ($(this).attr("href") === section){
                $(this).parent("li").addClass("selected");
                return false;
            }
        });
        $("#appVersion").text(manifest.version);
        $("#appName").text(manifest.name);

    });


})(window.Zepto, window.chrome, document, window);