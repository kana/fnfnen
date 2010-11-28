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




function before_authentication(form)
{
  var token_text = form.oauth_token.value;
  if (token_text.match(/^oauth_token=([^&]+)&oauth_token_secret=([^&]+)/)) {
    $.storage('form_oauth_token_value', token_text);  // For later boot.
    $.storage('request_token', RegExp.$1);  // For phase 2.
    $.storage('request_secret', RegExp.$2);  // For phase 2.
    form.oauth_token.value = RegExp.$1;
    return true;
  } else {
    alert('Pasted text is not valid.  Please reload this page then retry this phase.');
    return false;
  }
}




function before_request(request_form, secret_form)
{
  request_form.oauth_callback.value = location.href.replace(
    /\/[^\/]*$/,
    '/phase2.html'
  );

  $.storage('form_consumer_secret_value',
            secret_form.consumer_secret.value);
  $.storage('form_oauth_consumer_key_value',
            request_form.oauth_consumer_key.value);

  return true;
}




// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
