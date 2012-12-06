(function () {
    function handleError(api) {
        return function (xhr, status, err) {
            alert('Unable to ' + api + ' Got: ' + err);
        }
    }

    var idps = {};

    function createIdP (cb) {
        var env = encodeURIComponent('https://login.persona.org/');
        $.ajax({
          url: '/api/domain?env=' + env,
            type: 'GET',
            dataType: 'json',
            error: handleError('GET /api/domain'),
            success: function (data, status, xhr) {
                idps[data.domain] = data;
                cb(data);
            }

        });
    }

    function put(idp, params, api, successCb, errorCb) {
      successCb = successCb || function () {};
      errorCb = errorCb || handleError('PUT ' + api);
      $.ajax({
        url: '/api/' + idp.domain + '/' + api,
        headers: {
         'X-Password': idp.password
        },
        type: 'PUT',
        dataType: 'json',
        data: params,
        success: successCb,
        error: errorCb,
      });
    }

    function putWellKnown(idp, wellKnown) {
      put(idp, wellKnown, 'well-known');
    }

    function putEnv(idp, envUrl) {
      put(idp, {env: envUrl}, 'env');
    }

    function putHeaders(idp, name, value, cb) {
      var headers = {};
      headers[name] = value;
      put(idp, JSON.stringify(headers), 'headers', cb);
    }

    function deleteIdp(idp, cb) {
      $.ajax({
        url: '/api/' + idp.domain,
        headers: {
         'X-Password': idp.password
        },
        type: 'DELETE',
        dataType: 'json',
        success: cb,
        error: handleError('DELETE'),
      });
    }

    $('#build-idp, #add-idp').click(function (e) {
      e.preventDefault();
      createIdP(function (idp) {
        var d = new Date();
        var m = d.getMinutes() < 10 ? ('0' + d.getMinutes()) : d.getMinutes();
        var time = d.getHours() + ':' + m;
        var form = $('#current-idps .template').clone();
        form.removeClass('template').removeClass('hide');
        $('[name=domain]', form).val(idp.domain);
        $('[name=password]', form).val(idp.password);
        $('.domain-display .domain', form).text(idp.domain);
        $('.domain-display .example_email', form).text("test@" + idp.domain + ".testidp.org");
        $('.domain-display .created', form).text(time);
        $('#current-idps').append(form);
        putWellKnown(idp, $('textarea', form).val());
        showInteractive();
      });
    });

    $('.overview a').click(function (e) {
      e.preventDefault();
      $('#interactive').hide('slow');
      $('#overview').show('slow');
      $('.nav li').removeClass('active');
      $(this).parent().addClass('active');
    });

    function showInteractive() {
      $('#overview').hide('fast');
      $('#interactive').show('fast');
      $('.nav li').removeClass('active');
      $('.nav li.interactive').addClass('active');
    }

    $('.interactive a').click(function (e) {
      e.preventDefault();
      showInteractive();
    });

    $('#current-idps').click(function (e) {
      if (! $(e.target).hasClass('btn-danger')) return;
      e.preventDefault();
      var form = $(e.target).parents('form');
      var domain = $('[name=domain]', form).val();
      if (idps[domain]) {
        deleteIdp(idps[domain], function () {
          $(form).parent().hide();
          delete idps[domain];
        });
      }
    });

    $('#current-idps').submit(function (e) {
        e.preventDefault();
        var form = $(e.target);
        var domain = $('[name=domain]', form).val();
        var password = $('[name=password]', form).val();
        var wellKnown = $('textarea', form).val();

        if (idps[domain]) {
          putWellKnown(idps[domain], wellKnown);
          var envUrl = $('[name=env_url]', form).val();
          if (envUrl.indexOf('http') === 0 &&
              envUrl[envUrl.length -1] === '/') {
            putEnv(idps[domain], envUrl);
          } else {
            $('#env-error').modal()
          }
        } else {
          alert('Error: no ' + domain + ' in memory');
        }
    });

  var idpFocusedFromHeaders;
  var formFocusedFromHeaders;
  $('#current-idps').click(function (e) {
    if (!$(e.target).hasClass('add-headers')) return;
    e.preventDefault();
    idpFocusedFromHeaders = undefined;
    formFocusedFromHeaders = undefined;
    var form = formFocusedFromHeaders = $(e.target).parents('form');
    var domain = $('[name=domain]', form).val();
    if (idps[domain]) idpFocusedFromHeaders = idps[domain];
  });

    $('#addHeader .btn-primary').click(function (e) {
      e.preventDefault();
      var headerName = $('[name=header-name]').val();
      var headerValue = $('[name=header-value]').val();
      $('[name=header-name]').val('');
      $('[name=header-value]').val('');
      $('#addHeader').modal('hide');
      if (idpFocusedFromHeaders) {
        putHeaders(idpFocusedFromHeaders, headerName, headerValue, function () {
          $('dl', formFocusedFromHeaders).append('<dt>' + headerName + '</dt><dd>' +
                                                 headerValue + '</dd>');
        });
      }
    });

})();
