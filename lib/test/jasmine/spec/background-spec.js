var chrome = {
    browserAction:{
        onClicked:{
            addListener:function(){}
        },
        setIcon:function(){},
        setBadgeText:function(){}
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
    describe("When Setting a local store value", function() {


    });



});