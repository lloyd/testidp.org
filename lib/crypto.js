var jwcrypto = require('jwcrypto');
require("jwcrypto/lib/algs/ds");

exports.genKeyPair = function(cb) {
  jwcrypto.generateKeypair({algorithm: "DS", keysize: 128}, cb);
};
