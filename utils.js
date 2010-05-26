var sys = require('sys');

exports.getData = function(req,callback){
	var buffer = "";
	req.addListener('data', function(chunk){
		buffer += chunk;
	});
	req.addListener('end', function(){
		sys.puts("Is it at least ending?");
		callback(buffer);
	});
};

exports.getJSONData = function(req, callback){
	sys.puts("Have we calling?");
	exports.getData(req, function(data){
		sys.puts("Have we got ze data? " + data);
		var params = JSON.parse(data);
		if(params){
			callback(null, params);
		}
		else
		{
			callback("invalid_params", null);
		}
	});
};

exports.sendError = function(req,res,err,code){
	if(!code)code = 500;
	res.writeHeader(code, {'Content-Type': 'application/json'});
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