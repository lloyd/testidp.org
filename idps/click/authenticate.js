document.getElementById('login').onclick = function() {
  window.sessionStorage.setItem('authenticated', true);
  navigator.id.beginAuthentication(function(email) {
    navigator.id.completeAuthentication();
  });
};
