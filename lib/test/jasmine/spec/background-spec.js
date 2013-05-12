var chrome = {
    browserAction:{
        onClicked:{
            addListener:function(){}
        },
        setIcon:function(){},
        setBadgeText:function(obj){ return obj.text}
    },
    extension:{onMessage:{addListener:function(){}}}
}

describe("Background", function() {

    describe("When Getting a local store value, ", function() {

        it("getting a value from a key should return the correct fallback value", function() {

            expect( linkAudit.getLocalStore("i_dont_exist_no_fallback") ).toBeNull();

			expect( linkAudit.getLocalStore("i_dont_exist","Fallback") ).toBe('Fallback');

			expect( linkAudit.getLocalStore("TESTVALUE") ).toBe('ABC');

        });

        it("getting a value from a key with a fallback value, should override the global DEFAULT value", function() {

             expect( linkAudit.getLocalStore("TESTVALUE","DEF") ).toBe('DEF');

        });


    });
    describe("When looking for a content string", function() {
		var currentValue
        beforeEach(function() {
            currentValue  = linkAudit.contentStrings;
            linkAudit.contentStrings = ['hello','goodbye'];
        });

        afterEach(function() {
            linkAudit.contentStrings = currentValue;
        });

        it("can find text in a string",function(){
            expect( linkAudit.checkForContentMatch("123 hello 456") ).toBe( 'hello' )
        })
        it("can find text in a string, case insensitive",function(){
            expect( linkAudit.checkForContentMatch("123 HELLO 456") ).toBe( 'hello' )
        })
        it("can't find text in a string where it doesn't exist",function(){
            expect( linkAudit.checkForContentMatch("123 some text blah 456")).toBe( '' )
        })
    });

    describe("When updating the browser icon", function() {
        it("The number should match the pending requests",function(){
            expect( linkAudit.updateBadge(0,0,0,100) ).toEqual( '100' );
        })
    })

});