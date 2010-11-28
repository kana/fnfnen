// fnfnen, a web-based twitter client
// Version: @@VERSION@@
// Copyright (C) 2009-2010 kana <http://whileimautomaton.net/>
// License: MIT license  {{{
//     Permission is hereby granted, free of charge, to any person
//     obtaining a copy of this software and associated documentation
//     files (the "Software"), to deal in the Software without
//     restriction, including without limitation the rights to use,
//     copy, modify, merge, publish, distribute, sublicense, and/or
//     sell copies of the Software, and to permit persons to whom the
//     Software is furnished to do so, subject to the following
//     conditions:
//
//     The above copyright notice and this permission notice shall be
//     included in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//     EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
//     OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//     NONINFRINGEMENT.  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//     HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
//     WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//     FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
//     OTHER DEALINGS IN THE SOFTWARE.
// }}}




var consumer = {
  sign_form: function(request_form, secret_form){
    var accessor = {
      consumerSecret: secret_form.consumer_secret.value,
      tokenSecret: secret_form.token_secret.value,
    };
    var message = {
      action: request_form.action,
      method: request_form.method,
      parameters: [],
    };

    for (var e = 0; e < request_form.elements.length; ++e) {
      var input = request_form.elements[e];
      if (input.name != null
          && input.name != ''
          && input.value != null
          && (!(input.type == 'checkbox' || input.type == 'radio')
              || input.checked))
      {
        message.parameters.push([input.name,
                                 input.value.replace(/\r?\n/g, '\r\n')]);
      }
    }

    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, accessor);
    var parameter_map = OAuth.getParameterMap(message.parameters);

    for (var p in parameter_map) {
      if (p.substring(0, 6) == 'oauth_'
          && request_form[p] != null
          && request_form[p].name != null
          && request_form[p].name != '')
      {
        request_form[p].value = parameter_map[p];
      }
    }

    return true;
  },
};




function restore_form_values()
{
  $('.restorable').each(function(){
    var k = this.name;
    var form_k_value = $.storage('form_' + k + '_value');
    if (form_k_value != null)
      $('.restorable[name="' + k + '"]').val(form_k_value);
  });
}




// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
