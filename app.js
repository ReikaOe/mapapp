var express = require('express');
var app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');

app.get('/', function (req,res) {
	res.render('index.pug');
});

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});