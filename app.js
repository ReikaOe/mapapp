// expressの導入
var express = require('express');
var app = express();

// sessionを使う
var session = require('express-session');

// 日時などを使う
var moment = require('moment');
// var connection = require('mysqlConnection');

// ExpressでPOSTによる値の取得に必要なミドルウェア
// ミドルウェアとはrequest, response, next を受け取るfunction
// Express単体だとJSONのパースをしてくれない
var bodyParser = require('body-parser');

var MysqlJson = require('mysql-json');
var mysqlJason = new MysqlJson({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'map_app'
});

// mysqlの接続
var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'map_app' 
});

connection.connect();

// mysql接続確認？
connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
  if (err) throw err;
  console.log('The solution is: ', rows[0].solution);
});

// ↓爪痕
// これ使っちゃダメよ！
// connection.end();


// Expressにpugの導入
app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');

// 静的アセットファイルを格納しているディレクトリーの名前を express.static ミドルウェア関数に渡して、ファイルの直接提供を開始
// ${__dirname}は絶対パスを意味している
app.use(express.static(`${__dirname}/public`));

// フォームのボディをパースする準備
// If extended is false, you can not post "nested object"
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//セッションの設定
app.use(session({
	// keyboard catをキーとしてクッキーを暗号化する設定
  	// クッキーとはクライアント側に保存される管理用の変数
	secret: 'keyboard cat',
	// セッションチェックを行うたびにセッションを作成するかどうかの指定
	resave: false,
	// 未初期化状態のセッションを保存するかどうかの指定
	saveUninitialized: true
}));

// サインインしているかどうかの判定
app.get('/', (req, res) => {
	if (req.session.user_id) {
		res.redirect('/map');
	}

	res.render('index.pug');
});

// セッションを空にしてトップ画面へ
app.get('/signout', (req, res) => {
	req.session.user_id = null;
	res.redirect('/');
});

//地図アプリの根幹
app.get('/map', (req, res) => {
	//ログインしてなかったらトップ画面へ
	if (!req.session.user_id) {
		res.redirect('/');
	}
	//必要な変数の定義や代入
	var userId = req.session.user_id;
	var userName = null;
	//ユーザー名を取り出すクエリの中身を変数へ
	var query ='SELECT user_name FROM users WHERE id = "' + userId + '" LIMIT 1';
	//登録された地点一覧を取り出すクエリの中身を変数へ
	var spotsList = 'SELECT address FROM spots WHERE user_id = ' + userId + '';

	//ユーザーについてのクエリを投げる
	connection.query(query, function(err, rows) {
		if (err) {
			console.log(err);
		} else {
			console.log('success');
		}	

		// 三項演算子
		// rowsに取ってきたデータが入ってるので空かどうかで判定
		userName = (rows && rows.length) ? rows[0].user_name : "名無し";

		// ユーザーIDとユーザー名をmapに渡す
		res.render('map', {
			userId,
 			userName
  		});
	});

	connection.query(spotsList, function(err, rows) {
		if (err) {
			console.log(err);
		} else {
			rows.forEach((row) => {
				console.log(`${row.address}`);
			});

			res.render('map', {
			addressLists,
  		});
		}

		

	});
});

app.post('/register', function(req, res, next) {
	var userName = req.body.user_name;
	var email = req.body.email;
	var password = req.body.password;
	var createdAt = moment().format('YYYY-MM-DD HH:mm:ss');

	var emailExistsQuery = 'SELECT * FROM users WHERE email = "' + email + '" LIMIT 1';
	var registerQuery = 'INSERT INTO users (user_name, email, password, created_at) VALUES ("' + userName + '", ' + '"' + email + '", ' + '"' + password + '", ' + '"' + createdAt + '")';
	
	connection.query(emailExistsQuery, function(err, result) {
		if (result && result.length > 0) {
			res.render('index', {
				registerMessage: '既に登録されていメールアドレスです'
			});
		} else {
			connection.query(registerQuery, function(err, rows) {
				if (err) {
					console.log(err);
				} else {
					console.log('success')
				}
				res.render('index', {
					registerMessage: '登録が完了しました'
				});
			});
		}
	});
});


app.post('/signin', function(req, res, next) {
	var email = req.body.email;
	var password = req.body.password;
	var query ='SELECT id, user_name FROM users WHERE email = "' + email + '" AND password = "' + password + '" LIMIT 1';
	connection.query(query, function(err, rows) {
		if (err) {
			console.log(err);
		} else {
			console.log('success');
		}	

		var userId = (rows && rows.length) ? rows[0].id : false;
		var userName = (rows && rows.length) ? rows[0].user_name : false;
		if (userId) {
			req.session.user_id = userId;
			res.redirect('map');
		} else {
			res.render('index', {
				signinMessage: 'メールアドレスとパスワードが一致するユーザーはいません'
			});
		}
	});
});


module.exports = function(req, res, next) {
	var userId = req.session.user_id;
	if (userId) {
		var query = 'SELECT id, user_name FROM users WHERE id = ' + userId;
		connection.query(query, function(err, rows) {
			if (!err) {
				res.locals.user = rows.length? rows[0]: false;
			}
		});
	}
	next();
};

app.post('/location', function(req, res, next) {
	var lat = req.body.lat;
	var lng = req.body.lng;
	var address = req.body.address;

	var createdAt = moment().format('YYYY-MM-DD HH:mm:ss');

	var registerQuery = 'INSERT INTO spots (lat, lng, created_at, user_id, address) VALUES ("' + lat + '", ' + '"' + lng + '", ' + '"' + createdAt + '", ' + '"' + req.session.user_id + '", ' + '"' + address + '")';

	connection.query(registerQuery, function(err, rows) {
			if (!err) {
				res.locals.user = rows.length? rows[0]: false;
			} else {
				console.log(err);
			}
		});

	console.log(lat);
	console.log(lng);

	// res.redirect('/map');
});

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});