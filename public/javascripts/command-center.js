// TODO evil globals
var power = {
    idle: 0,
    band: 100,
};
var topic = 'erictj/3pi-control';

var messageMaker = function(left, right) {
    return [
        String(parseInt(left)),
        String(parseInt(right))
    ].join(":");
};

// Keyboard Input
// ==============

var KeyboardInput = Backbone.View.extend({
    el: 'html',
    events: {
        'keydown': 'onKeyDown',
        'keyup': 'onKeyUp',
    },
    initialize: function(options) {
        this.activeKeys = [];
        // WASD, 87, 65, 83, 68
        this.allowed_keys = [87, 65, 83, 68, 77, 75];
        this.listenTo(Backbone, 'blur', this.clearKeys);

        // Attach the given socket to this
        this.socket = options.socket;

        // Create the motor messages
        this.zero_message = this.makeMessage(power.idle, power.idle);
        this.last_message = "";
    },
    startInput: function() {
        this.listenTo(Backbone, 'evtloop', this.sendKeys);
        // Clear the last message
        this.last_message = "";
    },
    stopInput: function() {
        this.stopListening(Backbone, 'evtloop', this.sendKeys);
    },
    filterKeys: function(key) {
        return ~$.inArray(key, this.allowed_keys);
    },
    onKeyDown: function(evt) {
        if (!this.filterKeys(evt.keyCode)) return;

        if (~$.inArray(evt.keyCode, this.activeKeys)) {
            // Do nothing
        } else {
            // Add key
            this.activeKeys.push(evt.keyCode);
        }
    },
    onKeyUp: function(evt) {
        if (!this.filterKeys(evt.keyCode)) return;

        if (~$.inArray(evt.keyCode, this.activeKeys)) {
            // TODO index call can take the place of the inArray
            var index = this.activeKeys.indexOf(evt.keyCode);
            this.activeKeys.splice(index, 1);
            // Remove the key
        } else {
            // Do nothing
        }
    },
    clearKeys: function() {
        this.activeKeys = [];
    },
    sendKeys: function() {
        // Get the active keys and translate that into a motor speed
        // TODO power is a global
        var left_motor = power.idle;
        var right_motor = power.idle;
        var y_motor = power.idle;

        // Lookup, not search!
        // If W (87), increase both motors by 1/4 (max - min)
        var forward = ~$.inArray(87, this.activeKeys);
        if (forward) {
            left_motor += power.band / 6;
            right_motor += power.band / 6;
        }
        
        var upwards = ~$.inArray(77, this.activeKeys);
        if(upwards) {
           y_motor -= power.band / 2; 
        }
        var downwards = ~$.inArray(75, this.activeKeys);
        console.log(this.activeKeys, downwards);
        if(downwards) {
            y_motor += power.band / 2; 
        }

        var backward = ~$.inArray(83, this.activeKeys);
        if (backward) {
            left_motor -= power.band / 6;
            right_motor -= power.band / 6;
        }
        var left = ~$.inArray(65, this.activeKeys);
        var right = ~$.inArray(68, this.activeKeys);
        if (right && left) {
            // Add nothing
        } else if (right) {
            // If D (68), increase left motor by 1/4 and right motor by 1/8
            if (forward) {
                right_motor -= power.band / 10;
            } else if (backward) {
                right_motor += power.band / 10;
            } else {
                left_motor += power.band / 6;
                right_motor -= power.band / 6;
            }
        } else if (left) {
            // If A (65), increase left motor by 1/8 and right motor by 1/4
            if (forward) {
                left_motor -= power.band / 10;
            } else if (backward) {
                left_motor += power.band / 10;
            } else {
                right_motor += power.band / 6;
                left_motor -= power.band / 6;
            }
        }
        // Emit the socket command for motor power
        // Do not repeat zero messages
        var message = this.makeMessage(left_motor, right_motor);

        // TODO Common socket object?
        if (!(this.last_message == this.zero_message && message == this.zero_message)) {
            // Send new message
            console.log('sending:', message);
            this.socket.emit('publish', {topic: topic, message: message});
        }
        
         //Emit to Unity
         var unityMessage = {
		  "Motor1": parseInt(left_motor),
		  "Motor2": parseInt(right_motor),
		  "Motor3": parseInt(y_motor)
		}
		console.log(unityMessage);
		GetUnity().SendMessage("JavaScriptClient", "HandleMessage", JSON.stringify(unityMessage));
        
        this.last_message = message;
    },
    makeMessage: messageMaker,
});

var LeapInput = Backbone.View.extend({
    initialize: function(options) {
         this.socket = options.socket;
     },
     startInput: function() {
        console.log("Starting leap input");
        gesture.mode = gesture.MODE_OPENROV;
 		gesture.armed = true;
 		gesture.checkLibrary();
     	gesture.connect(); // using default values for; host URI; control and telemetry topics
     },
     stopInput: function() {
        console.log("Stopping leap input");
        gesture.mode = gesture.MODE_OPENROV;
        gesture.armed = false;
 		gesture.allStop(); 
 		gesture.disconnect();   
 	},
});


