describe('Core', function () {
  describe('make_links_in_text', function () {
    var _ = make_links_in_text;

    it('should make a link for each http URI in a given string', function () {
      expect(_('http://foo/')).toEqual(
        '<a class="link" href="http://foo/">http://foo/</a>'
      );
      expect(_('http://foo/#bar')).toEqual(
        '<a class="link" href="http://foo/#bar">http://foo/#bar</a>'
      );
      expect(_('One http://for/ the http://money/ !')).toEqual(
        [
          'One',
          '<a class="link" href="http://for/">http://for/</a>',
          'the',
          '<a class="link" href="http://money/">http://money/</a>',
          '!',
        ].join(' ')
      );
    });
    it('should make a link for each https URI in a given string', function () {
      expect(_('https://foo/')).toEqual(
        '<a class="link" href="https://foo/">https://foo/</a>'
      );
    });
    it('should make a link for each screen name in a string', function () {
      var t = TWITTER_UI_URI;

      expect(_('@kana1 Hi.')).toEqual(
        [
          '<a class="screen_name" href="' + t + 'kana1">@kana1</a>',
          'Hi.',
        ].join(' ')
      );
      expect(_('@kana1 @ujm Hi hi.')).toEqual(
        [
          '<a class="screen_name" href="' + t + 'kana1">@kana1</a>',
          '<a class="screen_name" href="' + t + 'ujm">@ujm</a>',
          'Hi hi.',
        ].join(' ')
      );
    });
  });
});




// __END__
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=expr
// vim: foldexpr=getline(v\:lnum)=~#'\\v(<describe>|<it>).*<function>\\s*\\([^()]*\\)\\s*\\{'?'a1'\:(getline(v\:lnum)=~#'^\\s*});'?'s1'\:'=')
