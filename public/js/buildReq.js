
var socketio =null;
// 1.イベントとコールバックの定義
socketio= io.connect('/');
//var socketio = io.connect();

//socketio.on('greeting', function(data, fn) { fn(confirm(data.message)) });

/*
 * socketioからの受信イベント
 */
//socketio.on("connected", function(name) {});
//socketio.on("publish", function (data) { addMessage(data.value); });
socketio.on("disconnect", function () {});

//行選択完了イベント。
socketio.on("rowSelect", function () {
	//以前ロックしていた行は解放されました。
	//行ロック完了
	//編集可能になる。
});

//行編集完了イベント
socketio.on("rowCommit", function () {
	//行の開放を行う。
});

function roomInit(room,pw) {
	console.log("roomInit");
	console.log(room);
	console.log(pw);
	
    // ※3 入室する部屋番号を送信
//	socketio.on('connected', function() {socketio.json.emit('init', { 'room': room, 'name': name });});
	socketio.emit("initRoom",{room,pw});
	socketio.on("initRoom",function(data){
		$("#roomId").html(data.room);
		$("#roomPw").html(data.pw);
	});
    // ※7 受け取ったメッセージを表示
	socketio.on("updateCode", function (data) { updateCodeText(data.value); });
	socketio.on("publish", function (data) { addMessage(data.value); });
	socketio.on("controlCode", function (data) { setControlCode(data); });
}

/*
 * メッセージ送信メソッド
 * 実行タイミング：「送信」ボタンを押すことで起動
 */
function publishMessage() {
  var textInput = document.getElementById('chatInput');
  if(textInput.value == '')	return;
  var msg = "[" + myName + "] " + textInput.value;
  socketio.emit("publish", {value: msg});
  textInput.value = '';
}

/**
 * ソースコードを更新するメソッド
 */
function updateCodeText(msg){
	console.log(new Date().toLocaleTimeString() + ' ' + msg);
	$("#codeText").val(msg);	
}


/*
 * チャットボックスにメッセージを追加するメソッド
 */
function addMessage(msg) {
  console.log(new Date().toLocaleTimeString() + ' ' + msg);
//   $("#msg").append("<p>" + new Date().toLocaleTimeString() + ' ' + msg + "</p>");
	$("#msgout").append(new Date().toLocaleTimeString() + ' ' + msg + "\r\n");
}

var master = false;
function setControlCode(data){
	$("#language").val(data.language);
	$("#resultStatus").html(data.exeStatus);
	$("#stdout").html(data.stdio);
	$("#stderr").html(data.stderr);
	master = data.master;
	if(master == true){
		//マスターなので編集可に設定
		$("#language").prop("disabled",false);
		$("#codeText").prop("disabled",false);
		$("#executeButton").prop("disabled",false);
	}else{
		//編集中らしいので編集不可に設定
		$("#language").prop("disabled",true);
		$("#codeText").prop("disabled",true);
		$("#executeButton").prop("disabled",true);
	}
}

// $codeText.on({
// 	//要素がフォーカスを得た時に発生
// 	'focus': function(event) {
// 		console.log("フォーカスはいった");
// 	},
// 	//要素がフォーカスを失った時に発生
// 	'blur': function(event) {
// 		console.log("フォーカス失いました。");
// 		// console.log("");	
// 	},
// 	'input': function(event) {
// 		console.log("編集中"+$("#codeText").val());
// 	}
// });

