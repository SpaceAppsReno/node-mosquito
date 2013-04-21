var gesture = ('undefined' === typeof module ? {} : module.exports);
(function() {

    /**
     * cc.gesture
     * MIT Licensed
     */

    (function(exports, global) {

		// Store frame for motion functions
		var previousFrame = null;

		// Setup Leap loop with frame callback function
		var controllerOptions = {enableGestures: true};

		var handDirection;
		var handPalmNormal;
		var handPalmPosition;
		var handPalmVelocity;
		var handSphereCenter;
		var handSphereRadius;
		var rotationAxis;
		var rotationAngle;
		var translation;
		var scaleFactor;

		var leftMotorArray = new Array();
		var rightMotorArray = new Array();
		var topMotorArray = new Array();
		var motorArrayLength = 5;
		var leftMotor = 0;
		var rightMotor = 0;
		var topMotor = 0;
		var betaSensitivity = 0.5;
		var gammaSensitivity = 0.3;
		var deltaSensitivity = 0.5;


		var defaultHost = 'api.pinocc.io';
		var defaultControlTopic = 'erictj/3pi-control';
		var defaultTelemetryTopic = 'erictj/3pi-telemetry';
		
		var controlTopic = defaultControlTopic;
		var telemetryTopic = defaultTelemetryTopic;

		var maxForwardBack = 50;
		var maxLeftRight = 50;
		var maxUpDown = 50;
		
		var host;
		var controlTopic;
		var telemetryTopic;
		
		var socket;
    
 		 /**
         * gesture namespace.
         *
         * @namespace
         */

        var gesture = exports;

        /**
         * gesture version
         *
         * @api public
         */

        gesture.version = '0.0.1';
        

        /**
         * gesture armed - will send messages to device
         *
         * @api public
         */

        gesture.armed = false;
        
        /**
         * gesture online - connection established to socket server
         *
         * @api public
         */
		gesture.online = false;
		
		gesture.MODE_ROVER = 1;
		gesture.MODE_OPENROV = 2;
		
		gesture.mode = gesture.MODE_ROVER;
         

        /**
         * Manages connections to hosts.
         *
         * @param {String} host - default 'api.pinocc.io'
         * @param {String} controlTopic - defualt 'erictj/3pi-control'
         * @param {String} telemetryTopic - default 'erictj/3pi-telemetry'
         * @api public
         */

		gesture.connect = function(host, controlTopic, telemetryTopic) {
			if(host == null || host == undefined) {
				host = defaultHost;
			}
			if(controlTopic == null || controlTopic == undefined) {
				controlTopic = defaultControlTopic;
			}
			if(telemetryTopic == null || telemetryTopic == undefined) {
				telemetryTopic = defaultTelemetryTopic;
			}
			/*
			socket = io.connect(host);
			socket.on('connect', function () {
				console.log("Connected to: " + host);
				gesture.online = true;
			});

			socket.on('disconnect', function () {
				console.log("Disconnected from: " + host);
				gesture.online = false;
			});
			*/
		};
		
		gesture.allStop = function() {
			var message = {
			  "Motor1": 0,
			  "Motor2": 0,
			  "Motor3": 0
			}	
			GetUnity().SendMessage("JavaScriptClient", "HandleMessage", JSON.stringify(message));			
			console.log('all stop: ' + JSON.stringify(message));
		}
		
		gesture.disconnect = function() {
			gesture.allStop();
			socket.disconnect();
		};

        /**
         * Checks for LEAP JavsScript client library
         *
         * @api public
         */
		gesture.checkLibrary = function() {
		  if (typeof Leap === "undefined") {
			alert("The Leap JavaScript client library (leap.js file) was not found. Please download the latest version from the GitHub project at https://github.com/leapmotion/leapjs");
			return false;
		  }
		  return true;
		};
		

		var tilt = function(forwardBack, leftRight, upDown) {
		//    console.log('tilt: ' + forwardBack + ' - leftRight: ' + leftRight);
			if (!gesture.armed) {
				return;
			}
			forwardBack = forwardBack * -1;
			var forward = (forwardBack * betaSensitivity).toFixed(0);
			var turn = (leftRight * gammaSensitivity).toFixed(0);
			var top = (upDown * deltaSensitivity).toFixed(0);

			leftMotorArray.push((+forward) + (+turn));
			if (leftMotorArray.length >= motorArrayLength) {
				leftMotorArray.shift();
			}
			rightMotorArray.push((+forward) + (+turn * -1));
			if (rightMotorArray.length >= motorArrayLength) {
				rightMotorArray.shift();
			}
			topMotorArray.push(+top);
			if (topMotorArray.length >= motorArrayLength) {
				topMotorArray.shift();
			}
		};

		setInterval(function() {
			if (!gesture.armed) {
				return;
			}
			
			for (var i=0; i < leftMotorArray.length; i++) {
				leftMotor += leftMotorArray[i];
			}
			for (var j=0; j < rightMotorArray.length; j++) {
				rightMotor += rightMotorArray[j];
			}
			for (var j=0; j < topMotorArray.length; j++) {
				topMotor += topMotorArray[j];
			}

			leftMotor = (+leftMotor) / leftMotorArray.length;
			rightMotor = (+rightMotor) / rightMotorArray.length;
			topMotor = (+topMotor) / topMotorArray.length;

			leftMotor = +(leftMotor.toFixed());
			rightMotor = +(rightMotor.toFixed());
			topMotor = +(topMotor.toFixed());
			
			if(gesture.mode == gesture.MODE_ROVER) {			
				var message = { 
					topic: controlTopic,
					message: leftMotor + ':' + rightMotor
				};
				socket.emit('publish', message);
				console.log('publish: ' + JSON.stringify(message));
			}
			else if(gesture.mode == gesture.MODE_OPENROV) {
				var message = {
				  "Motor1": leftMotor,
				  "Motor2": rightMotor,
				  "Motor3": topMotor
				}	
				GetUnity().SendMessage("JavaScriptClient", "HandleMessage", JSON.stringify(message));			
				console.log('publish: ' + JSON.stringify(message));
			}
			else {
				console.log('Publish failed: unknown mode');
			}
		}, 500);


		Leap.loop(controllerOptions, function(frame) {
			if (!gesture.armed) {
				return;
			}
		  
		  // Display Hand object data
		  if (frame.hands.length > 0) {
			for (var i = 0; i < frame.hands.length; i++) {
			  var hand = frame.hands[i];

			  handDirection = hand.direction;
			  handPalmNormal = hand.palmNormal;
			  handPalmPosition = hand.palmPosition;
			  handPalmVelocity = hand.palmVelocity;
			  handSphereCenter = hand.sphereCenter;
			  handSphereRadius = hand.sphereRadius;

			  // Hand motion factors
			  if (previousFrame) {
				translation = hand.translation(previousFrame);

				rotationAxis = hand.rotationAxis(previousFrame, 2);
				rotationAngle = hand.rotationAngle(previousFrame);

				scaleFactor = hand.scaleFactor(previousFrame);
			  }

			  var forwardBack = handPalmPosition[0];
			  var upDown = handPalmPosition[1];
			  var leftRight = handPalmPosition[2];
	  
			  if(forwardBack > maxForwardBack) {
				forwardBack = maxForwardBack;
			  }
			  else if(forwardBack < -maxForwardBack) {
				forwardBack = -maxForwardBack;
			  }
			  if(leftRight > maxLeftRight) {
				lefteftRight = maxLeftRight;
			  }
			  else if(leftRight < -maxLeftRight) {
				leftRight = -maxLeftRight;
			  }
			  if(upDown > maxUpDown) {
				upDown = maxUpDown;
			  }
			  else if(upDown < -maxUpDown) {
				upDown = -maxUpDown;
			  }
	  
			  tilt(forwardBack, leftRight, upDown);

			}
		  }
		  else {
			tilt(0, 0, 0);
		  }

		  // Store frame for motion functions
		  previousFrame = frame;
		});
	})('object' === typeof module ? module.exports : (this.gesture = {}), this);
})();