var topic = 'erictj/3pi-control';
var socket;
var interface;

// var power = {
//   min: 0,
//   max: 200,
// };

var power = {
  band: 100,
  idle: 0,
};

var Controls = {};

Controls.Keys = Backbone.Model.extend({
  // Active Keys
});

Controls.Events = Backbone.View.extend({
  el: 'html',
  events: {
    'keydown': 'keydown',
    'keyup': 'keyup',
  },
  initialize: function() {
    this.keys = {};
    this.model.set('active_keys', [])
    // WASD, 87, 65, 83, 68
    this.allowed = [87, 65, 83, 68];
  },
  filter_keys: function(key) {
    return ~$.inArray(key, this.allowed);
  },
  keydown: function(evt) {
    var key_code = evt.keyCode;
    // TODO better lookup?
    if (!this.filter_keys(key_code)) return;

    if (key_code in this.keys) {
      // Ignore
    } else {
      this.keys[key_code] = true;
      this.model.set('active_keys', _.keys(this.keys))
    }
  },
  keyup: function(evt) {
    var key_code = evt.keyCode;
    // TODO better lookup?
    if (!this.filter_keys(key_code)) return;
    if (key_code in this.keys) {
      // Remove
      delete this.keys[key_code];
      this.model.set('active_keys', _.keys(this.keys))
    } else {
      // Ignore
    }
  },
});

var framerate = 1000 / 4;

var keyboard_interface = {
    start: function(socket) {
        // Init the controls
         this.controls = new Controls.Keys();
         console.log(this.controls);
         this.listener = new Controls.Events({model: this.controls});
         
         var controls = this.controls;
         
         // Remove all keys when the window loses focus
         $(window).blur(function() {
           controls.set('active_keys', []);
         });

         var zero_message = [
           String(parseInt(power.idle)),
           String(parseInt(power.idle)),
         ].join(":");
         var last_message = zero_message; 

         // Check the keys on the framerate
         
         setInterval(function() {
           var active_keys = controls.get("active_keys");

           // TODO this logic is a mess

           // Get the active keys and translate that into a motor speed
           // Start the motors at half max + min
           var left_motor = power.idle;
           var right_motor = power.idle;

           // Lookup, not search!
           // If W (87), increase both motors by 1/4 (max - min)
           var forward = ~$.inArray("87", active_keys);
           if (forward) {
             left_motor += power.band / 6;
             right_motor += power.band / 6;
           }

           var backward = ~$.inArray("83", active_keys);
           if (backward) {
             left_motor -= power.band / 6;
             right_motor -= power.band / 6;
           }

           var left = ~$.inArray("65", active_keys);
           var right = ~$.inArray("68", active_keys);
           if (right && left) {
             // Add nothing
           } else if (right) {
             // If D (68), increase left motor by 1/4 and right motor by 1/8
             // TODO and backwards?
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

           // If S (83), increase both motors by 1/4 (max - min)


           // Emit the socket command for motor power
           var message = [
             String(parseInt(left_motor)),
             String(parseInt(right_motor))
           ].join(":");
           // Do not repeat zero messages

           if (!(last_message == zero_message && message == zero_message)) {
             // Send new message
             console.log('sending:', message)
             socket.emit('publish', {topic: topic, message: message});
           }
           last_message = message;

         }, framerate);
    },
    stop: function() {
        this.controls.destroy();
        this.listener.remove();
    },
    
};

var accelerometer_interface = {
    start: function() {
        console.log("Starting accelerometer input");
        
        var leftMotorArray = new Array();
          var rightMotorArray = new Array();
          var motorArrayLength = 5;
          var leftMotor = 0;
          var rightMotor = 0;
          var betaSensitivity = 0.5;
          var gammaSensitivity = 0.3;
        
        if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientation', function() {
                  tilt(event.beta, event.gamma);
                }, true);
        }
        
        var tilt = function(forwardBack, leftRight) {
          forwardBack = forwardBack * -1;
          var forward = (forwardBack * betaSensitivity).toFixed(0);
          var turn = (leftRight * gammaSensitivity).toFixed(0);

          $('#forward-amount').html(forward);
          $('#turn-amount').html(turn); 

          leftMotorArray.push((+forward) + (+turn));
          if (leftMotorArray.length >= motorArrayLength) {
            leftMotorArray.shift();
          }
          rightMotorArray.push((+forward) + (+turn * -1));
          if (rightMotorArray.length >= motorArrayLength) {
            rightMotorArray.shift();
          }
        }
        
        var zero_message = [
           String(parseInt(power.idle)),
           String(parseInt(power.idle)),
         ].join(":");
         var last_message = zero_message;

        setInterval(function() {
          for (var i=0; i<leftMotorArray.length; i++) {
            leftMotor += leftMotorArray[i];
          }
          for (var j=0; j<rightMotorArray.length; j++) {
            rightMotor += rightMotorArray[j];
          }

          leftMotor = (+leftMotor) / (leftMotorArray.length);
          rightMotor = (+rightMotor) / (rightMotorArray.length);

          leftMotor = (+leftMotor.toFixed());
          rightMotor = (+rightMotor.toFixed());
          
           // Emit the socket command for motor power
             var message = [
               String(parseInt(leftMotor)),
               String(parseInt(rightMotor))
             ].join(":");
             // Do not repeat zero messages

             if (!(last_message == zero_message && message == zero_message)) {
               // Send new message
               console.log('sending:', message)
               socket.emit('publish', {topic: topic, message: message});
             }
             last_message = message;
          
        }, framerate);
    },
    stop: function() {
        console.log("Stopping accelerometer input");
        this.controls.destroy();
        this.listener.remove();
    },
};

var leap_interface = {
    start: function() {
        console.log("Starting leap input");

    },
    stop: function() {
        console.log("Stopping leap input");
    },
}

var interfaces = {
    'keyboard': keyboard_interface,
    'accelerometer' : accelerometer_interface,
    'leap' : leap_interface
};

function initInputSwitcher()
{
      $("#controllers li img").click(function() {
         switchInterface($(this).data("interface"), interface, socket);
      });
}

function switchInterface(name, interface, socket)
{
    if(interface)
    { 
        interface.stop();
    }
    
    if(name in interfaces)
    {
          interface = interfaces[name];
    }

      if(!interface)
      {
          console.log("No interface selected");
          return false;
      }

      interface.start(socket);
}

$(function() {
  // Init the socket
  socket = io.connect(window.location.origin);
  
  initInputSwitcher();
  
  var default_interface = "keyboard";
  interface = null;
  
  switchInterface(default_interface, interface, socket);

});