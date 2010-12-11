describe('Misc.', function () {
  describe('api_name_from_uri', function () {
    it('should convert a Twitter API URI to a nice name', function () {
      var _ = api_name_from_uri;
      var b = TWITTER_API_URI;

      expect(_(b + 'statuses/update.json')).toEqual('statuses/update');
      expect(_(b + 'favorite/create/123.json')).toEqual('favorite/create/123');
    });
  });
  describe('class_name_from_column_name', function () {
    it('should convert column name nicely', function () {
      expect(class_name_from_column_name('abc')).toEqual('abc');
      expect(class_name_from_column_name('123')).toEqual('123');
      expect(class_name_from_column_name('_-_')).toEqual('_-_');

      expect(class_name_from_column_name('DEF')).toEqual('def');
      expect(class_name_from_column_name('?!?!')).toEqual('');

      expect(class_name_from_column_name('Love me?')).toEqual('loveme');
    });
  });
  describe('compare_tweet_ids', function () {
    it('should compare strings as numbers', function () {
      expect(compare_tweet_ids('0', '1')).toBeLessThan(0);
      expect(compare_tweet_ids('0', '0')).toEqual(0);
      expect(compare_tweet_ids('1', '0')).toBeGreaterThan(0);
    });
    it('should work for numbers bigger than 53bit', function () {
      var v0 = Math.pow(2, 53);
      var v1 = v0 + 1;
      expect(v0).toEqual(v1);  // +1 is too small so that it is truncated.

      var s0 = v0.toString();
      var s1 = s0.replace(/.$/, function (m) {return parseInt(m) + 1;});
      expect(s0).not.toEqual(s1);
      expect(compare_tweet_ids(s0, s0)).toEqual(0);
      expect(compare_tweet_ids(s0, s1)).toBeLessThan(0);
      expect(compare_tweet_ids(s1, s0)).toBeGreaterThan(0);
      expect(compare_tweet_ids(s1, s1)).toEqual(0);
    });
  });
  describe('create_element', function () {
    it('should create a DOM element wrapped by jQuery', function () {
      var e = create_element('div');

      expect(e.length).toEqual(1);
      expect(e[0].localName).toEqual('div');
      expect(e[0] instanceof HTMLDivElement).toBeTruthy();
    });
  });
  describe('englishize', function () {
    it('should convert an identifier to a phrase in English', function () {
      expect(englishize('foo_bar_baz')).toEqual('Foo bar baz');
      expect(englishize('foo_bar_sec')).toEqual('Foo bar (sec.)');
      expect(englishize('foo_uri')).toEqual('Foo URI');
      expect(englishize('foo_kib')).toEqual('Foo (KiB)');
    });
  });
  describe('expand_template', function () {
    it('should replace placeholders properly', function () {
      expect(expand_template('{a}<{b}>{c}', {a: '1', b: '2', c: '3'})).
      toEqual('1<2>3');
      expect(expand_template('{a}<{a}>{a}', {a: '1'})).
      toEqual('1<1>1');
    });
    it('should convert non-string values to strings', function () {
      expect(expand_template('{a}', {a: 4})).toEqual('4');
      expect(expand_template('{a}', {a: null})).toEqual('null');
      expect(expand_template('{a}', {a: undefined})).toEqual('undefined');
      expect(expand_template('{a}', {})).toEqual('undefined');
    });
  });
  describe('favorite_symbol', function () {
    it('should return a character to express favorite status', function () {
      expect(favorite_symbol(true)).toEqual('\u2605');  // black (filled) star
      expect(favorite_symbol(false)).toEqual('\u2606');  // white (empty) star
    });
  });
  describe('format_probability', function () {
    it('should format probability nicely', function () {
      expect(format_probability(0.1234)).toEqual('1234');
      expect(format_probability(0.1234321)).toEqual('1234');
      expect(format_probability(0.12345)).toEqual('1235');
      expect(format_probability(0.9)).toEqual('9000');
      expect(format_probability(0.99)).toEqual('9900');
      expect(format_probability(0.999)).toEqual('9990');
      expect(format_probability(0.9999)).toEqual('9999');
      expect(format_probability(0.99999)).toEqual('9999');
      expect(format_probability(1.0)).toEqual('9999');
    });
  });
  describe('html_from_jsxn', function () {
    it('should convert a HTML snippet string from a jsxn tree', function () {
      var _ = html_from_jsxn;

      expect(_([])).toEqual('');
      expect(_(['t', 'e', 'x', 't'])).toEqual('text');
      expect(_([['t'], 'e', ['x'], 't'])).toEqual('<t/>e<x/>t');
      expect(_([['t', ['@', ['e', 'x']]], 't'])).toEqual('<t e="x"/>t');
    });
  });
  describe('human_readable_format_from_date', function () {
    describe('pad', function () {
      it('should pad 0s properly', function () {
        expect(pad(0).toString()).toEqual('00');
        expect(pad(8).toString()).toEqual('08');
        expect(pad(10).toString()).toEqual('10');
        expect(pad(80).toString()).toEqual('80');
        expect(pad(800).toString()).toEqual('800');
      });
    });
    it('should convert a date to human readable format', function () {
      expect(human_readable_format_from_date(new Date(2010, 8-1, 1, 9, 30, 2)))
        .toEqual('2010-08-01 09:30:02');
    });
  });
  describe('load_cross_domain_script', function () {
    it('should load a script in cross domain', function () {
      // expect().toEqual('FIXME: Not implemented yet');
    });
  });
  describe('nop', function () {
    it('should do nothing', function () {
      expect(nop instanceof Function).toBeTruthy();
      expect(nop()).toBe(undefined);
      expect(nop(1)).toBe(undefined);
      expect(nop(1, '2')).toBe(undefined);
    });
  });
  describe('scroll', function () {
    it('should vertically scroll to the specified position', function () {
      // expect().toEqual('FIXME: Not implemented yet');
    });
  });
  describe('string_from_tree', function () {
    it('should return a given string as is', function () {
      expect(string_from_tree('string')).toEqual('string');
    });
    it('should convert a string from a number', function () {
      expect(string_from_tree(123)).toEqual('123');
    });
    it('should convert a string from an array', function () {
      expect(string_from_tree([1, 2, 3])).toEqual('123');
      expect(string_from_tree(['a', 'b', 'c'])).toEqual('abc');
      expect(string_from_tree(['a', 1, 'b', 2, 'c', 3])).toEqual('a1b2c3');
    });
    it('should convert a string from a nested array', function () {
      expect(string_from_tree(['a', [1, ['b'], 2], 'c', 3])).toEqual('a1b2c3');
    });
  });
  describe('tree_from_jsxn', function () {
    it('should convert a HTML snippet string from a jsxn tree', function () {
      var _ = function (jsxn) {
        return string_from_tree(tree_from_jsxn(jsxn));
      };

      expect(_([])).toEqual('');
      expect(_(['t', 'e', 'x', 't'])).toEqual('text');
      expect(_([['t'], 'e', ['x'], 't'])).toEqual('<t/>e<x/>t');
      expect(_([['t', ['@', ['e', 'x']]], 't'])).toEqual('<t e="x"/>t');
    });
  });
  describe('tree_from_jsxn_attribute', function () {
    it('should convert a proper tree from a jsxn attribute', function () {
      var _ = function (jsxn_attribute) {
        return string_from_tree(tree_from_jsxn_attribute(jsxn_attribute));
      };

      expect(_(['name', 'value'])).toEqual(' name="value"');
      expect(_(['name', 'v"alu"e'])).toEqual(' name="v"alu"e"');
      expect(_(['width', 48])).toEqual(' width="48"');
    });
  });
  describe('tree_from_jsxn_element', function () {
    var _ = function (jsxn_element) {
      return string_from_tree(tree_from_jsxn_element(jsxn_element));
    };

    it('should convert a proper tree from a jsxn text node', function () {
      expect(_('simple text node')).toEqual('simple text node');
      expect(_('simple<text>node')).toEqual('simple<text>node');
    });
    it('should convert jsxn element without any content', function () {
      expect(_(['e'])).toEqual('<e/>');
    });
    it('should convert jsxn element with attribute list', function () {
      expect(_(['e', ['@']])).toEqual('<e/>');
      expect(_(['e', ['@', ['a1', 'v1']]])).toEqual('<e a1="v1"/>');
      expect(_(['e', ['@', ['a1', 'v1'], ['a2', 'v2']]]))
        .toEqual('<e a1="v1" a2="v2"/>');
    });
    it('should convert jsxn element with children', function () {
      expect(_(['e', 't'])).toEqual('<e>t</e>');
      expect(_(['e', 't', 'x'])).toEqual('<e>tx</e>');

      expect(_(['e', ['c']])).toEqual('<e><c/></e>');
      expect(_(['e', 't', ['c', 'x'], 'y'])).toEqual('<e>t<c>x</c>y</e>');
    });
    it('should convert jsxn element with attribute and children', function () {
      expect(_(['e', ['@'], 't', 'x'])).toEqual('<e>tx</e>');
      expect(_(['e', ['@', ['a', 'v']], 't', 'x'])).toEqual('<e a="v">tx</e>');

      expect(_(['e', ['@', ['a1', 'v1']], ['c', ['@', ['a2', 'v2']]]]))
        .toEqual('<e a1="v1"><c a2="v2"/></e>');
    });
  });
  describe('to_string', function () {
    it('should convert any value to a string', function () {
      expect(to_string(1)).toEqual('1');
      expect(to_string('abc')).toEqual('abc');
      expect(to_string({})).toEqual({}.toString());
      expect(to_string(null)).toEqual('null');
      // FIXME: expect(to_string(undefined)).toEqual('undefined');
    });
  });
});




// __END__
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=expr
// vim: foldexpr=getline(v\:lnum)=~#'\\v(<describe>|<it>).*<function>\\s*\\([^()]*\\)\\s*\\{'?'a1'\:(getline(v\:lnum)=~#'^\\s*});'?'s1'\:'=')
