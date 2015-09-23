// evr-client.js

;(function() {

	var _apiVer = 0;
	var _sessionID;
	var _startTime;
	var _debug = true;
	var _apiUrl = _debug ?
		'http://mikebook.local:8080/v1' :
		'http://api.easevr.com/v1';
	var _events = [];
	var _autoPushInterval;
	var _logPushes;

	EaseVR = {

		sessionStart: function(
/*
			deviceID,
			hmdName,
			hmdVersion,
			osName,
			cpuName,
			cpuCores,
			systemMemory,
			gpuName,
			gpuMemory,
			graphicsDriver
*/
		) {
			_sessionID = this.generatePushID();
			_startTime = +new Date;
			this.addEvent( 'ST', arguments );
		},

		sessionEnd: function() {
			this.addEvent( 'SE' );
			this.pushEvents();
		},

		markerAdd: function(
/*
			name,
			posX, posY, posZ
*/
		) {
			this.addEvent( 'MA', arguments );
		},

		markerRemove: function(
/*
			name,
			posX, posY, posZ
*/
		) {
			this.addEvent( 'MR', arguments );
		},

		markerEnter: function(
/*
			name,
			posX, posY, posZ
*/
		) {
			this.addEvent( 'ME', arguments );
		},

		markerExit: function(
/*
			name,
			posX, posY, posZ
*/
		) {
			this.addEvent( 'MX', arguments );
		},

		presence: function(
/*
			name,
			posX, posY, posZ,
			rotX, rotY, rotZ,
			framesPerSecond,
			memoryUsed
*/
		) {
			this.addEvent( 'P', arguments );
		},

		addEvent: function( type, fields ) {
			fields = fields || [];
			var cols = [ type, +new Date - _startTime ];
			for( var i = 0;  i < fields.length;  i++ ) {
				cols.push(
					String.prototype.replace.call(
						fields[i], /[\t\n]/g, ' '
					)
				);
			}
			_events.push( cols.join('\t') );
		},

		autoPush: function( interval ) {
			clearInterval( _autoPushInterval );
			setInterval( this.pushEvents, _autoPushInterval );
		},

		logPushes: function( enable ) {
			_logPushes = enable;
		},

		pushEvents: function() {
			if( _events.length == 0 ) return;

			var payload =
				'H\t' +
				_startTime + '\t' +
				_apiVer + '\t' +
				'mike_APIKEY' + '\t' +
				_sessionID + '\n' +
				_events.join( '\n' );

			_events = [];

			var url = _apiUrl + '/client/' +'GUID_TODO' + '/events';

			if( _logPushes ) {
				console.log( 'Easvr push to ' + url + '\n' + payload );
			}

			var request = new XMLHttpRequest;
			request.onload = function( e ) {
				console.log( 'loaded' );
			};
			request.open( 'POST', url );
			request.setRequestHeader( 'Content-Type', 'text/plain;charset=UTF-8' );
			request.send( payload );
		}
	};

	// PushID generator from:
	// https://gist.github.com/mikelehen/3596a30bd69384624c11
	// https://www.firebase.com/blog/2015-02-11-firebase-unique-identifiers.html

	/**
	 * Fancy ID generator that creates 20-character string identifiers with the following properties:
	 *
	 * 1. They're based on timestamp so that they sort *after* any existing ids.
	 * 2. They contain 72-bits of random data after the timestamp so that IDs won't collide with other clients' IDs.
	 * 3. They sort *lexicographically* (so the timestamp is converted to characters that will sort properly).
	 * 4. They're monotonically increasing.  Even if you generate more than one in the same timestamp, the
	 *    latter ones will sort after the former ones.  We do this by using the previous random bits
	 *    but "incrementing" them by 1 (only in the case of a timestamp collision).
	 */
	EaseVR.generatePushID = (function() {
		// Modeled after base64 web-safe chars, but ordered by ASCII.
		var PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
	
		// Timestamp of last push, used to prevent local collisions if you push twice in one ms.
		var lastPushTime = 0;
	
		// We generate 72-bits of randomness which get turned into 12 characters and appended to the
		// timestamp to prevent collisions with other clients.  We store the last characters we
		// generated because in the event of a collision, we'll use those same characters except
		// "incremented" by one.
		var lastRandChars = [];
	
		return function() {
			var now = new Date().getTime();
			var duplicateTime = ( now === lastPushTime );
			lastPushTime = now;
	
			var timeStampChars = new Array(8);
			for( var i = 7;  i >= 0;  i-- ) {
				timeStampChars[i] = PUSH_CHARS.charAt( now % 64 );
				// NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
				now = Math.floor( now / 64 );
			}
			if( now !== 0 ) throw new Error( 'We should have converted the entire timestamp.' );
	
			var id = timeStampChars.join('');
	
			if( ! duplicateTime ) {
				for( i = 0;  i < 12;  i++ ) {
					lastRandChars[i] = Math.floor( Math.random() * 64 );
				}
			} else {
				// If the timestamp hasn't changed since last push, use the same random number, except incremented by 1.
				for( i = 11;  i >= 0 && lastRandChars[i] === 63;  i-- ) {
					lastRandChars[i] = 0;
				}
				lastRandChars[i]++;
			}
			for( i = 0;  i < 12;  i++ ) {
				id += PUSH_CHARS.charAt( lastRandChars[i] );
			}
			if( id.length != 20 ) throw new Error( 'Length should be 20.' );
	
			return id;
		};
	})();

})();
