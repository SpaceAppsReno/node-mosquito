var gesture = ('undefined' === typeof module ? {} : module.exports);

var myHand = null;
var handForwardBack = 0;
var handLeftRight = 0;
var pausedFrame = null;
var latestFrame = null;
var last = 0;
var updatePeriod = 100;
var xRangeCutoff = 0.25;
var phiRangeCutoff = Math.PI / 6;
var controller = new Leap.Controller({enableGestures: true});

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

	    var forwardBack = 0;
	    var handPalmPositionZ = 0;
	    var upDown = 0;
	    var handPalmPositionY = 0;
	    var leftRight = 0;
	    var handPalmPositionX = 0;

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
		var deltaSensitivity = 0.2;

		var previousDeltaY = 0;

		var defaultHost = 'api.pinocc.io';
		var defaultControlTopic = 'erictj/3pi-control';
		var defaultTelemetryTopic = 'erictj/3pi-telemetry';

		var controlTopic = defaultControlTopic;
		var telemetryTopic = defaultTelemetryTopic;

		var maxForwardBack = 20;
		var maxLeftRight = 20;
		var maxUpDown = 20;

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
			socket = io.connect(host);
			socket.on('connect', function () {
				console.log("Connected to: " + host);
				gesture.online = true;
			});

			socket.on('disconnect', function () {
				console.log("Disconnected from: " + host);
				gesture.online = false;
			});
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

				var telemetryMessage = {
					topic: telemetryTopic,
					message: message
				};

				socket.emit('publish', telemetryMessage);
				console.log('publish: ' + JSON.stringify(telemetryMessage));

			}
			else {
				console.log('Publish failed: unknown mode');
			}
		}, 500);


		controller.loop(function(frame) {
		//Leap.loop(controllerOptions, function(frame) {
			latestFrame = frame;
			var html = "<div>Hand? " + (frame.hands.length > 0) + "</div>";

			if (!pausedFrame) {
				myHand = new HandData(frame, 0, 10);

				if (myHand.hand == null) {
					myHand = null;
				}

				var event = document.createEvent("Event");
				event.initEvent("tiltleap",true,true);
				event.forward = 0;
				event.yaw = 0;
				event.pitch = 0;

				if (myHand != null) {
					html += "<div>Direction: " + myHand.x + "," + myHand.y + "," + myHand.z + "</div>";
					html += "<div>Sampled: " + myHand.sampledX + "," + myHand.sampledY + "," + myHand.sampledZ + "</div>";
					html += "<div>Radius: " + myHand.radius + "</div>";
					html += "<div>SampledRadius: " + myHand.sampledRadius + "</div>";

					var r = Math.sqrt(myHand.x * myHand.x + myHand.y * myHand.y + myHand.z * myHand.z);
					//var theta = Math.acos(myHand.z / r);  // unused
					var coPhi = (Math.PI / 4) - Math.atan(myHand.y / myHand.x);

					if (myHand.x < -xRangeCutoff) {
						event.forward = 0;
						event.yaw = -10;
					} else if (myHand.x > xRangeCutoff) {
						event.forward = 0;
						event.yaw = 10;
					} else {
						event.forward = 10;
						event.yaw = 0;

						if (coPhi < -phiRangeCutoff) {
							event.pitch = -10;
						} else if (coPhi > phiRangeCutoff) {
							event.pitch = 10;
						}
					}
				}

				//document.dispatchEvent(event);
				tilt(-event.forward, event.yaw, event.pitch);
			}

			var date = new Date();
			var now = date.getTime();

			if (now < last + updatePeriod) {
				return;
			}

			//document.getElementById('out').innerHTML = html;
			last = now;
/*
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
// 			  console.log('handPalmPosition: ' + handPalmPosition);

			  if(Math.abs(+handPalmPosition[0]-handPalmPositionZ) > 15) {
			    handPalmPositionZ = handPalmPosition[0];
			    forwardBack = handPalmPositionZ;
			  }

			  if(Math.abs(+handPalmPosition[1]-handPalmPositionY) > 10) {
			    handPalmPositionY = handPalmPosition[1];
       		    upDown = handPalmPositionY;
			  }
			  else {
			  	upDown = 0;
			  }

			  if(Math.abs(+handPalmPosition[2]-handPalmPositionX) > 15) {
			    handPalmPositionX = handPalmPosition[2];
			    leftRight = handPalmPositionX;
			  }

			  handPalmVelocity = hand.palmVelocity;
			  handSphereCenter = hand.sphereCenter;
			  handSphereRadius = hand.sphereRadius;

			  // Hand motion factors
			  if (previousFrame) {
				translation = hand.translation(previousFrame);
//				console.log('translation: ' + translation);

				if(Math.abs((translation[1] - previousDeltaY)) > 2) {
					upDown = handPalmPosition[1];
				}
				previousDeltaY = translation[1];

				rotationAxis = hand.rotationAxis(previousFrame, 2);
//				console.log('rotationAxis: ' + rotationAxis);

				rotationAngle = hand.rotationAngle(previousFrame);
//				console.log('rotationAngle: ' + rotationAngle);

				scaleFactor = hand.scaleFactor(previousFrame);
//				console.log('scaleFactor: ' + scaleFactor);

			  }

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
*/
		});
	})('object' === typeof module ? module.exports : (this.gesture = {}), this);
})();

function HandData(frame, index, numSamples) {
	if (frame.hands.length <= index || !frame.hands[index].valid) {
		return null;
	}

	var hand = frame.hands[index];

	this.hand = hand;
	this.x = hand.direction[0];
	this.y = hand.direction[1];
	this.z = hand.direction[2];
	this.radius = hand.sphereRadius;

	var samples = 0;
	var x = 0;
	var y = 0;
	var z = 0;
	var rad = 0;

	for (var i = 1; i <= numSamples; i++) {
		var f = controller.frame(i);

		if (f.hands.length <= index || !f.hands[index].valid) {
			continue;
		}

		var oldHand = f.hands[index];

		samples++;
		x += oldHand.direction[0];
		y += oldHand.direction[1];
		z += oldHand.direction[2];
		rad += oldHand.sphereRadius;
	}

	if (samples > 0) {
		this.sampledX = x / samples;
		this.sampledY = y / samples;
		this.sampledZ = z / samples;
		this.sampledRadius = rad / samples;
	}
}
