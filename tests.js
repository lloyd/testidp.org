/*global it:true describe:true */
process.env['NODE_ENV'] = 'test';

const
should = require('should'),
http = require('http'),
net = require('net'),
server = require('./server.js'),
request = require('request');

var port = -1;
var serverURL = null;

describe('the server', function() {
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

var myDomain;

describe('GET /api/domain', function() {
  it('should return a new randomly generated domain', function(done) {
    request({ url: serverURL + 'api/domain', json: true }, function(err, res, body) {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      body.ok.should.equal(true);
      body.domain.should.be.a('string');
      myDomain = body.domain;
      done();
    });
  });
});

describe('dynamic domain', function() {
  it('should return 404 when the domain doesn\'t exist', function(done) {
    request({
      url: serverURL + '.well-known/browserid',
      json: true,
      headers: {
        host: "dne.testidp.org"
      }
    }, function(err, res, body) {
      console.log(body);
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
      res.statusCode.should.equal(200);
      done();
    });
  });
});

