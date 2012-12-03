const crypto = require('crypto');

// a trick from @drainmice - random strings are generated with words for readability
const cheesy = [
  "gouda", "brie", "cheddar", "swiss", "grueyer", "american", "yellow", "orange", "string",
  "mozzarella", "feta", "blue", "parmesan", "goat"
];
const hostPartAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// our "database".  it's awesome.
var domains = {
};

exports.newDomain = function() {
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
    headers: {
    },
    wellKnown: '{"enabled":"false"}'
  };

  return { domain: domain, password: password };
};

exports.getDomain = function(domain) {
  return domains[domain];
};
