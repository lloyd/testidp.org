var jwcrypto = require('jwcrypto');
require("jwcrypto/lib/algs/ds");

exports.genKeyPair = function(cb) {
  jwcrypto.generateKeypair({algorithm: "DS", keysize: 128}, cb);
};

exports.certify = function (hostname, email, userPublicKey, expiration, idp, cb) {
  var pubKey = jwcrypto.loadPublicKey(userPublicKey);
  jwcrypto.cert.sign({publicKey: pubKey, principal: {email: email}},
                     {issuer: hostname, issuedAt: new Date(), expiresAt: expiration},
                     null,
                     idp.keypair.secretKey, cb);
};