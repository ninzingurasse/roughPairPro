
var socketio =null;
// 1.イベントとコールバックの定義
socketio= io.connect('/');
//var socketio = io.connect();

//socketio.on('greeting', function(data, fn) { fn(confirm(data.message)) });

/*
 * socketioからの受信イベント
 */
// socketio.on("connected",function(){console.log("connectedを受信しました")});
// socketio.on("publish", function (data) { addMessage(data.value); });

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
var myName;
function roomInit(room,pw) {
	console.log("roomInit");
	console.log(room);
	console.log(pw);
	
    // ※3 入室する部屋番号を送信
	//socketio.on('connected', function() {socketio.json.emit('init', { 'room': room, 'name': name });});
	socketio.emit("initRoom",{room,pw});
}

/*
 * メッセージ送信メソッド
 * 実行タイミング：「送信」ボタンを押すことで起動
 */
function publishMessage() {
  var textInput = document.getElementById('chatInput');
  if(textInput.value == '')	return;
//   var msg = "[" + myName + "] " + textInput.value;
  var msg = textInput.value;
  socketio.emit("publish", {name: $("#nameInput").val(),value: msg});
  textInput.value = '';
}

/**
 * ソースコードを更新するメソッド
 */
function updateCodeText(msg){
	console.log(new Date().toLocaleTimeString() + ' ' + msg);
	$("#codeText").val(msg);	
}

/**
 * PWを更新するメソッド
 */
function updatePwText(msg){
	console.log(new Date().toLocaleTimeString() + ' ' + msg);
	$("#roomPw").val(msg);	
}

/*
 * チャットボックスにメッセージを追加するメソッド
 */
function addMessage(name,msg) {
  console.log(new Date().toLocaleTimeString() + ' ' + msg);
//   $("#msg").append("<p>" + new Date().toLocaleTimeString() + ' ' + msg + "</p>");
	$("#msgout").append(new Date().toLocaleTimeString() + name + ' ' + msg + "\r\n");
	$("#msgout").scrollTop($("#msgout")[0].scrollHeight - $("#msgout").height());
}

var master = false;
function setControlCode(data){
	console.log("setControlCode");
	console.log(data);
	$("#language").val(data.language);
	$("#roomPw").val(data.roomPw);
	$("#resultStatus").html(data.exeStatus);
	$("#stdout").html(data.stdio);
	$("#stderr").html(data.stderr);
	master = data.master;
	if(master == true){
		//マスターなので編集可に設定
		$("#language").prop("disabled",false);
		// $("#roomPw").prop("disabled",false);
		$("#codeText").prop("disabled",false);
		$("#executeButton").prop("disabled",false);
	}else{
		//編集中らしいので編集不可に設定
		$("#language").prop("disabled",true);
		// $("#roomPw").prop("disabled",true);
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

// 3.開始処理
$(function(){
	UIkit.toggle($("#stdoutbutton")).toggle();
	UIkit.toggle($("#stderrbutton")).toggle();
	var msgArea = $("#msg");
	//start(myName);
	roomInit($("#roomId").val(),$("#roomPw").val());	
	$("#codeText").focus(function(){
		codeMaster();
	}).blur(function(){
		codeNoMaster();
	}).on('input',function(){
		var text = $(this).val();
		console.log(text);
		if(text == '')	return;
		var msg = text;
		socketio.emit("updateCode", {value: msg});	  
	});	
	$("#roomPw").focus(function(){
		codeMaster();
	}).blur(function(){
		codeNoMaster();
	}).on('input',function(){
		var text = $(this).val();
		console.log(text);
		if(text == '')	return;
		var msg = text;
		socketio.emit("updatePw", {value: msg});	  
	});	
	// ※7 受け取ったメッセージを表示
	socketio.on("initRoom",function(data){
		if(data.result == false){
			alert("PWを間違えています。");
			window.history.back(-1);
			return false;
		}
		console.log("initRoomイベント");
		console.log(data);
		$("#roomId").val(data.room);
		$("#roomPw").val(data.pw);
		$("#nameInput").val(data.name);
		
	});
	socketio.on("updateCode", function (data) { updateCodeText(data.value); });
	socketio.on("updatePw", function (data) { updatePwText(data.value); });
	socketio.on("publish", function (data) { addMessage(data.name, data.value); });
	socketio.on("controlCode", function (data) { setControlCode(data); });
	socketio.on("disconnect", function () {});
	// $("#nameInput").on('input',function(){ myName = $(this).val() });
	

	function codeMaster(){
		console.log("フォーカスはいった");
		var data = {
			language:$("#language").val(),
			roomPw:$("#roomPw").val(),
			master:true,
			stdio:$("#stdout").html(),
			stderr:$("#stderr").html(),
			exeStatus:$("#resultStatus").html()
		}
		socketio.emit("controlCode", data);	  		
	}
	function codeNoMaster(){
		console.log("フォーカス失いました。");
		if($("#resultStatus").html()=="実行中"){
			$codeText.focus();
			return;
		}
		if(master==true){
			var data = {
				language:$("#language").val(),
				roomPw:$("#roomPw").val(),
				master:false,
				stdio:$("#stdout").html(),
				stderr:$("#stderr").html(),
				exeStatus:$("#resultStatus").html()
			}
			console.log("フォーカス失いました。送信");
			socketio.emit("controlCode", data);	  	
		}		
	}
	$(window).on('beforeunload', function() {
		socketio.disconnect();
		// return 'ページを離れると部屋から退出しますがよろしいですか？';
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