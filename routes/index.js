
/*
 * GET home page.
 */
var title = "ラフペアプロ";
var logger = require('./logger');

module.exports = {
  code :'',
  language : "c",
  index : function(req, res){
    res.render('index', { title: title });
  },
  ide : function(req, res){
    logger.log("post送信");
    // リクエストボディを出力
    logger.log(req.body);
    logger.log(req.body.room);
    logger.log(req.body.pw);
    res.render('ide', { 
      title: title, 
      room: req.body.room, 
      pw: req.body.pw,
      code:exports.code,
      language:exports.language
    });
  }

}



