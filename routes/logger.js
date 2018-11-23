
var fs = require("fs");
var cd = './log/';
module.exports = {
    mode : 2,
    log : function(msg){
        if(exports.mode==0)
            return;
        if(exports.mode==2 && (typeof msg)!='string')
            return;
        let now = new Date();
        let yyyy = ('0000'+now.getFullYear()).slice(-4),
            mm = ('00'+(now.getMonth()+1)).slice(-2),
            dd = ('00'+now.getDate()).slice(-2);
        let logMsg = mm + "/" + dd + " " + now.getHours()+":"+now.getMinutes()+":"+now.getSeconds()+"."+now.getMilliseconds()+" " + JSON.stringify(msg);
        console.log(logMsg);
        fs.appendFile(cd + yyyy+mm+dd+'loggerlog.txt',logMsg+"\r\n",function(err){
            console.log(err);
        });
    }
}

// exports.log = function(mode,msg){

// }