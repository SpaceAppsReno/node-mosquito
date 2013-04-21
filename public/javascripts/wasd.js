var topic = 'erictj/3pi-control';

var power = {
  min: 0,
  max: 200,
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

$(function() {
  // Init the socket
  var socket = io.connect(window.location.origin);

  // Init the controls
  var controls = new Controls.Keys();
  console.log(controls);
  var listener = new Controls.Events({model: controls});

  // Remove all keys when the window loses focus
  $(window).blur(function() {
    controls.set('active_keys', []);
  });

  var power_band = power.max - power.min;
  var zero_message = [
    String(parseInt(power_band / 2)),
    String(parseInt(power_band / 2)),
  ].join(":");
  var last_message = zero_message; 

  // Check the keys on the framerate
  setInterval(function() {
    var active_keys = controls.get("active_keys");

    // Get the active keys and translate that into a motor speed
    // Start the motors at half max + min
    var left_motor = power_band / 2;
    var right_motor = power_band / 2;

    // Lookup, not search!
    // If W (87), increase both motors by 1/4 (max - min)
    var forward = ~$.inArray("87", active_keys);
    if (forward) {
      left_motor += power_band / 6;
      right_motor += power_band / 6;
    }

    var backward = ~$.inArray("83", active_keys);
    if (backward) {
      left_motor -= power_band / 6;
      right_motor -= power_band / 6;
    }

    var left = ~$.inArray("65", active_keys);
    var right = ~$.inArray("68", active_keys);
    if (right && left) {
      // Add nothing
    } else if (right) {
      // If D (68), increase left motor by 1/4 and right motor by 1/8
      // TODO and backwards?
      if (forward) {
        right_motor -= power_band / 10;
      } else if (backward) {
        right_motor += power_band / 10;
      } else {
        left_motor += power_band / 6;
        right_motor -= power_band / 6;
      }
    } else if (left) {
      // If A (65), increase left motor by 1/8 and right motor by 1/4
      if (forward) {
        left_motor -= power_band / 10;
      } else if (backward) {
        left_motor += power_band / 10;
      } else {
        right_motor += power_band / 6;
        left_motor -= power_band / 6;
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
});