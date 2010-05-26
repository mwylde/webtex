var sys = require('sys'),
	http = require('http'),
	url = require('url'),
	doc = require('./document'),
	auth = require('./auth');

http.createServer(function (req, res) {
	route(req, res);
}).listen(8000);

function route(req, res) {
	switch(url.parse(req.url).pathname.split('/')[1])
	{
		case "user":
			sys.puts("Doing user");
			auth.doUser(req,res);
			break;
		case "document":
			doc.doDocument(req, res);
			break;
		default:
			res.writeHeader(404);
			res.end();
	}
}

 


sys.puts('WebTex server running at http://127.0.0.1:8000/');