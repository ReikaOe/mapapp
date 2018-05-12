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

// これ使っちゃダメよ！
// connection.end();



app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');

app.use(express.static(`${__dirname}/public`));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}));


app.get('/', (req, res) => {
	if (req.session.user_id) {
		res.redirect('/map');
	}

	res.render('index.pug');
});

app.get('/signout', (req, res) => {
	req.session.user_id = null;
	res.redirect('/');
});

app.get('/map', (req, res) => {
	if (!req.session.user_id) {
		res.redirect('/');
	}

	var userId = req.session.user_id;
	var userName = null;
	var spotName = null;
	var query ='SELECT user_name FROM users WHERE id = "' + userId + '" LIMIT 1';
	var spotsList = 'SELECT address FROM spots WHERE user_id = ' + userId + '';

	connection.query(query, function(err, rows) {
		if (err) {
			console.log(err);
		} else {
			console.log('success');
		}	

		userName = (rows && rows.length) ? rows[0].user_name : "名無し";

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