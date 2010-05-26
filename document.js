var sys = require('sys'),
	http = require('http'),
	kiwi = require('kiwi'),
	url = require('url'),
	fs = require('fs'),
	path = require("path"),
	utils = require('./utils'),
	auth = require('./auth'),
	redis = kiwi.require('redis-client').createClient(),
	Step = require('./step'),
	docs = require('./DocModel');

var queuedRes = {};
var counter = 1;

redis.stream.addListener("connect", function () {
	popFromQueue();
});

exports.DOCUMENT_NOT_PRESENT = 'document_not_present';
exports.DOCUMENT_NOT_RENDERED = 'document_not_rendered';

exports.doDocument = function(req, res){
	switch(req.method)
	{
		case "PUT":
			createDoc(req,res);
			break;
		case "GET":
			sendDoc(req,res);
			break;
		case "POST":
			updateDoc(req,res);
			break;
		default:
			sys.puts("Method: " + req.method);
	}
};

exports.logout = function(req, res){
	exports.processAuth(req,res,function(params){
		unsetAuth(params.userID);
		return utils.sendJSON(err, req, res, {'result' : 'user_logged_out'});
	});
};

function createDoc(req,res){
	auth.processAuth(req,res,function(params){
		var docID;
		Step(
			function createDoc(){
				docs.createDoc(params.name, params.user.userID, this);
			},
			function createFileDir(err, _docID){
				if(err)return utils.sendError(req,res,err);
				docID = _docID;
				fs.mkdir(path.join("tmp", docID), 438, this);
			},
			function returnResponse(err){
				if(err)return utils.sendError(req,res,err);
				return res.sendJSON(req, res, error, {"id":docID});
			}
		);
	});
}

function sendDoc(req,res){
	auth.processAuth(req,res,function(params){
		var docID = url.parse(req.url).pathname.split("/")[2];
		var filename = path.join("tmp", docID, docID + ".pdf");
		Step(
			function checkDocAuth(){
				docs.checkAuthorized(docID, params.user.userID);
			},
			function checkDir(err, authorized){
				if(err)return utils.sendError(req,res,err);
				if(!authorized)return utils.sendError(req,res,auth.NOT_AUTHORIZED);
				fs.stat("tmp/"+docID, this);
			},
			function checkFile(err, stats){
				if(err)return utils.sendError(req,res,err,404);
				if(!stats.isDirectory())return utils.sendError(req,res,exports.DOCUMENT_NOT_PRESENT);
				fs.stat(filename, this);
			},
			function doSending(err, stats){
				if(err)return utils.sendError(req,res,err);
				if(stats.isFile())return sendFile(req,res,filename);
				return utils.sendError(req,res,exports.DOCUMENT_NOT_RENDERED);
			}
		);
	});
}

function sendFile(req, res, filename){
	fs.readFile(filename, "binary", function(err, file) {  
		if(err)return utils.sendError(req,res,err);
		
		res.sendHeader(200, {'Content-Type': 'application/pdf'});
		res.write(file, "binary");  
		res.end();
	});
}

function updateDoc(req,res){
	auth.processAuth(req,res, function(params){
		var docID = url.parse(req.url).pathname.split("/")[2];
		var filename = path.join("tmp", docID, docID + ".tex");
		Step(
			function checkDocAuth(){
				docs.checkAuthorized(docID, params.user.userID);
			},
			function checkDir(err, authorized){
				if(err)return utils.sendError(req,res,err);
				if(!authorized)return utils.sendError(req,res,auth.NOT_AUTHORIZED);
				fs.stat("tmp/"+docID, this);
			},
			function openFile(err, stats){
				if(err)return utils.sendError(req,res,err,404);
				if(!stats.isDirectory())return utils.sendError(req,res,"document not present on server");
				fs.open(filename, 'w+', 438, this);
			},
			function doWriting(err, fd){
				if(err)return utils.sendError(req,res,err);
				var buffer = "";
				req.addListener('data', function(chunk){
					fs.write(fd, chunk, 0, chunk.length, null, null);
					buffer += chunk;
				});
				req.addListener('end', function(){
					fs.close(fd);
					requestNumber = counter++;

					message = JSON.stringify({
						"class": "LatexRenderer",
						"args": [ {"node_id": requestNumber, "doc": docID} ]
					});
					
					docs.setDocText(docID, buffer);

					redis.rpush('resque:queue:renders', message);
					queuedRes[requestNumber] = res;
				});
			}
		);
	});
}

function popFromQueue() {
	redis.lpop('responses', handleResponse);
}

function handleResponse(err, result) {
	if (result == null) {
		setTimeout(function() { popFromQueue(); }, 100);
	} else {
		sys.puts("Processing");
		json = JSON.parse(result.toString());
		var requestNumber = json.node_id;
		var doc = json.doc;
		res = queuedRes[requestNumber];
		send_file(null, res, path.join("tmp", doc, doc + ".pdf"));
		delete queuedRes[requestNumber];
		popFromQueue();
	}
}