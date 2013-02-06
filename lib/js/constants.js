
const DEBUG  = false;
const ctxHEIGHT = 100, ctxWIDTH = 280;
const DEFAULTS = {
	"blacklist":""
    ,"whitelist":""
    ,"timeout":30000
    ,"checkType":"HEAD"
    ,"ignore404":false
    ,"showStatusCode":true
    ,"ignoreHash":true
    ,"validateDomainOnly":false
    ,"maxQueueLength":2
    ,colour:{
        "success":["#080","#fff"]
        ,"failed":["#800","#fff"]
        ,"unknown":["#ff0","#000"]
        ,"content-match":["rgba(255,204,0,1)","#000"]
        ,"pending":["#cecece","#888"]
    }
}