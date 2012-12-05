/*global it:true describe:true */
process.env['NODE_ENV'] = 'test';

const
should = require('should'),
http = require('http'),
net = require('net'),
server = require('./server.js'),
request = require('request'),
jwcrypto = require('jwcrypto');

var port = -1;
var serverURL = null;

describe('The server', function() {
  it('should start up', function(done) {
    server(function(err, p) {
      should.not.exist(err);
      (p).should.be.ok;
      port = p;
      serverURL = 'http://127.0.0.1:' + port + '/';
      done();
    });
  });
});

var myDomain, myPassword;

describe('GET /api/domain', function() {
  it('should return a new randomly generated domain', function(done) {
    request({ url: serverURL + 'api/domain', json: true }, function(err, res, body) {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      body.ok.should.equal(true);
      body.domain.should.be.a('string');
      body.password.should.be.a('string');
      myDomain = body.domain;
      myPassword = body.password;
      done();
    });
  });
});

describe('DELETE /api/:domain', function() {
  it('should return 404 when the domain doesn\'t exist', function(done) {
    request.del({
      url: serverURL + 'api/dne',
      json: true,
    }, function(err, res, body) {
      should.not.exist(err);
      res.statusCode.should.equal(404);
      body.ok.should.equal(false);
      done();
    });
  });

  it('should return not authorized when the client isn\'t', function(done) {
    request.del({
      url: serverURL + 'api/' + myDomain,
      json: true,
    }, function(err, res, body) {
      should.not.exist(err);
      res.statusCode.should.equal(401);
      body.ok.should.equal(false);
      done();
    });
  });

  it('should fail when the password is wrong', function(done) {
    request.del({
      url: serverURL + 'api/' + myDomain,
      json: true,
      headers: {
        'x-password': "bogus"
      }
    }, function(err, res, body) {
      should.not.exist(err);
      res.statusCode.should.equal(401);
      body.ok.should.equal(false);
      body.why.should.include('incorrect password');
      done();
    });
  });

  it('should succeed when all is copasetic', function(done) {
    request.del({
      url: serverURL + 'api/' + myDomain,
      json: true,
      headers: {
        'x-password': myPassword
      }
    }, function(err, res, body) {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      body.ok.should.equal(true);
      done();
    });
  });
});

describe('GET .well-known/browserid', function() {
  it('should get set up for a new domain', function(done) {
    request({ url: serverURL + 'api/domain', json: true }, function(err, res, body) {
      should.not.exist(err);
      myDomain = body.domain;
      myPassword = body.password;
      done();
    });
  });

  it('should return 404 when the domain doesn\'t exist', function(done) {
    request({
      url: serverURL + '.well-known/browserid',
      json: true,
      headers: {
        host: "dne.testidp.org"
      }
    }, function(err, res, body) {
      should.not.exist(err);
      res.statusCode.should.equal(404);
      done();
    });
  });

  it('should return a valid default document when the domain does exist', function(done) {
    request({
      url: serverURL + '.well-known/browserid',
      json: true,
      headers: {
        host: myDomain + ".testidp.org"
      }
    }, function(err, res, body) {
      should.exist(res.headers['content-type']);
      res.headers['content-type'].should.equal('application/json');
      should.exist(res.headers['cache-control']);
      res.headers['cache-control'].should.equal('no-cache');
      should.exist(res.body.authentication);
      res.body.authentication.should.be.a('string');
      should.exist(res.body.provisioning);
      res.body.provisioning.should.be.a('string');
      res.body['public-key'].should.be.a('object');
      // can we parse the public key?
      var pubKey;
      (function() {
        pubKey = jwcrypto.loadPublicKeyFromObject(res.body['public-key']);
      }).should.not.throw();
      should.exist(pubKey);
      pubKey.should.be.a('object');
      done();
    });
  });
});

describe('PUT /api/:domain/well-known', function() {
  it('should fail without proper creds', function(done) {
    request.put({
      url: serverURL + 'api/' + myDomain + '/well-known',
      json: true,
      body: JSON.stringify({
        bogus: true
      })
    }, function(err, res, body) {
      res.statusCode.should.equal(401);
      res.body.ok.should.equal(false);
      res.body.why.should.include('provide your password');
      done();
    });
  });

  it('should succeed with proper creds', function(done) {
    request.put({
      url: serverURL + 'api/' + myDomain + '/well-known',
      json: true,
      body: {
        bogus: true
      },
      headers: {
        'x-password': myPassword
      }
    }, function(err, res, body) {
      res.statusCode.should.equal(200);
      res.body.ok.should.equal(true);
      done();
    });
  });

  it('should still succeed if the user adds a dot', function(done) {
    request.put({
      url: serverURL + 'api/' + myDomain + '/.well-known',
      json: true,
      body: {
        bogus: true
      },
      headers: {
        'x-password': myPassword
      }
    }, function(err, res, body) {
      res.statusCode.should.equal(200);
      res.body.ok.should.equal(true);
      done();
    });
  });

  it('should return what we sent', function(done) {
    request({
      url: serverURL + '.well-known/browserid',
      json: true,
      headers: {
        host: myDomain + ".testidp.org"
      }
    }, function(err, res, body) {
      should.exist(res.headers['content-type']);
      res.headers['content-type'].should.equal('application/json');
      should.exist(res.body.bogus);
      res.body.bogus.should.equal(true);
      done();
    });
  });
});

describe('PUT /api/:domain/headers', function() {
  it('should fail without proper creds', function(done) {
    request.put({
      url: serverURL + 'api/' + myDomain + '/headers',
      json: true,
      body: JSON.stringify({
        bogus: true
      })
    }, function(err, res, body) {
      res.statusCode.should.equal(401);
      res.body.ok.should.equal(false);
      res.body.why.should.include('provide your password');
      done();
    });
  });

  it('should succeed with proper creds', function(done) {
    request.put({
      url: serverURL + 'api/' + myDomain + '/headers',
      json: true,
      body: {
        "X-Foo": "Bar",
        "cache-control": "public, max-age=1000000"
      },
      headers: {
        'x-password': myPassword
      }
    }, function(err, res, body) {
      res.statusCode.should.equal(200);
      res.body.ok.should.equal(true);
      done();
    });
  });

  it('should return what we sent', function(done) {
    request({
      url: serverURL + '.well-known/browserid',
      json: true,
      headers: {
        host: myDomain + ".testidp.org"
      }
    }, function(err, res, body) {
      should.exist(res.headers['content-type']);
      res.headers['content-type'].should.equal('application/json');
      should.exist(res.headers['x-foo']);
      res.headers['x-foo'].should.equal('Bar');
      should.exist(res.headers['cache-control']);
      res.headers['cache-control'].should.include('public');
      done();
    });
  });
});
