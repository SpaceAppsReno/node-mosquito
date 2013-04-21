$(function() {

  var socket = io.connect(window.location.origin);
  var topic = 'erictj/3pi-control';
  
  // var power = 30;
  // var idle = 100;

  var power = 30;
  var idle = 0;

  console.log('wat');

  $('#circle').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle + power) + ":" + (idle - power)});
  });

  $('#forward').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle + power) + ":" + (idle + power)});
  });

  $('#backward').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle - power) + ":" + (idle - power)});
  });

  $('#right').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle + power) + ":" + (idle + parseInt(( 3 * power) / 4))});
  });

  $('#left').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle + parseInt((3 * power / 4))) + ":" + (idle + power)});
  });

  $('#sharpright').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle + power) + ":" + (idle + parseInt(( power) / 2))});
  });

  $('#sharpleft').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle + parseInt((power / 2))) + ":" + (idle + power)});
  });

  $('#backright').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle - power) + ":" + (idle - parseInt(( 3 * power) / 4))});
  });

  $('#backleft').on('click', function() {
    socket.emit('publish', {topic: topic, message: (idle - parseInt((3 * power / 4))) + ":" + (idle - power)});
  });

  $('#stop').on('click', function() {
    socket.emit('publish', {topic: topic, message: idle + ":" + idle});
  });


  $('#power100').on('click', function() {
    power = 100;
    $('#currentPower').html(power);
  });

  $('#power80').on('click', function() {
    power = 80;
    $('#currentPower').html(power);
  });

  $('#power60').on('click', function() {
    power = 60;
    $('#currentPower').html(power);
  });

  $('#power40').on('click', function() {
    power = 40;
    $('#currentPower').html(power);
  });

  $('#power30').on('click', function() {
    power = 30;
    $('#currentPower').html(power);
  });

  $('#power20').on('click', function() {
    power = 20;
    $('#currentPower').html(power);
  });
  

  $('#currentPower').html(power);

});