describe('Core', function () {
  describe('html_from_tweet', function () {
    g_preferences = {};
    g_preferences.tweet_html_template = function () {
      return DEFAULT_TWEET_HTML_TEMPLATE;
    };
    tweet_db.data('81', 'prafbe_learning_bias', 0);
    tweet_db.data('81', 'prafbe_result', 0.1234);

    var tweet = {
      created_at: 'Wed Sep 08 14:01:49 +0000 2010',
      id: 18,
      id_str: '81',
      in_reply_to_status_id: null,
      favorited: false,
      text: '@ujm hi http://hi.hi/#hi hi',
      user: {
        screen_name: 'kana1',
        profile_image_url: './avatar.png',
      },
      prafbe_result: 0.1234321,
    };
    var t_main_begin = '<span class="main">';
    var t_prafbe_information = '<span class="debug prafbe">1234</span>';
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
    var t_main_end = '</span>';
    var t_meta_begin = '<span class="meta">';
    var t_posted_time = [
      '<a class="posted_time" href="http://twitter.com/kana1/status/81">',
      '2010-09-08 23:01:49',
      '</a>',
    ];
    var t_button_to_reply = [
      '<a class="button reply" href="javascript:set_up_to_reply(',
      '\'kana1\',',
      '\'81\'',
      ')">',
      '&#x21b5;',
      '</a>',
    ];
    var t_button_to_toggle_favorite = [
      '<a class="button favorite" href="javascript:toggle_favorite(\'81\')">',
      '\u2606',
      '</a>',
    ];
    var t_button_to_learn_tweet_as_right = [
      '<a class="button prafbe"',
      ' href="javascript:learn_tweet(\'81\', true, true)">',
      '&#x25b3;',
      '</a>',
    ];
    var t_button_to_learn_tweet_as_wrong = [
      '<a class="button prafbe"',
      ' href="javascript:learn_tweet(\'81\', false, true)">',
      '&#x25bd;',
      '</a>',
    ];
    var t_meta_end = '</span>';

    it('should return a HTML snippet from a tweet', function () {
      var t = $.extend({}, tweet);
      expect(html_from_tweet(t)).toEqual(string_from_tree([
        t_main_begin,
        t_prafbe_information,
        t_user_icon,
        t_screen_name,
        t_text,
        t_main_end,
        t_meta_begin,
        t_posted_time,
        t_button_to_reply,
        t_button_to_toggle_favorite,
        t_button_to_learn_tweet_as_right,
        t_button_to_learn_tweet_as_wrong,
        t_meta_end,
      ]));
    });
    it('should reflect "favorited" status', function () {
      var t = $.extend({}, tweet, {favorited: true});
      expect(html_from_tweet(t)).toEqual(string_from_tree([
        t_main_begin,
        t_prafbe_information,
        t_user_icon,
        t_screen_name,
        t_text,
        t_main_end,
        t_meta_begin,
        t_posted_time,
        t_button_to_reply,
        '<a class="button favorite"',
        ' href="javascript:toggle_favorite(\'81\')">',
        '\u2605',
        '</a>',
        t_button_to_learn_tweet_as_right,
        t_button_to_learn_tweet_as_wrong,
        t_meta_end,
      ]));
    });
    it('should reflect "in_reply_to_status_id" status', function () {
      var t = $.extend({}, tweet, {in_reply_to_status_id: 8181});
      expect(html_from_tweet(t)).toEqual(string_from_tree([
        t_main_begin,
        t_prafbe_information,
        t_user_icon,
        t_screen_name,
        t_text,
        t_main_end,
        t_meta_begin,
        t_posted_time,
        t_button_to_reply,
        [
          '<a class="button conversation" href="javascript:show_conversation(',
          '\'81\'',
          ')">',
          '&#x267b;',
          '</a>',
        ],
        t_button_to_toggle_favorite,
        t_button_to_learn_tweet_as_right,
        t_button_to_learn_tweet_as_wrong,
        t_meta_end,
      ]));
    });
    it('should reflect "prafbe_result" status', function () {
      var _ = tweet_db.data(tweet, 'prafbe_result', 0.9876);
      expect(html_from_tweet(tweet)).toEqual(string_from_tree([
        t_main_begin,
        '<span class="debug prafbe">9876</span>',
        t_user_icon,
        t_screen_name,
        t_text,
        t_main_end,
        t_meta_begin,
        t_posted_time,
        t_button_to_reply,
        t_button_to_toggle_favorite,
        t_button_to_learn_tweet_as_right,
        t_button_to_learn_tweet_as_wrong,
        t_meta_end,
      ]));
      tweet_db.data(tweet, 'prafbe_result', _);
    });
    it('should reflect "prafbe_learning_bias" status', function () {
      var _;

      _ = tweet_db.data(tweet, 'prafbe_learning_bias', 12);
      expect(html_from_tweet(tweet)).toEqual(string_from_tree([
        t_main_begin,
        t_prafbe_information,
        t_user_icon,
        t_screen_name,
        t_text,
        t_main_end,
        t_meta_begin,
        t_posted_time,
        t_button_to_reply,
        t_button_to_toggle_favorite,
        [
          '<a class="button prafbe"',
          ' href="javascript:learn_tweet(\'81\', true, true)">',
          '&#x25b2;12',
          '</a>',
        ],
        t_button_to_learn_tweet_as_wrong,
        t_meta_end,
      ]));
      tweet_db.data(tweet, 'prafbe_learning_bias', _);

      _ = tweet_db.data(tweet, 'prafbe_learning_bias', -34);
      expect(html_from_tweet(tweet)).toEqual(string_from_tree([
        t_main_begin,
        t_prafbe_information,
        t_user_icon,
        t_screen_name,
        t_text,
        t_main_end,
        t_meta_begin,
        t_posted_time,
        t_button_to_reply,
        t_button_to_toggle_favorite,
        t_button_to_learn_tweet_as_right,
        [
          '<a class="button prafbe"',
          ' href="javascript:learn_tweet(\'81\', false, true)">',
          '&#x25bc;34',
          '</a>',
        ],
        t_meta_end,
      ]));
      tweet_db.data(tweet, 'prafbe_learning_bias', _);
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
describe('Prafbe', function () {
  describe('serialize_prafbe_dict_into_json', function () {
    it('should serialize an empty dict into JSON', function () {
      var d = {};
      expect($.evalJSON(serialize_prafbe_dict_into_json(d))).
      toEqual(d);
    });
    it('should serialize a prafbe dict into JSON', function () {
      var d = {'a': 1, 'b': 2, 'c': 3};
      expect($.evalJSON(serialize_prafbe_dict_into_json(d))).
      toEqual(d);
    });
    xit('should be very faster than $.toJSON', function () {
    });
  });
  describe('tokenize_object', function () {
    it('should tokenize string values', function () {
      expect(tokenize_object({key: 'va*lue'})).
      toEqual(['key*va', 'key*lue']);
    });
    it('should tokenize object values', function () {
      expect(tokenize_object({key: {key2: 'va*lue'}})).
      toEqual(['key*key2*va', 'key*key2*lue']);
      expect(tokenize_object({key: ['va*lue']})).
      toEqual(['key*0*va', 'key*0*lue']);
    });
    it('should ignore other types', function () {
      expect(tokenize_object({key: 1})).toEqual([]);
      expect(tokenize_object({key: null})).toEqual([]);
      expect(tokenize_object({key: undefined})).toEqual([]);
    });
  });
});




// __END__
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=expr
// vim: foldexpr=getline(v\:lnum)=~#'\\v<x?(describe|it)>.*<function>\\s*\\([^()]*\\)\\s*\\{'?'a1'\:(getline(v\:lnum)=~#'^\\s*});'?'s1'\:'=')
