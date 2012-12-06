(function () {
    function handleError(api) {
        return function (xhr, status, err) {
            alert('Unable to ' + api + ' Got: ' + err);
        }
    }

    var idps = {};

    function createIdP (cb) {
        $.ajax({
            url: '/api/domain',
            type: 'GET',
            dataType: 'json',
            error: handleError('GET /api/domain'),
            success: function (data, status, xhr) {
                idps[data.domain] = data;
                cb(data);
            }

        });
    }

    function putWellKnown(idp, wellKnown) {
        $.ajax({
            url: '/api/' + idp.domain + '/well-known',
            headers: {
                'X-Password': idp.password
            },
            type: 'PUT',
            dataType: 'json',
            data: wellKnown,
            error: handleError('PUT /'),
        });
    }

    //    putWellKnown(idp, {disable: true});
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

    $('#current-idps').submit(function (e) {
        e.preventDefault();
        var form = $(e.target);
        var domain = $('[name=domain]', form).val();
        var password = $('[name=password]', form).val();
        var wellKnown = $('textarea', form).val();

        if (idps[domain]) {
          console.log('putting', idps[domain], wellKnown);
          putWellKnown(idps[domain], wellKnown);
        } else {
          alert('Error: no ' + domain + ' in memory');
        }
    });

    $('#addHeader .btn-primary').click(function (e) {
      e.preventDefault();
        alert('TODO: save headers');
        $('#addHeader').modal('hide');
    });

})();
