describe('Misc.', function () {
  describe('api_name_from_uri', function () {
    it('should convert a Twitter API URI to a nice name', function () {
      var _ = api_name_from_uri;
      var b = TWITTER_API_URI;

      expect(_(b + 'statuses/update.json')).toEqual('statuses/update');
      expect(_(b + 'favorite/create/123.json')).toEqual('favorite/create/123');
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
    });
  });

  describe('favorite_symbol', function () {
    it('should return a character to express favorite status', function () {
      expect(favorite_symbol(true)).toEqual('\u2605');  // black (filled) star
      expect(favorite_symbol(false)).toEqual('\u2606');  // white (empty) star
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




// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
