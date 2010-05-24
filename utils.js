exports.getData = function(req,callback){
	var buffer = "";
	req.addListener('data', function(chunk){
		buffer += chunk;
	});
	req.addListener('end', function(){
		callback(buffer);
	});
};

exports.sendError = function(req,res){
	res.writeHeader(500, {'Content-Type': 'application/json'});
	res.write(JSON.stringify({"error" : err}));
	res.end();
};

exports.sendJSON = function(err, req, res, data){
	if(err){
		res.writeHeader(500, {'Content-Type': 'application/json'});
		res.write(JSON.stringify({"error" : err}));
		res.end();
	}
	else {
		res.writeHeader(200, {'Content-Type': 'application/json'});
		var json = JSON.stringify(data);
		res.write(json + "\n");
		res.end();
	}
};