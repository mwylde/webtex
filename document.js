var sys = require('sys'),
	http = require('http'),
	kiwi = require('kiwi'),
	url = require('url'),
	fs = require('fs'),
	path = require("path"),
	utils = require('./utils');
	
var redis = kiwi.require('redis-client');

var queuedRes = {};
var counter = 1;

var client = redis.createClient();

client.stream.addListener("connect", function () {
	popFromQueue();
});

exports.do_document = function(req, res){
	switch(req.method)
	{
		case "PUT":
			create_doc(req,res);
			break;
		case "GET":
			send_doc(req,res);
			break;
		case "POST":
			update_doc(req,res);
			break;
		default:
			sys.puts("Method: " + req.method);
	}
};

function create_doc(req,res){
	utils.getData(req, function(data){
		params = JSON.parse(data);
		var uuid = randomUUID();
		client.set(uuid, {name: params.name});
		fs.mkdir(path.join("tmp", uuid), 755, function(err){
			res.writeHeader(200, {'Content-Type': 'application/json'});
			var json = JSON.stringify({
				"id" : uuid
			});
			res.write(json + "\n");
			res.end();
		});
	});
}

function send_doc(req, res){
	var doc = url.parse(req.url).pathname.split("/")[2];
	fs.stat("tmp/"+doc, function(err, stats){
		if(err){
			res.writeHeader(404);
			res.end();
			return;
		}
		else if(stats.isDirectory()) {
			var filename = path.join("tmp", doc, doc + ".pdf");
			fs.stat(filename, function(err, stats){
				if(err){
					utils.sendError(req,res,err);
					return;
				}
				else if(stats.isFile()){
					send_file(req,res,filename);
				}
				else {
					utils.sendError(req,res,"document not rendered");
				}
			});
		}
		else {
			utils.sendError(req,res,"document not present on server");
		}
	});
}

function send_file(req, res, filename){
	fs.readFile(filename, "binary", function(err, file) {  
		if(err) {  
			utils.sendError(req,res,err);
			return;  
		}  

		res.sendHeader(200, {'Content-Type': 'application/pdf'});
		res.write(file, "binary");  
		res.end();
	});
}

function update_doc(req,res){
	var doc = url.parse(req.url).pathname.split("/")[2];
	fs.stat("tmp/"+doc, function(err, stats){
		if(err){
			res.writeHeader(404);
			res.end();
			return;
		}
		else if(stats.isDirectory()) {
			var filename = path.join("tmp", doc, doc + ".tex");
			fs.open(filename, 'w+', 438, function(err, fd){
				if(err){
					utils.sendError(req,res,err);
					return;
				}
				req.addListener('data', function(chunk){
					fs.write(fd, chunk, 0, chunk.length, null, null);
				});
				req.addListener('end', function(){
					fs.close(fd);
					requestNumber = counter++;

					message = JSON.stringify({
						"class": "LatexRenderer",
						"args": [ {"node_id": requestNumber, "doc": doc} ]
					});

					client.rpush('resque:queue:renders', message);
					queuedRes[requestNumber] = res;
				});
			});
		}
		else {
			utils.sendError(req,res,"document not present on server");
		}
	});
}

function popFromQueue() {
	client.lpop('responses', handleResponse);
}

function handleResponse(err, result) {
	if (result == null) {
		setTimeout(function() { popFromQueue(); }, 100);
	} else {
		sys.puts("Processing");
		sys.puts('"' + result + '"');
		json = JSON.parse(result.toString());
		var requestNumber = json.node_id;
		var doc = json.doc;
		res = queuedRes[requestNumber];
		send_file(null, res, path.join("tmp", doc, doc + ".pdf"));
		delete queuedRes[requestNumber];
		popFromQueue();
	}
}

function randomUUID() {
	var s = [], itoh = '0123456789ABCDEF';

	// Make array of random hex digits. The UUID only has 32 digits in it, but we
	// allocate an extra items to make room for the '-'s we'll be inserting.
	for (var i = 0; i <36; i++) s[i] = Math.floor(Math.random()*0x10);

	// Conform to RFC-4122, section 4.4
	s[14] = 4;  // Set 4 high bits of time_high field to version
	s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence

	// Convert to hex chars
	for (var i = 0; i <36; i++) s[i] = itoh[s[i]];

	// Insert '-'s
	s[8] = s[13] = s[18] = s[23] = '-';

	return s.join('');
}
