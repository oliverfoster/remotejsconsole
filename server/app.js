const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const uuid = require('node-uuid').v4;
const ES = require('./es');
let cors = require('./cors');
const version = require(__dirname + '/../package.json').version;
const open = require('open');


module.exports = function(PORT, SPORT, NOCORS) {

  const app = express();  

  const sessions = {
    run: new ES('run'),
    log: new ES('log'),
  };

  app.use(bodyParser.urlencoded({ extended: true, limit: '100MB', inflate: true }));
  app.use(bodyParser.json( { limit: '100MB', inflate: true } ));
  app.disable('x-powered-by');

  if (!NOCORS) {
    console.log("Using cors...");
    app.use(cors);
  } else {
    console.log("Not using cors...");
    cors = null;
  }

  app.get('/ips/', (req, res)=>{
    const ips = [];
    const interfaces = require('os').networkInterfaces();
    for (let devName in interfaces) {
      const iface = interfaces[devName];
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (!(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)) continue;
        ips.push(alias.address+":"+server.address().port);
      }
    }
    res.json(ips);
  })

  app.get('/remote/:id?', (req, res) => {
    const id = req.params.id || uuid();
    res.jsonp(id);
  });

  app.param('type', (req, res, next, type) => {
    const es = sessions[type];
    if (!es) {
      return next(404);
    }

    req.locals = { es };

    next();
  });

  app.get('/status', (req, res) => {
    const content = Object.keys(sessions.log.sessions).map(id => {
      return Object.assign({ id }, sessions.log.locals(id));
    });
    res.send(`<pre>${JSON.stringify(content)}</pre>`);
  });

  // accepts event/stream
  app.get('/remote/:id/:type', cors, (req, res) => {
    const { id, type } = req.params;
    const { es } = req.locals;
    const isClient = (type === 'run');
    es.add(id, res, req.xhr, isClient);
  });

  app.post('/remote/:id/:type', cors, (req, res) => {
    const { id, type } = req.params;
    const { es } = req.locals;
    const isClient = (type === 'log');
    if (!isClient && Date.now() - (es.lastWrite[id] || 0) > 10000) {
      res.send(false);
      return;
    }
    es.send(id, req.body.data, req.body.event||"message");
    res.send(true);
  });

  const public_path = path.join(__dirname, '/../build').replace(/\\/g,"/");
  app.use(express.static(public_path));

  let server;
  if (!SPORT) {
    server = app.listen(process.env.PORT || PORT || 8000, () => {
      console.log('listening on http://localhost:%s', server.address().port);
      open(`http://localhost:${server.address().port}`);
    });
  } else {
    server = https.createServer({
      key: fs.readFileSync(__dirname+'/../cert/server.key'),
      cert: fs.readFileSync(__dirname+'/../cert/server.cert')
    }, app).listen(process.env.SPORT || SPORT || 8001, function () {
      console.log('listening on https://localhost:%s', server.address().port);
      open(`https://localhost:${server.address().port}`);
    });
  }

};
