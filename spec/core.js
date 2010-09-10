describe('Core', function () {
  describe('html_from_tweet', function () {
    var tweet = {
      created_at: 'Wed Sep 08 14:01:49 +0000 2010',
      id: 81,
      in_reply_to_status_id: null,
      favorited: false,
      text: '@ujm hi http://hi.hi/#hi hi',
      user: {
        screen_name: 'kana1',
        profile_image_url: './avatar.png',
      },
    };
    var t_user_icon = [
      '<a',
      ' class="user_icon"',
      ' href="http://twitter.com/kana1"',
      '>',
      '<img',
      ' alt="@kana1"',
      ' height="48"',
      ' src="./avatar.png"',
      ' width="48"',
      '/>',
      '</a>',
    ];
    var t_screen_name = [
      '<a class="screen_name" href="http://twitter.com/kana1">',
      'kana1',
      '</a>',
    ];
    var t_text = [
      '<span class="text">',
      '<a class="screen_name" href="http://twitter.com/ujm">',
      '@ujm',
      '</a>',
      ' hi ',
      '<a class="link" href="http://hi.hi/#hi">',
      'http://hi.hi/#hi',
      '</a>',
      ' hi',
      '</span>',
    ];
    var t_posted_time = [
      '<a class="posted_time" href="http://twitter.com/kana1/status/81">',
      '2010-09-08 23:01:49',
      '</a>',
    ];
    var t_button_to_reply = [
      '<a class="button reply" href="javascript:set_up_to_reply(',
      '\'kana1\',',
      '81',
      ')">',
      '&#x21b5;',
      '</a>',
    ];
    var t_button_to_toggle_favorite = [
      '<a class="button favorite" href="javascript:toggle_favorite(81)">',
      '\u2606',
      '</a>',
    ];

    it('should return a HTML snippet from a tweet', function () {
      var t = $.extend({}, tweet);
      expect(html_from_tweet(t)).toEqual(string_from_tree([
        t_user_icon,
        t_screen_name,
        t_text,
        t_posted_time,
        t_button_to_reply,
        t_button_to_toggle_favorite,
      ]));
    });
    it('should reflect "favorited" status', function () {
      var t = $.extend({}, tweet, {favorited: true});
      expect(html_from_tweet(t)).toEqual(string_from_tree([
        t_user_icon,
        t_screen_name,
        t_text,
        t_posted_time,
        t_button_to_reply,
        '<a class="button favorite" href="javascript:toggle_favorite(81)">',
        '\u2605',
        '</a>',
      ]));
    });
    it('should reflect "in_reply_to_status_id" status', function () {
      var t = $.extend({}, tweet, {in_reply_to_status_id: 8181});
      expect(html_from_tweet(t)).toEqual(string_from_tree([
        t_user_icon,
        t_screen_name,
        t_text,
        t_posted_time,
        t_button_to_reply,
        [
          '<a class="button conversation" href="javascript:show_conversation(',
          '81',
          ')">',
          '&#x267b;',
          '</a>',
        ],
        t_button_to_toggle_favorite,
      ]));
    });
  });
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
    it('should make a link for each hashtag in a string', function () {
      var t = TWITTER_UI_URI;
      var ts = TWITTER_SEARCH_URI;

      expect(_('@kana1 #hi!')).toEqual(
        [
          '<a class="screen_name" href="' + t + 'kana1">@kana1</a>',
          ' ',
          '<a class="hashtag" href="' + ts + '%23hi">#hi</a>',
          '!',
        ].join('')
      );
      expect(_('@kana1 #hi #hey!')).toEqual(
        [
          '<a class="screen_name" href="' + t + 'kana1">@kana1</a>',
          ' ',
          '<a class="hashtag" href="' + ts + '%23hi">#hi</a>',
          ' ',
          '<a class="hashtag" href="' + ts + '%23hey">#hey</a>',
          '!',
        ].join('')
      );
    });
  });
});




// __END__
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=expr
// vim: foldexpr=getline(v\:lnum)=~#'\\v(<describe>|<it>).*<function>\\s*\\([^()]*\\)\\s*\\{'?'a1'\:(getline(v\:lnum)=~#'^\\s*});'?'s1'\:'=')
