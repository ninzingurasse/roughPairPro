
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 8000);
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
//app.get('/',function(req, res) {
//	res.render(routes.index,);
//});
//app.post('/', routes.ide);
// app.get('/ide', routes.ide);
app.post('/ide', routes.ide);
app.get('/users', user.list);

var server = http.createServer(app);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = require('socket.io').listen(server);
server.listen(8000);

/*
 * サーバー側ではクライアント側の接続を受け付けると, io.socketsオブジェクトにconnectionイベントが発生します。
このとき引数としてsocketオブジェクトが発生するので, socket.emitメソッドを使用してイベントをクライアントに送信します。
引数は順にイベント名, 送信するデータオブジェクト, コールバック関数となっていて, コールバック関数ではクライアントからデータを受け取って使用することができます。
今回のプログラムではクライアントから送信されたデータをconsole.logで表示させています。
 */

//ユーザ、ルーム管理ハッシュ
var roomMasterCnt = 1;
var roomMaster = [];

// 2.イベントの定義
var chat = io.sockets.on("connection", function (socket) {

  var room='', pw='', master=undefined;

    // クライアントに接続成功を送信
//    socket.emit('WebSocketプロトコルの確立に成功しました。');
	socket.emit('connected');
	socket.on('initRoom',function(data){
    console.log(data);
    if(data.room == ""){
      room=roomMasterCnt;
      roomMaster.push(roomMasterCnt);
      pw='';
      roomMasterCnt++;
      console.log(roomMaster);
      if(pw == data.pw){
        console.log("新規許可されました。");
        console.log({room: room,pw:pw});

        //入室を許可します。
        socket.join(room);
        io.to(room).emit("initRoom", {room: room,pw:pw});
      }
        
    }else{
      if(pw == data.pw){
        room = data.room;
        pw = data.pw;
        console.log("room:"+room+" 許可されました。");
        console.log({room: room,pw:pw});

        //入室を許可します。
        socket.join(room);
        io.to(room).emit("initRoom", {room: room,pw:pw});
      }
    }
    if(pw == data.pw){
      //入室を許可します。
      socket.join(room);
    }
    });

//    socket.on('join', function(msg) {
//        usrobj = {
//          'room': msg.room,
//          'name': msg.name
//        };
//        socket.join(msg.roomid);
//      });

  // 接続開始カスタムイベント(接続元ユーザを保存し、他ユーザへ通知)
  socket.on("connected", function (name) {
//	  var room='', name='';
//	  socket.get('room', function(err, _room) {room = _room;});
//	  socket.get('name', function(err, _name) {name = _name;});
	    var msg = name + "さんが入室しました。";
//    userHash[socket.id] = name;
    io.to(room).emit("publish", {value: msg});
  });

  // メッセージ送信カスタムイベント
  socket.on("publish", function (data) {
    console.log("room:"+room);
	// ※6 受け取ったメッセージを部屋の皆に送信
	  io.to(room).emit("publish", {value:"("+socket.id +")" + ":" + data.value});
  });

  // エディタコントロール送信カスタムイベント
  socket.on("controlCode", function (reqData) {
    console.log("controlCodeを受信しました。");
    console.log(reqData);
    console.log(reqData.master);
    console.log(master);
    console.log(socket.id);
    if((master==undefined || master==socket.id) && reqData.master==true){
      // ※6 受け取ったメッセージを部屋の皆に送信
      var resData = {
        language:reqData.language,
        master:false,
        stdio:reqData.stdio,
        stderr:reqData.stderr,
        exeStatus:reqData.exeStatus
      }
      console.log("ロックします.");
      console.log(resData);

      socket.broadcast.to(room).emit("controlCode", resData);
      io.sockets.connected[socket.id].emit("controlCode", reqData);　//Room内の特定のユーザーのみ（socket.idで送信元のみに送信）
      master = socket.id;      
      // io.to(room).emit("publish", {value:name + ":" + data.value});
    }else if(master==socket.id && reqData.master==false){
      //解除
      console.log("ロック解除します.");
      var resData = {
        language:reqData.language,
        master:true,
        stdio:reqData.stdio,
        stderr:reqData.stderr,
        exeStatus:reqData.exeStatus
      }
      io.to(room).emit("controlCode", resData);
      master=undefined;
    }

  });
  
  // ソースコード送信カスタムイベント
  socket.on("updateCode", function (data) {
    // ※6 受け取ったメッセージを部屋の皆に送信
    console.log("updateCodeを受信しました。");
    if(master==undefined || master==socket.id){
      console.log("コード更新レスポンスを送信します。");      
      socket.broadcast.to(room).emit("updateCode", {value:data.value});
    }
  });
  
  // 接続終了組み込みイベント(接続元ユーザを削除し、他ユーザへ通知)
  socket.on('disconnect', function (name) {
//	  socket.leave(room);
      io.to(room).emit('publish', name + " さんが退出しました。");
  });

  // 行選択イベント
  socket.on("rowSelect", function (data) {
	  io.to(room).emit("rowSelect", {value:data.value});
  });

});