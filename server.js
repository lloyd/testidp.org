#!/usr/bin/env node

var  crypto = require('./lib/crypto.js'),
         db = require('./lib/db.js'),
    express = require('express'),
   nunjucks = require('nunjucks'),
       path = require('path'),
         qs = require('qs'),
        Seq = require('seq'),
  wellKnown = require('./lib/wellknown.js'),
    winston = require('winston');

/*
winston.exitOnError = false;
winston.handleExceptions(new winston.transports.Console({ colorize: true, json: true }));
*/

var app = express.createServer();
var views = path.join(__dirname, 'views');
new nunjucks.Environment(new nunjucks.FileSystemLoader(views)).express(app);
// limit post bodies to 10kb
app.use(express.limit("10kb"));

// read the whole body before passing on to the next middleware
app.use(function(req, res, next) {
  var buf = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk) { buf += chunk; });
  req.on('end', function(chunk) {
    req.body = buf;
    next();
  });
});

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
  };
  next();
});

function checkAuth(req, res, next) {
  if (!req.domain) {
    res.fail("internal error, domain should be populated", 500);
  } else if (!req.headers['x-password']) {
    res.fail("provide your password in the X-Password header", 401);
  } else if (req.headers['x-password'] !== req.domain.pass) {
    res.fail("incorrect password", 401);
  } else {
    next();
  }
}

function withDomain(req, res, next) {
  var localDomain = '';
  if (req.params.domain) {
    localDomain = req.params.domain;
  } else if (req.headers.host) {
    localDomain = req.headers.host.split('.')[0];
  }
  db.getDomain(localDomain, function(err, record) {
    if (err) {
      res.fail("database error: " + err);
    } else if (!record) {
      res.fail("no such domain", 404);
    } else {
      record.domain = localDomain;
      req.domain = record;
      next();
    }
  });
}

app.get('/api/domain', function(req, res) {
  var params = qs.parse(req.query);
  Seq()
    .seq(function() {
      // generate a keypair for the domain
      crypto.genKeyPair(this);
    }).flatten()
    .seq(function(keyPair) {
      var envUrl = 'https://login.persona.org/';
      if (params.env) envUrl = params.env;
      if (envUrl.substr(envUrl.length - 1) !== '/') envUrl = envUrl + '/';
      db.newDomain(keyPair, wellKnown.generate(keyPair.publicKey), envUrl, this);
    })
    .seq(function(details) {
      details.ok = true;
      res.json(details, 200);
    }).catch(function(err) {
      return res.fail("failed to create domain: " + err);
    });
});

app.put('/api/:domain/\.?well-known', withDomain, checkAuth, function(req, res) {
  req.domain.wellKnown = req.body;
  res.ok();
});

app.put('/api/:domain/env', withDomain, checkAuth, function(req, res) {
  var params = qs.parse(req.body);
  req.domain.env = params.env;
  res.ok();
});

app.put('/api/:domain/headers', withDomain, checkAuth, function(req, res) {
  var kv = null;
  try {
    kv = JSON.parse(req.body);
    if (typeof kv !== 'object') throw "must be object";
    Object.keys(kv).forEach(function(k) {
      if (typeof kv[k] !== 'string') throw "values must be strings";
    });
    Object.keys(kv).forEach(function(k) {
      var v = kv[k];
      k = k.toLowerCase(); // < normalize
      if (v === undefined) {
        delete req.domain.headers[k];
      } else {
        req.domain.headers[k] = v;
      }
    });
    res.ok();
  } catch(e) {
    return res.fail("malformed request: " + e, 400);
  }
});

app.delete('/api/:domain', withDomain, checkAuth, function(req, res) {
  db.deleteDomain(req.params.domain, function(err) {
    if (err) res.fail(err, 500);
    else res.ok();
  });
});

// now handle fetches of well-known documents
app.use(function(req, res, next) {
  if ('/.well-known/browserid' !== req.path) return next();
  if (req.headers.host && req.headers.host.length > HOSTNAME.length) {
    var domain = req.headers.host.split('.')[0];
    db.getDomain(domain, function(err, data) {
      if (data) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        Object.keys(data.headers).forEach(function(k) {
          res.setHeader(k, data.headers[k]);
        });
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

app.post('/auth/certify', function (req, res) {
  var params = qs.parse(req.body);
  if (!params.email ||
      !params.publicKey ||
      !params.duration) {
    return res.send(400);
  }

  var domain = params.email.replace(/[^@]*@/, '');
  db.getDomain(domain.split('.')[0], function (err, record) {
    if (!!err) {
      return res.send(err, 400);
    } else if (!record) {
      return res.send('Unknown IdP: ' + domain, 400);
    }

    var exp = new Date();
    exp.setSeconds(exp.getSeconds() + params.duration);
    record.domain = domain;
    crypto.certify(record, params.email, params.publicKey, exp, function (err, cert) {
      if (err) {
        res.send(err, 500);
      } else {        
        res.send(JSON.stringify({certificate: cert}), {"Content-Type": "application/json"});
      }
    });
  });
});

app.get('/noauth/auth.html', withDomain, function (req, res) {
  res.render('noauth/auth.html', req.domain);
});

app.get('/noauth/prov.html', withDomain, function (req, res) {
  res.render('noauth/prov.html', req.domain);
});

app.get('/click/auth.html', withDomain, function (req, res) {
  res.render('click/auth.html', req.domain);
});

app.get('/click/prov.html', withDomain, function (req, res) {
  res.render('click/prov.html', req.domain);
});

app.use(express.static(__dirname + "/website"));
app.use(express.static(__dirname + "/idps"));

// handle starting from the command line or the test harness
if (process.argv[1] === __filename) {
  app.listen(process.env.PORT || 8080);
} else {
  module.exports = function(cb) {
    app.listen(0, function(err) {
      cb(err, app.address().port);
    });
  };
}
