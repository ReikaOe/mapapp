var express = require('express');
var app = express();
var session = require('express-session');
var moment = require('moment');
// var connection = require('mysqlConnection');
var bodyParser = require('body-parser');

var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'map_app' 
});

connection.connect();

connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
  if (err) throw err;
  console.log('The solution is: ', rows[0].solution);
});

connection.end();



app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}));


app.get('/', function (req,res) {
	res.render('index.pug');
});

app.get('/register', function (req,res) {
	res.render('register.pug');
});

app.get('/', function(req, res, next) {
	if (req.session.user_id) {
		res.redirect('/');
	} else {
		res.render('signin', {
			title: 'ログイン',
		});
	}
});

app.get('/signin', function (req,res) {
	res.render('signin.pug');
});

app.post('/register', function(req, res, next) {
	console.log(req.body);
	var userName = req.body.user_name;
	var email = req.body.email;
	var password = req.body.password;
	var createdAt = moment().format('YYYY-MM-DD HH:mm:ss');

	var emailExistsQuery = 'SELECT * FROM users WHERE email = "' + email + '" LIMIT 1';
	var registerQuery = 'INSERT INTO users (user_name, email, password, created_at) VALUES ("' + userName + '", ' + '"' + email + '", ' + '"' + password + '", ' + '"' + createdAt + '")';
	
	connection.query(emailExistsQuery, function(err, result) {
		if (result.length > 0) {
			res.render('register', {
				title: '新規会員登録' ,
				emailExists: '既に登録されていメールアドレスです'
			});
		} else {
			connection.query(registerQuery, function(err, rows) {
				res.redirect('/signin');
			});
		}
	});
});

// app.use(express.static(path.join(__dirname, 'public')));
// app.use(session({
// 	serect: 'keybord cat',
// 	resave: false,
// 	saveUninitialized: true
// })),

app.post('/signin', function(req, res, next) {
	var email = req.body.email;
	var password = req.body.password;
	var query ='SELECT user_id FROM users WHERE email = "' + email + '" AND password = "' + password + '" LIMIT 1';
	connection.query(query, function(err, rows) {
		var userId = rows.length ? rows[0].user_id : false;
		if (userId) {
			req.session.user_id = userId;
			res.redirect('/');
		} else {
			res.render('signin', {
				title: 'ログイン',
				noUser: 'メールアドレスとパスワードが一致するユーザーはいません'
			});
		}
	});
});

module.exports = function(req, res, next) {
	var userId = req.session.user_id;
	if (userId) {
		var query = 'SELECT user_id, user_name FROM users WHERE user_id = ' + userId;
		connection.query(query, function(err, rows) {
			if (!err) {
				res.locals.user = rows.length? rows[0]: false;
			}
		});
	}
	next();
};


app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});