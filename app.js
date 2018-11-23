

//ライブラリ類のロード
let express = require('express')
  , http = require('http')
  , path = require('path');

//作成コードのロード
let routes = require('./routes')
  , logger = require('./routes/logger')
  , user = require('./routes/user')
  , conf = require('./routes/setting');

//ログ出力モードの設定
logger.mode = conf.logMode;
logger.log("ログモードは" + logger.mode + "です。");

// expressの読み込み
let app = express();
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

//POST,GETイベントの際の、ページルーティング
app.get('/', routes.index);
app.post('/ide', routes.ide);
app.get('/users', user.list);

//Serverオブジェクトの作成
let server = http.createServer(app);
server.listen(app.get('port'), function(){
  logger.log('Express server listening on port ' + app.get('port'));
});

let io = require('socket.io').listen(server);
server.listen(conf.port);

/*
 * サーバー側ではクライアント側の接続を受け付けると, io.socketsオブジェクトにconnectionイベントが発生します。
このとき引数としてsocketオブジェクトが発生するので, socket.emitメソッドを使用してイベントをクライアントに送信します。
引数は順にイベント名, 送信するデータオブジェクト, コールバック関数となっていて, コールバック関数ではクライアントからデータを受け取って使用することができます。
今回のプログラムではクライアントから送信されたデータをlogger.logで表示させています。
 */

//ユーザ、ルーム管理ハッシュ
var roomMasterCnt = 0;
var roomMaster = [];
// var roomPw = [];
var canUsingRoom = [];

// 2.イベントの定義
io.sockets.on("connection", function (socket) {

  let room='', pw='', name='名無しプログラマーさん', master=undefined;

	socket.on('initRoom',function(data){
    logger.log(data);
    logger.log(canUsingRoom);
    function newRoom(result = true){
      for (let i = canUsingRoom.length - 1; i >= 0 ; i--){
        if(canUsingRoom[i] == ""){
          canUsingRoom.splice(i,1);
        }else{
          logger.log("splice:");
          logger.log(canUsingRoom[i]);          
        }
      }
      logger.log("canUsingRoom:");
      logger.log(canUsingRoom.length);
      if(canUsingRoom.length == 0){
        //新ルームID発行
        roomMasterCnt++;
        room = ("00000000"+roomMasterCnt).slice(-8);
      }else{
        //ルームID再利用
        logger.log(canUsingRoom[0]);
        logger.log(canUsingRoom[0] == "");
        logger.log(canUsingRoom[0] == '');
        room = canUsingRoom[0];
        canUsingRoom.shift();
        logger.log("shift:");
        logger.log(canUsingRoom);
        logger.log(canUsingRoom.length);
      }
       pw=data.pw;
      roomMaster.push(room+pw);
      logger.log(room+pw);
      logger.log(roomMaster);
      logger.log(roomMaster.length);
       io.sockets.connected[socket.id].emit("initRoom", {room: room,pw:pw,name:name,result:result});
      logger.log("部屋を作成します。");
      logger.log(room);
      logger.log(pw);        
      //入室を許可します。
      socket.join(room+pw);
    };
    if(data.room == ""){
      newRoom();        
    }else if(roomMaster.indexOf(data.room + data.pw) != -1){
      room = data.room;
      pw = data.pw;
      logger.log("room:"+room+" 新しく1名参加しました。");
      logger.log(io.sockets.adapter.rooms[""+room]);
      logger.log(roomMaster);
      logger.log(data.room + data.pw);
      logger.log(roomMaster.indexOf(data.room + data.pw));

      //入室を許可します。
      socket.join(room+pw);
      //参加ユーザーのIDとPWを更新します。
      io.to(room).emit("initRoom", {room: room,pw:pw,name:name});
      //参加メッセージをみんなに送信します。
      if(room != "00000000"){
        io.to(room).emit("publish", {name:"["+socket.id + ":"+ name +"]",value:"さんがルームに参加しました。"});
      }
    }else{
      //PW誤り
      logger.log("["+socket.id + ":"+ name +"]" + "さんはPWを間違えました。" + pw );
      logger.log("["+socket.id + ":"+ name +"]" + "さんはPWを間違えました。" + data.pw );
      logger.log(roomMaster.indexOf(room));
      logger.log(data.room);
      logger.log(roomMaster);
      newRoom(false);

    }
  });

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
    if((master==undefined || master==socket.id) && reqData.master==true){
      // ※6 受け取ったメッセージを部屋の皆に送信
      let resData = {
        language:reqData.language,
        roomPw:reqData.roomPw,
        master:false,
        stdio:reqData.stdio,
        stderr:reqData.stderr,
        exeStatus:reqData.exeStatus
      }
      routes.language = reqData.language;
      pw = reqData.roomPw;
      logger.log("ロックします.");
      logger.log(resData);

      socket.broadcast.to(room).emit("controlCode", resData);
      io.sockets.connected[socket.id].emit("controlCode", reqData);　//Room内の特定のユーザーのみ（socket.idで送信元のみに送信）
      master = socket.id;      
    }else if(master==socket.id && reqData.master==false){
      //解除
      logger.log("ロック解除します.");
      let resData = {
        language:reqData.language,
        roomPw:reqData.roomPw,
        master:true,
        stdio:reqData.stdio,
        stderr:reqData.stderr,
        exeStatus:reqData.exeStatus
      }

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
      roomMaster[roomMaster.indexOf(room + pw)] = room + data.value;
      pw = data.value;

      socket.broadcast.to(room).emit("updatePw", {value:data.value});
    }
  });
  
  // 接続終了組み込みイベント(接続元ユーザを削除し、他ユーザへ通知)
  socket.on('disconnect', function () {
    if(room=="00000000"){
      socket.leave(room);
      return;
    }
    logger.log(name + "が退出します。")
    io.to(room).emit('publish', {name:"["+socket.id + ":"+ name +"]",value:"さんがルームから退出しました。"});
    socket.leave(room);

    logger.log(room + "の人数");
    logger.log(io.sockets.adapter.rooms[room]);

    //部屋に誰も参加してない場合
    if(io.sockets.adapter.rooms[room] == undefined){
      if(room == "00000000" || room =="")  return;
      canUsingRoom.push(room);
      logger.log(room + "をroomMasterから削除します");
      logger.log(roomMaster);
      roomMaster.splice(roomMaster.indexOf(room),1);
      logger.log("roomMaster:");
      logger.log(roomMaster);
      logger.log(room);
    }
  });

  // 行選択イベント
  socket.on("rowSelect", function (data) {
	  io.to(room).emit("rowSelect", {value:data.value});
  });

});