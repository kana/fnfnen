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




// Get: $.storage('name');
// Set: $.storage('name', value);
// Delete: $.storage('name', null);
jQuery.storage = function (name, value, options) {
  if (window.localStorage) {
    return jQuery.storage.handleWithWebStorage(name, value, options);
  } else {
    return jQuery.storage.handleWithCookie(name, value, options);
  }
};

jQuery.storage.handleWithWebStorage = function (name, value, options) {
  if (typeof value == 'undefined') {
    return window.localStorage[name];
  } else {
    if (value != null) {
      window.localStorage[name] = value;
    } else {
      delete window.localStorage[name];
    }
    return;
  }
};

// jQuery.storage.handleWithCookie is based on jQuery.cookie written by:
// Copyright (c) 2006 Klaus Hartl (stilbuero.de)
// (jQuery.cookie is dually licensed under the MIT and GPL licenses)
jQuery.storage.handleWithCookie = function (name, value, options) {
  if (typeof value != 'undefined') {  // name and value given, set cookie
    options = options || jQuery.storage.handleWithCookie.defaultOptions || {};
    if (value === null) {
      value = '';
      options.expires = -1;
    }
    var expires = '';
    if (options.expires
        && (typeof options.expires == 'number' || options.expires.toUTCString))
    {
      var date;
      if (typeof options.expires == 'number') {
        date = new Date();
        date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
      } else {
        date = options.expires;
      }
        // use expires attribute, max-age is not supported by IE
      expires = '; expires=' + date.toUTCString();
    }
    // CAUTION: Needed to parenthesize options.path and options.domain
    // in the following expressions, otherwise they evaluate to undefined
    // in the packed version for some reason...
    var path = options.path ? '; path=' + (options.path) : '';
    var domain = options.domain ? '; domain=' + (options.domain) : '';
    var secure = options.secure ? '; secure' : '';
    document.cookie = [
      name, '=', encodeURIComponent(value), expires, path, domain, secure
    ].join('');
  } else {  // only name given, get cookie
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = jQuery.trim(cookies[i]);
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
};

jQuery.storage.handleWithCookie.defaultOptions = {
  expires: 30,  // days
  path: (  // 'http://domain/.../fnfnen/.../foo.ext' => '/.../fnfnen/'
    location.href
    .replace(/^[^:]+:\/\/[^\/]*/, '')
    .replace(/(\/fnfnen[^\/]*\/).*/, '$1')
    ),
};




// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