// Accelerometer Input
// ===================
var AccelerometerInput = Backbone.View.extend({
    // TODO bind to window and add event
    initialize: function(options) {
        this.socket = options.socket;

        // listen for global tilt events
        this.listenTo(Backbone, 'tilt', this.tilt);

        // Motor arrays
        this.leftMotorArray = new Array();
        this.rightMotorArray = new Array();

        // Create the motor messages
        this.zero_message = this.makeMessage(power.idle, power.idle);
        this.last_message = "";
    },
    tilt: function(forwardBack, leftRight) {
        // TODO move to this
        var betaSensitivity = 0.5;
        var gammaSensitivity = 0.3;
        var motorArrayLength = 5;

        forwardBack = forwardBack * -1;
        var forward = (forwardBack * betaSensitivity).toFixed(0);
        var turn = (leftRight * gammaSensitivity).toFixed(0);

        // TODO update view using render
        $('#forward-amount').html(forward);
        $('#turn-amount').html(turn); 

        this.leftMotorArray.push((+forward) + (+turn));
        if (this.leftMotorArray.length >= motorArrayLength) {
            this.leftMotorArray.shift();
        }
        this.rightMotorArray.push((+forward) + (+turn * -1));
        if (this.rightMotorArray.length >= motorArrayLength) {
            this.rightMotorArray.shift();
        }
    },
    startInput: function() {
        console.log("Starting accelerometer input");
        // Add the global event loop listener
        this.listenTo(Backbone, 'evtloop', this.sendMessage);
        // Clear the last message
        this.last_message = "";
    },
    stopInput: function() {
        // Remove the global event loop listener
        this.stopListening(Backbone, 'evtloop', this.sendMessage);
    },
    sendMessage: function() {
        var leftMotor = 0;
        var rightMotor = 0;

        for (var i=0; i< this.leftMotorArray.length; i++) {
            leftMotor += this.leftMotorArray[i];
        }
        for (var j=0; j< this.rightMotorArray.length; j++) {
            rightMotor += this.rightMotorArray[j];
        }

        leftMotor = (+leftMotor) / (this.leftMotorArray.length);
        rightMotor = (+rightMotor) / (this.rightMotorArray.length);

        leftMotor = (+leftMotor.toFixed());
        rightMotor = (+rightMotor.toFixed());

        var message = this.makeMessage(leftMotor, rightMotor);

        // TODO common socket send
        if (!(this.last_message == this.zero_message && message == this.zero_message)) {
            // Send new message
            console.log('sending:', message);
            this.socket.emit('publish', {topic: topic, message: message});
            
             //Emit to Unity
             var unityMessage = {
 			  "Motor1": parseInt(leftMotor),
 			  "Motor2": parseInt(rightMotor),
 			  "Motor3": 0
 			}
 			GetUnity().SendMessage("JavaScriptClient", "HandleMessage", JSON.stringify(unityMessage));
        }
        this.last_message = message;

    },
    makeMessage: messageMaker,
});


$(function() {
    // Document Ready
    var framerate = 1000 / 4;

    // Create the socket
    var socket_uri = window.location.origin
    var socket = io.connect(socket_uri);

    // Global event loop
    setInterval(function() {
        Backbone.trigger('evtloop');
    }, framerate);

    // Send a global blur event
    $(window).blur(function() {
        Backbone.trigger('blur');
    });

    // TODO add to accelerometer view
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', function() {
            Backbone.trigger('tilt', event.beta, event.gamma)
            // tilt(event.beta, event.gamma);
        }, true);
    }

    // Create all the interfaces
    // TODO pass other globals here
    var keyboard_interface = new KeyboardInput({socket: socket});
    var accelerometer_interface = new AccelerometerInput({socket: socket});
    var leap_interface = new LeapInput({socket: socket});

    // Input Interfaces
    // TODO should be a registry
    var input_interfaces = {
        'keyboard': keyboard_interface,
        'accelerometer': accelerometer_interface,
        'leap': leap_interface
    };

    // The current input interface
    var current_interface;

    // TODO this is still dumb
    function selectInterface(name) {
        console.log('switching interface to', name);
        if (current_interface) {
            console.log('stopping current interface');
            current_interface.stopInput();
        }
        if (name in input_interfaces) {
            current_interface = input_interfaces[name];
            current_interface.startInput();
        }
    }

    $("#controllers li img").on('click', function() {
        var name = $(this).data("interface");
        console.log('interface:', name);
        selectInterface(name);
    });

    var default_interface = 'keyboard';
    selectInterface(default_interface);

})