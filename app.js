var mqtt = require("mqtt");
var mqttPort = 1883;
// var mqttHost = "127.0.0.1";
var mqttHost = "api.pinocc.io";
var mqttUser = "erictj";
var mqttPass = "321";

var express = require('express');
var routes = require('./routes');
// var user = require('./routes/user');
var examples = require('./routes/examples');
var http = require('http');
var path = require('path');
var engine = require('ejs-locals');

var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('ejs', engine);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('blahhahahahaahah11!#!@'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
// app.get('/examples/temperature', examples.temperature);
// app.get('/examples/colorpicker', examples.colorpicker);
app.get('/examples/rover', examples.rover);
// app.get('/users', user.list);

// mqtt handling
var mqtt = mqtt.createClient(mqttPort, mqttHost, {username: mqttUser, password: mqttPass});
// var mqtt = mqtt.createClient(mqttPort, mqttHost, {});
if (!mqtt) {
  console.dir(err);
  return process.exit(-1);
}
mqtt.on("message", function(topic, payload){
  console.log("emitting", topic, payload)
  io.sockets.emit("mqtt", {"topic":topic, "payload":payload});
});
  
// websocket handling
io.sockets.on("connection", function (socket) {
  socket.on("subscribe", function (data) {
    console.log(data);
    console.log("Subscribing to " + data.topic);
    mqtt.subscribe(data.topic);
  });
  
  socket.on("publish", function (data) {
    console.log(data);
    console.log("publishing to " + data.topic);
    mqtt.publish(data.topic, data.message);
  });
});

// start server
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});