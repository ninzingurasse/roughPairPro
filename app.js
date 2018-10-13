

//ライブラリ類のロード
var express = require('express')
  , http = require('http')
  , path = require('path');

//作成コードのロード
var routes = require('./routes')
  , logger = require('./routes/logger')
  , user = require('./routes/user')
  , conf = require('./routes/setting');

logger.mode = conf.logMode;
logger.log("ログモードは" + logger.mode + "です。");

// all environments
var app = express();
app.set('port', process.env.PORT || conf.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.post('/ide', routes.ide);
app.get('/users', user.list);

//Serverオブジェクトの作成
var server = http.createServer(app);
server.listen(app.get('port'), function(){
  logger.log('Express server listening on port ' + app.get('port'));
});

var io = require('socket.io').listen(server);
server.listen(conf.port);

/*
 * サーバー側ではクライアント側の接続を受け付けると, io.socketsオブジェクトにconnectionイベントが発生します。
このとき引数としてsocketオブジェクトが発生するので, socket.emitメソッドを使用してイベントをクライアントに送信します。
引数は順にイベント名, 送信するデータオブジェクト, コールバック関数となっていて, コールバック関数ではクライアントからデータを受け取って使用することができます。
今回のプログラムではクライアントから送信されたデータをlogger.logで表示させています。
 */

//ユーザ、ルーム管理ハッシュ
var roomMasterCnt = 1;
var roomMaster = [];

// 2.イベントの定義
io.sockets.on("connection", function (socket) {

  var room='', pw='', name='名無しプログラマーさん', master=undefined;
    // クライアントに接続成功を送信
//    socket.emit('WebSocketプロトコルの確立に成功しました。');
	// socket.emit('connected');
	socket.on('initRoom',function(data){
    logger.log(data.toString());


    if(data.room == ""){
      room=('00000000'+roomMasterCnt).slice(-8);
      roomMaster.push(roomMasterCnt);
      pw='';
      roomMasterCnt++;
      logger.log(roomMaster);
      if(pw == data.pw){
        logger.log("部屋を作成します。");
        logger.log(room);
        logger.log(pw);        
        //入室を許可します。
        socket.join(room);
        io.to(room).emit("initRoom", {room: room,pw:pw,name:name});
      }
        
    }else{
      if(pw == data.pw){
        room = data.room;
        pw = data.pw;
        logger.log("room:"+room+" 新しく1名参加しました。");

        //入室を許可します。
        socket.join(room);
        //参加ユーザーのIDとPWを更新します。
        io.to(room).emit("initRoom", {room: room,pw:pw,name:name});
        //参加メッセージをみんなに送信します。
        io.to(room).emit("publish", {name:"["+socket.id + ":"+ name +"]",value:"さんがルームに参加しました。"});
      }else{
        //PW誤り
        logger.log("["+socket.id + ":"+ name +"]" + "さんはPWを間違えました。")
      }
    }
    if(pw == data.pw){
      //入室を許可します。
      socket.join(room);
    }
    });

  // 接続開始カスタムイベント(接続元ユーザを保存し、他ユーザへ通知)
  // socket.on("connected", function (name) {
  //   name += "さんが入室しました。";
  //   logger.log("roomId:"+room + "で" + name);
  //   io.to(room).emit("publish", {value: name});
  // });

  // メッセージ送信カスタムイベント
  socket.on("publish", function (data) {
    logger.log("room:"+room);
  // ※6 受け取ったメッセージを部屋の皆に送信
  name = data.name;
	  io.to(room).emit("publish", {name:"["+socket.id + ":"+ data.name +"]",value:data.value});
  });

  // エディタコントロール送信カスタムイベント
  socket.on("controlCode", function (reqData) {
    logger.log("controlCodeを受信しました。");
    logger.log(reqData);
    logger.log(reqData.master);
    logger.log(master);
    logger.log(socket.id);
    // var resData = reqData;
    if((master==undefined || master==socket.id) && reqData.master==true){
      // ※6 受け取ったメッセージを部屋の皆に送信
      var resData = {
        language:reqData.language,
        roomPw:reqData.roomPw,
        master:false,
        stdio:reqData.stdio,
        stderr:reqData.stderr,
        exeStatus:reqData.exeStatus
      }
      // resData.master = false;
      routes.language = reqData.language;
      pw = reqData.roomPw;
      logger.log("ロックします.");
      logger.log(resData);

      socket.broadcast.to(room).emit("controlCode", resData);
      io.sockets.connected[socket.id].emit("controlCode", reqData);　//Room内の特定のユーザーのみ（socket.idで送信元のみに送信）
      master = socket.id;      
      // io.to(room).emit("publish", {value:name + ":" + data.value});
    }else if(master==socket.id && reqData.master==false){
      //解除
      logger.log("ロック解除します.");
      var resData = {
        language:reqData.language,
        roomPw:reqData.roomPw,
        master:true,
        stdio:reqData.stdio,
        stderr:reqData.stderr,
        exeStatus:reqData.exeStatus
      }
      // resData.master = false;
      routes.language = reqData.language;
      pw = roomPw=reqData.roomPw;
      io.to(room).emit("controlCode", resData);
      master=undefined;
    }

  });
  
  // ソースコード送信カスタムイベント
  socket.on("updateCode", function (data) {
    // ※6 受け取ったメッセージを部屋の皆に送信
    logger.log("updateCodeを受信しました。");
    if(master==undefined || master==socket.id){
      logger.log("コード更新レスポンスを送信します。");      
      // code = data.value;
      routes.code = data.value;
      socket.broadcast.to(room).emit("updateCode", {value:data.value});
    }
  });
  // ソースコード送信カスタムイベント
  socket.on("updatePw", function (data) {
    // ※6 受け取ったメッセージを部屋の皆に送信
    logger.log("updateCodeを受信しました。");
    if(master==undefined || master==socket.id){
      logger.log("コード更新レスポンスを送信します。");      
      // code = data.value;
      pw = data.value;
      socket.broadcast.to(room).emit("updateCode", {value:data.value});
    }
  });
  
  // 接続終了組み込みイベント(接続元ユーザを削除し、他ユーザへ通知)
  socket.on('disconnect', function () {
    logger.log(name + "が退出します。")
    io.to(room).emit('publish', {name:"["+socket.id + ":"+ name +"]",value:"さんがルームから退出しました。"});
    socket.leave(room);
  });

  // 行選択イベント
  socket.on("rowSelect", function (data) {
	  io.to(room).emit("rowSelect", {value:data.value});
  });

});