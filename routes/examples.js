exports.rover = function(req, res){
  res.render('examples/rover', { title: 'Express' });
};

exports.wasd = function(req, res){
  res.render('examples/wasd', { title: 'Express' });
};

exports.command = function(req, res){
  res.render('examples/command', { title: 'Express' });
};