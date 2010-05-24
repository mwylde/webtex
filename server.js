var sys = require('sys'),
	http = require('http'),
	kiwi = require('kiwi'),
	url = require('url'),
	doc = require('./document');

http.createServer(function (req, res) {
	route(req, res);
}).listen(8000);

function route(req, res) {
	switch(url.parse(req.url).pathname.split('/')[1])
	{
		case "document":
			doc.do_document(req, res);
			break;
		default:
			res.writeHeader(404);
			res.end();
	}
}

 


sys.puts('WebTex server running at http://127.0.0.1:8000/');