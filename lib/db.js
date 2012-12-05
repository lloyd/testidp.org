const crypto = require('crypto');

// a trick from @drainmice - random strings are generated with words for readability
const cheesy = [
  "gouda", "brie", "cheddar", "swiss", "grueyer", "american", "yellow", "orange", "string",
  "mozzarella", "feta", "blue", "parmesan", "goat"
];
const hostPartAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

// our "database".  it's awesome.
var domains = {
};

exports.newDomain = function(keypair, wellKnown, cb) {
  function rDomain(chars) {
    var str = cheesy[Math.floor(Math.random() * cheesy.length)] + "-";
    for (var i=0; i < 8; i++) {
      str += hostPartAlphabet.charAt(Math.floor(Math.random() * hostPartAlphabet.length));
    }
    return str;
  }

  var password = new Buffer(crypto.randomBytes(16)).toString('base64');

  var domain;
  do { domain = rDomain(); } while(domains[domain]);

  domains[domain] = {
    pass: password,
    created: new Date(),
    headers: { },
    keypair: keypair,
    wellKnown: wellKnown
  };

  process.nextTick(function() {
    cb(null, { domain: domain, password: password });
  });
};

function usingDefaultPubKey(domain) {
  return domains[domain] &&
         domains[domain].wellKnown &&
         domains[domain].wellKnown.indexOf('<TEST IDP PROVIDED>') !== -1;
}

exports.getDomain = function(domain, cb) {
  if (usingDefaultPubKey(domain)) {
    var props = JSON.parse(domains[domain].wellKnown);
    props['public-key'] = domains[domain].keypair.publicKey.toSimpleObject();
    domains[domain].wellKnown = JSON.stringify(props, null, 4);
  }
  process.nextTick(function() { cb(null, domains[domain]); });
};

exports.deleteDomain = function(domain, cb) {
  process.nextTick(function() {
    var err = "no such domain";
    if (domains[domain]) {
      err = null;
      delete domains[domain];
    }
    cb(err);
  });
};
