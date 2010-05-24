/**
* Based on node-uuid.js http://gist.github.com/393456
*
* Generates a new UUID and passes it to the given callback function.
*
* Calls uuid.sh - make your own depending on your system. I followed an example here: http://www.redleopard.com/2010/03/bash-uuid-generator/
*
* Callback signature is function(err, uuid).
*/
exports.create_uuid = (function() {
    var spawn = require('child_process').spawn;
    var sys = require('sys');
    var uuids = [];
    var generating = false;
    var spooledCallbacks = [];
    var top_up_cache = function() {
        var uuid_call = spawn('./uuid.sh');

        // When data arrives split it and cache it.
        uuid_call.stdout.addListener('data', function(data) {
            var result = data.toString();
            result = result.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            var uuids_returned = result.split('\n');
            uuids = uuids.concat(uuids_returned);
        });

        // Pass errors up immediately (i.e. the error callback might
        // be called more than once).
        uuid_call.stderr.addListener('data', function(data) {
            while(spooledCallbacks.length > 0){
                spooledCallbacks.pop()(new Error("uuid generation failed"), null);
            }
        });

        // If we're done, call the callback with the uuid.
        uuid_call.addListener('exit', function(code) {
            if (code != 0) {
                while(spooledCallbacks.length > 0){
                    spooledCallbacks.pop()(new Error("uuid generation failed"), null);
                }
            } else {
                while(spooledCallbacks.length > 0 && uuids.length > 0){
                    spooledCallbacks.pop()(null, uuids.pop());
                }
                
                if(uuids.length <= 0){
                    top_up_cache();
                } else {
                    generating = false;
                }
                
            }
        });
    };

    // Calls the given function with a UUID when one is calculated.
    // Callback signature is function(err, uuid).
    return function(callback) {
        if (uuids.length > 0) {
            callback(null, uuids.pop());
            return;
        } else{
            spooledCallbacks.push(callback);
            if(!generating){
                generating = true;
                // We need to top up our cache before returning.
                top_up_cache();
            }
        }
    };
})();