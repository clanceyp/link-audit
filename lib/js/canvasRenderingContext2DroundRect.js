/**
 * Method, adds roundRect method to
 * @id roundRect
 * @memberOf CanvasRenderingContext2D
 * @param {Int} x start
 * @param {Int} y start
 * @param {Int} width
 * @param {Int} height
    * @param {Int} radius, applied to all corners
    * @param {Array} radius, clockwise from top left [10, 10, 0, 0]
    * @param {Object} radius, hash table {"topRight":20}
 * @param {Boolean} fill
 * @param {Boolean} stroke
 * @return void
 */
window.CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius, fill, stroke) {
"use strict";
    var cornerRadius = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
        side;
    if (typeof stroke === "undefined") {
        stroke = false;
    }
    if (Array.isArray(radius) && radius.length === 4){
        cornerRadius.topLeft        = radius[0];
        cornerRadius.topRight       = radius[1];
        cornerRadius.bottomRight    = radius[2];
        cornerRadius.bottomLeft     = radius[3];
    } else if (typeof radius === "object") {
        for (side in radius) {
            if(radius.hasOwnProperty( side )){
                cornerRadius[side] = radius[side];
            }
        }
    } else if (typeof radius === "number") {
        for (side in cornerRadius) {
            if(cornerRadius.hasOwnProperty( side )){
                cornerRadius[side] = radius;
            }
        }
    }


    this.beginPath();
    this.moveTo(x + cornerRadius.topLeft, y);
    this.lineTo(x + width - cornerRadius.topRight, y);
    this.quadraticCurveTo(x + width, y, x + width, y + cornerRadius.topRight);
    this.lineTo(x + width, y + height - cornerRadius.bottomRight);
    this.quadraticCurveTo(x + width, y + height, x + width - cornerRadius.bottomRight, y + height);
    this.lineTo(x + cornerRadius.bottomLeft, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - cornerRadius.bottomLeft);
    this.lineTo(x, y + cornerRadius.topLeft);
    this.quadraticCurveTo(x, y, x + cornerRadius.topLeft, y);
    this.closePath();
    if (stroke) {
        this.stroke();
    }
    if (fill) {
        this.fill();
    }
};
