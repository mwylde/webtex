var Step = require('./step'),
	kiwi = require('kiwi'),
	redis = kiwi.require('redis-client').createClient();
	
exports.createDoc = function(name, owner, callback){
	var docID;
	Step(
		function getNextDocID(){
			redis.incr('nextDocID', this);
		},
		function createDoc(err, nextDocID){
			if(err)return callback(err, null);
			docID = nextDocID;
			setDocField(docID, "name", name, this.parallel());
			setDocField(docID, "owner", owner, this.parallel());
		},
		function finish(err){
			return callback(err, docID);
		}
	);
};

exports.setDocText = function(docID, text, callback){
	setDocField(docID, "text", text, callback);
};

exports.checkAuthorized = function(docID, userID, callback){
	getDocField(docID, "owner", function(err, owner){
		callback(err, owner == userID);
	});
};

function docField(docID, field){
	return 'tex:doc:' + docID + ':' + field;
}

function setDocField(docID, field, value, callback){
	redis.set(docField(docId, field), value, callback);
}

function getDocField(docID, field, callback){
	redis.get(docField(docID, field), callback);
}