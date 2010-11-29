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




function get_argument(key)
{
  var v = location.search.split(key + '=');
  return v[1] && v[1].split('&')[0];
}




function fill_request(form_request, form_secret)
{
  form_request.oauth_token.value = $.storage('request_token');
  form_secret.token_secret.value = $.storage('request_secret');

  $.storage('request_token', null);
  $.storage('request_secret', null);

  if (get_argument('oauth_token') != form_request.oauth_token.value) {
    alert(
      'Failed to authorize:' + "\n"
      + 'Expected: ' + form_request.oauth_token.value + "\n"
      + 'Actual: ' + get_argument('oauth_token') + "\n"
    );
    top.location.href = 'phase1.html';
  }

  form_request.oauth_verifier.value = get_argument('oauth_verifier');
}




function before_log_in(form)
{
  var value = form.oauth_access_token_result.value;

  if (value.match(/^oauth_token=([^&]+)&oauth_token_secret=([^&]+)/)) {
    $.storage('access_token', RegExp.$1);
    $.storage('access_secret', RegExp.$2);
    location.href = '../index.html';
  } else {
    alert('Pasted value is not a valid one.  Please retry all steps.');
    location.href = 'phase1.html';
  }

  return false;
}




// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
