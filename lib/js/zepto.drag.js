(function($){
    "use strict";
    $.extend($.fn, {
        drag:function(handle){
            var h = handle;
            return this.each(function(i,element){
                var position = $(element).css("position"),
                    handleElement = (h && $(element).find(h).length) ? h : element,
                    moveHandleClass = "CE-linkAuditDisplay-move-handle",
                    moveActiveClass = "CE-linkAuditDisplay-move-active",
                    isFixed = false;

                if (position === "static"){
                    $(element).css("position","relative");
                } else if (position === "fixed"){
                    isFixed = true;
                }
                $(element).css({"left":$(element).offset().left,"right":"auto"});
                $(handleElement).addClass(moveHandleClass).on("mousedown",startMoveElement);
                function startMoveElement(e){
                    var x = e.x,
                        y = e.y,
                        startXY = [x,y],
                        offset = $(element).offset();

                    $(document).on("mousemove", moveElement);
                    $(document).on("mouseup",endMoveElement);
                    $(element).addClass(moveActiveClass);

                    function moveElement(e){
                        var ex = (isFixed) ? e.x - document.documentElement.scrollLeft : e.x,
                            ey = (isFixed) ? e.y - document.documentElement.scrollTop : e.y,
                            X = (ex - startXY[0]),
                            Y = (ey - startXY[1]);

                        $(element).css({
                            "left": offset.left + X + "px",
                            "top": offset.top + Y + "px"
                        });

                        document.getSelection().removeAllRanges();
                    }
                    function endMoveElement(){
                        $(document).off("mousemove", moveElement);
                        $(element).removeClass(moveActiveClass);
                        document.getSelection().removeAllRanges();
                    }
                }
            });
        }
    });
})(window.Zepto);