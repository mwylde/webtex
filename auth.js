var sys = require('sys'),
	http = require('http'),
	kiwi = require('kiwi'),
	url = require('url'),
	fs = require('fs'),
	path = require("path"),
	utils = require('./utils'),
	Step = require('./step'),
	redis = kiwi.require('redis-client').createClient(),
	hashlib = kiwi.require('hashlib');
	
exports.USER_DATA_NOT_SENT = "user_data_not_sent";
exports.NOT_AUTHORIZED = "not_authorized";
exports.USERNAME_EXISTS = "username_exists";

exports.doUser = function(req, res){
	switch(req.method)
	{
		case "PUT":
			exports.createUser(req,res);
			break;
		case "POST":
			exports.login(req,res);
			break;
		default:
			sys.puts("Method: " + req.method);
	}
};

exports.createUser = function(req, res){
	var params = {};
	Step(
		function getJSONData(){
			sys.puts("Are we running step?");
			utils.getJSONData(req, this);
			sys.puts("Are we running step?");
		},
		function checkUsernameExists(err, hash){
			if(err)return utils.sendError(req,res,err);
			params = hash;
			sys.puts("Do we have params? " + params);
			redis.exists('tex:username:' + params.username + ':uid', this);
		},
		function getNextUserID(err, exists){
			if(exists)return utils.sendError(req,res, exports.USERNAME_EXISTS);
			if(err)return utils.sendError(req,res,err);
			redis.incr('nextUserID', this);
		},
		function createUser(err, userID){
			if(err)return utils.sendError(req,res,err);
			setUserField(userID, "username", params.username, this.parallel());
			setUserField(userID, "password", passHash(params.password), this.parallel());
			setUserField(userID, "email", params.email, this.parallel());
			redis.set('tex:username:' + params.username + ':uid', nextUserID, this.parallel());
		},
		function sendUserHash(err){
			if(err)return utils.sendError(req,res,err);
			return getUserHash(err, req, res, userID, utils.sendJSON);
		}
	);
};

exports.login = function(req, res){
	var params = {};
	Step(
		function getJSONData(){
			utils.getJSONData(req, this);
		},
		function getUserID(err, hash){
			if(err)return utils.sendError(req,res,err);
			params = hash;
			userIDFromUsername(params.username, this);
		},
		function checkPassword(err, userID){
			if(err)return utils.sendError(req,res,err);
			checkPassword(userID, params.password, this);
		},
		function sendUserHash(err, isValid){
			getUserHash(err, req, res, userID, utils.sendJSON);
		}
	);
};

exports.logout = function(req, res){
	exports.processAuth(req,res,function(params){
		unsetAuth(params.userID);
		return utils.sendJSON(err, req, res, {'result' : 'user_logged_out'});
	});
};

exports.processAuth = function(req, res, callback){
	utils.getJSONData(req, function(err, hash){
		if(!hash.user)utils.sendError(req,res,exports.USER_INFO_NOT_SENT, 400);
		checkAuth(hash.user.userID, hash.user.authtoken, function(err, correct){
			if(err)return utils.sendError(req,res,err);
			if(!correct)return utils.sendError(req,res,exports.NOT_AUTHORIZED, 401);
			callback(hash);
		});
	});
};

exports.checkAuth = function(userID, auth, callback){
	getUserField(userID, "authtoken", function(err, result){
		callback(err, auth == result);
	});
};

exports.stepCheckAuth = function(err, hash){
	if(!hash.user)this(exports.USER_INFO_NOT_SENT, false);
	exports.checkAuth(hash.user.userID, hash.user.authtoken, function(err, correct){
		this(err, hash, correct);
	});
};

function unsetAuth(id){
	redis.del(uidField(id, "authtoken"));
}

function setUserField(id, field, value, callback){
	redis.set(uidField(id, field), value, callback);
}

function getUserField(id, field, callback){
	redis.get(uidField(id, field), callback);
}

function getUserFields(id, fields, callback){
	args = fields.map(function(field){
		return 'tex:uid:' + id + ':' + field;
	});
	args.push(callback);
	redis.mget.apply(query);
}

function getUserHash(err, req, res, userID, callback){
	hash = {};
	hash.userID = userID;
	fields = ['username', 'email', 'authtoken', 'permissions'];
	warmAuthCode(userID, function(err, result){
		getUserFields(userID, fields, function(err, results){
			var iter = 0;
			fields.forEach(function(field) {
				hash[field] = results[iter];
				iter++;
			});
			callback(err, req, res, hash);
		});
	});
}

function warmAuthCode(userID, callback){
	var authField = uidField(userID, 'authtoken');
	redis.exists(authField, function(err, exists){
		if(exists)return callback(err, false);
		var authtoken = hashlib.sha1(Math.random() * 1000 + new Date);
		redis.set(authField, function(err, result){
			redis.expire(authField, 24 * 60 * 60);
			callback(err, true);
		});
	});
}

function uidField(userID, field){
	return 'tex:uid:' + userID + ':' + field;
}

function userIDFromUsername(username, callback){
	redis.get('tex:username:' + username +':uid', callback);
}

function checkPassword(userID, putativePassword, callback){
	getUserField(userID, "password", function(err, password){
		callback(err, passHash(putativePassword) == password);
	});
}

function passHash(password){
	return hashlib.sha256("a2961493b7" + password + "b5480dd76df");
}