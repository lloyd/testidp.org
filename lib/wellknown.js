exports.generate = function(pub) {
  return JSON.stringify({
    authentication: "/click/auth.html",
    provisioning: "/click/prov.html",
    "public-key": pub
  });
};
