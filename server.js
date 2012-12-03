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

// add handy response functions
app.use(function(req, res, next) {
  res.fail = function(why, code) {
    this.json({ ok: false, why: why }, code);
  };
  res.ok = function() {
    this.json({ ok: true }, 200);
  }
  next();
});

function checkAuth(req, res, next) {
  db.getDomain(req.params.domain, function(err, record) {
    if (err) {
      res.fail("database error: " + err);
    } else if (!record) {
      res.fail("no such domain", 404);
    } else if (!req.headers['x-password']) {
      res.fail("provide your password in the X-Password header", 401);
    } else if (req.headers['x-password'] !== record.pass) {
      res.fail("incorrect password", 401);
    } else {
      next();
    }
  });
}

app.get('/api/domain', function(req, res) {
  var details = db.newDomain();
  details.ok = true;
  res.json(details, 200);
});

app.put('/api/:domain/well-known', checkAuth, function(req, res) {
  res.json({ok: false, why: "not implemented" }, 500);
});

app.delete('/api/:domain', checkAuth, function(req, res) {
  db.deleteDomain(req.params.domain, function(err) {
    if (err) res.fail(err, 500);
    else res.ok();
  });
});

// now handle fetches of well-known documents
app.use(function(req, res, next) {
  if (req.headers.host && req.headers.host.length > HOSTNAME.length) {
    var domain = req.headers.host.split('.')[0];
    db.getDomain(domain, function(err, data) {
      if (data) {
        res.setHeader('Content-Type', 'application/json');
        res.end(data.wellKnown);
      } else {
        next();
      }
    });
  } else {
    // not found
    next();
  }
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