var myName ;
// 3.開始処理
$(function(){
	UIkit.toggle($("#stdoutbutton")).toggle();
	UIkit.toggle($("#stderrbutton")).toggle();
	var msgArea = $("#msg");
	myName = "名無しプログラマーさん";
	$("#nameInput").val(myName);
	$("#nameInput").on('input',function(){ myName = $(this).val() });
	//start(myName);
	roomInit($("#roomId").html(),$("#roomPw").html());	
	$codeText = $("#codeText");
	$codeText.focus(function(){
		console.log("フォーカスはいった");
		var data = {
			language:$("#language").val(),
			master:true,
			stdio:$("#stdout").html(),
			stderr:$("#stderr").html(),
			exeStatus:$("#resultStatus").html()
		}
		socketio.emit("controlCode", data);	  
		
	});
	$codeText.blur(function(){
		console.log("フォーカス失いました。");
		if($("#resultStatus").html()=="実行中"){
			$codeText.focus();
			return;
		}
		if(master==true){
			var data = {
				language:$("#language").val(),
				master:false,
				stdio:$("#stdout").html(),
				stderr:$("#stderr").html(),
				exeStatus:$("#resultStatus").html()
			}
			console.log("フォーカス失いました。送信");
			socketio.emit("controlCode", data);	  	
		}
	});
	$codeText.on('input',function(){
		var text = $(this).val();
		console.log(text);
		if(text == '')	return;
		var msg = text;
		socketio.emit("updateCode", {value: msg});	  
	});	
});

function buildReq(){
	$("#resultStatus").html("実行中");
	$param = {
		//language :"php",
		language :$("#language").val(),
		api_key:"guest",
		source_code : $("#codeText").val(),
	}
	console.log($param);
	$.ajax({
	    url: 'http://api.paiza.io:80/runners/create', // 通信先のURL
	    type: 'POST',		// 使用するHTTPメソッド (GET/ POST)
	    data:$param,
	    dataType: 'json' // 応答のデータの種類
	}).done(function (data, textStatus, jqXHR) {
		console.log(data.id);
		console.log(data.status);
		console.log(data.error);
		console.log(data);

		console.log("$param" + $param);
		$param = {
			id:data.id,
			api_key:"guest"
		}

		$status = data.status;

		var cnt = 0;
		var isBuild = null;
		var timeLoop = setInterval(function(){
			cnt++
			$param = {
					id:data.id,
					api_key:"guest"
			}
			$.ajax({
			    url: 'http://api.paiza.io:80/runners/get_status', // 通信先のURL
			    type: 'GET',	// 使用するHTTPメソッド (GET/ POST)
			    data:$param,
			    dataType: 'json' // 応答のデータの種類
			}).done(function (data, textStatus, jqXHR) {
				console.log(data);
				isBuild = data.status;
				 if(isBuild == "completed"){
					console.log("completed");
					cnt = 0;
					clearInterval(timeLoop);
					getBuildRes(data.id);
				 }else if (cnt >= 5 && timeLoop != null) {
				    // 5回以上表示したら、タイマーを停止する
					console.log("timeOut");
				    clearInterval(timeLoop);
				    return;
				}
			}).fail(function (jqXHR, textStatus, errorThrown) {
			    alert("paizaAPIから返答がありませんでした。");
			});
		 },5000);

//		if(getStatus(data.id) == "completed"){
//			 getBuildRes(data.id);
//		 }
	}).fail(function (jqXHR, textStatus, errorThrown) {
	    alert("paizaAPIから返答がありませんでした。");
	});
}

function getBuildRes(param){
	$param = {
			id:param,
			api_key:"guest"
	}
	$.ajax({
	    url: 'http://api.paiza.io:80/runners/get_details', // 通信先のURL
	    type: 'GET',		// 使用するHTTPメソッド (GET/ POST)
	    data:$param,
	    dataType: 'json' // 応答のデータの種類

	}).done(function (data, textStatus, jqXHR) {
		console.log(data);
		console.log("congratulations");
		$("#resultStatus").html(data.status + " : " + data.result);
		$("#stdout").html(data.stdout);
		$("#stderr").html(data.stderr);
		if($("#stderr").html() != ""){
			location.href = "#stderr";
		}else if($("#stdout").html() != ""){
			location.href = "#stdout";
		}

	}).fail(function (jqXHR, textStatus, errorThrown) {
	    alert("paizaAPIから返答がありませんでした。");
	});
}