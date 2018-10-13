
/*
 * GET home page.
 */
var title = "ラフペアプロ";
module.exports = {
  code :'',
  language : "c",
  index : function(req, res){
    res.render('index', { title: title });
  },
  ide : function(req, res){
    console.log("post送信");
    // リクエストボディを出力
    console.log(req.body);
    console.log(req.body.room);
    console.log(req.body.pw);
    res.render('ide', { title: title, room: req.body.room, pw: req.body.pw,code:exports.code,language:exports.language});
  }

}



