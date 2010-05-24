var sys = require('sys'),
	http = require('http'),
	kiwi = require('kiwi'),
	url = require('url'),
	fs = require('fs'),
	path = require("path"),
	utils = require('./utils'),
	uuid = require('./uuid'),
	redis = kiwi.require('redis-client').createClient(),
	hashlib = kiwi.require('hashlib');

//All requests should have a field {'auth':12jlk12j4}, where that is the auth-token
//callback has form function(err, user_hash)
exports.create_user = function(req, res){
	utils.getData(req, function(data){
		/* params should look like this:
		{
			username: 'mwylde',
			password: 'thisismypassword',
			email: 'mwylde@wesleyan.edu'
		}
		*/
		params = JSON.parse(data);
		redis.incr('nextUserID', function(err, nextUserID){
			if(err){ utils.sendError(req,res,err); return; }
			redis.exists('tex:username:' + params.username + ':uid', function(err, exists){
				if(exists){ utils.sendError(req,res, "username_exists"); return;}
				if(!err){
					setUserField(nextUserID, "username", params.username);
					setUserField(nextUserID, "password", passHash(params.password));
					setUserField(nextUserID, "email", params.email);
					redis.set('tex:username:' + params.username + ':uid', nextUserID);
				}
				getUserHash(err, req, res, nextUserID, utils.sendJSON);
			});
		});
	});
};

exports.login = function(req, res){
	utils.getData(req, function(data){
		params = JSON.parse(data);
		userIDFromUsername(params.username, function(err, userID){
			if(err){ utils.sendError(req,res,err); return; }
			checkPassword(userID, params.password, function(err, isValid){
				if(!isValid){utils.sendError(req,res,"password_incorrect"); return;}
				getUserHash(err, req, res, nextUserID, utils.sendJSON);
			});
		});
	});
};

exports.logout = function(req, res){
	utils.getData(req, function(data){
		params = JSON.parse(data);
		
	});
};

function setUserField(id, field, value){
	redis.set('tex:uid:' + id + ':' + field, value);
}

function getUserField(id, field, callback){
	redis.get('tex:uid:' + id + ':' + field, callback);
}

function getUserFields(id, fields, callback){
	args = fields.map(function(field){
		return 'tex:uid' + id + ':' + field;
	});
	args.push(callback);
	redis.mget.apply(query);
}

function getUserHash(err, req, res, userID, callback){
	hash = {};
	hash.userID = userID;
	fields = ['username', 'email', 'authtoken', 'authdate', 'permissions'];
	getUserFields(userID, fields, function(err, results){
		var iter = 0;
		fields.forEach(function(field) {
			hash[field] = results[iter];
			iter++;
		});
		if(authDate < Date.now()){
			newAuth = warmAuthCode();
			hash.authtoken = newAuth[0];
			hash.authdate = newAuth[1];
		}
		callback(err, req, res, hash);
	});
}

function warmAuthCode(err, req, res, userID){
	var authtoken = hashlib.sha1(Math.random() * 1000 + new Date);
	var authdate  = Date.now() + 24 * 60 * 60 * 1000;
	setUserField(userID, 'authtoken', authtoken);
	setUserFIeld(userID, 'authdate', authdate);
	return [authtoken, authdate];
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

exports.login = function(req,res){
	
};