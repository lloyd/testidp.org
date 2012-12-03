#!/usr/bin/env node

var express = require('express'),
    winston = require('winston'),
         db = require('./lib/db.js');

/*
winston.exitOnError = false;
winston.handleExceptions(new winston.transports.Console({ colorize: true, json: true }));
*/

var app = express.createServer();

const HOSTNAME = process.env.HOSTNAME || 'testidp.org';

// setup logging (except when we're testing)
if (true || process.env.NODE_ENV !== 'test') {
  app.use(express.logger({
    stream: {
      write: function(x) {
        winston.info(typeof x === 'string' ? x.trim() : x);
      }
    },
    format: 'tiny'
  }));
}

function checkAuth(req, res, next) {
  next();
}

app.get('/api/domain', function(req, res) {
  var details = db.newDomain();
  details.ok = true;
  res.json(details, 200);
});

app.put('/api/:domain/well-known', checkAuth, function(req, res) {
  res.json(500, {ok: false, why: "not implemented" });
});

app.delete('/api/:domain', checkAuth, function(req, res) {
  res.json(500, {ok: false, why: "not implemented" });
});

// now handle fetches of well-known documents
app.use(function(req, res, next) {
  if (req.headers.host && req.headers.host.length > HOSTNAME.length) {
    var domain = req.headers.host.split('.')[0];
    var data = db.getDomain(domain);
    if (data) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(data.wellKnown);
    }
  }
  // not found
  next();
});

// handle starting from the command line or the test harness
if (process.argv[1] === __filename) {
  app.listen(process.env['PORT'] || 8080);
} else {
  module.exports = function(cb) {
    app.listen(0, function(err) {
      cb(err, app.address().port);
    });
  };
}
