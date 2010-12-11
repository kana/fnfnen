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
// Notes  {{{1
//
// Design:
// - A tabpage contains 1 or more columns.
// - A column is to show tweets or other information.
// - Currently, a tabpage contains only 1 column.  There is no distinction
//   between column and tabpage.  Use term "column" at this moment.
//
// Coding style:
// - Variables suffixed with "_ms" and "_MS" contain an integer as millisecond.
// - Variables suffixed with "_sec" and "_SEC" contain an integer as second.
// - Suffix "_n2o"/"_o2n" means an array of values which are sorted from newest
//   to oldest or from oldest to newest.
// - Write "function (a, b) {...}", not "function(a,b){...}".
// - Prefix "opt_" to optional arguments.
// - Use the name "response" for variable which contains the result of
//   a request to Twitter API.  For example, write "function (response) {...}"
//   for request.callback for request_twitter_api_with_oauth().








// Variables  {{{1
// Constants  {{{2

var DEFAULT_APPLYING_PRIORITY = 0;
var DEFAULT_UPDATE_INTERVAL_SEC = 5 * 60;
var DUMMY_SINCE_ID = '1';
var GLOBAL_VARIABLES = window;
var HOME_COLUMN_NAME = 'Home';
var LAST_APPLYING_PRIORITY = 1000;
var MAX_TWEET_CONTENT = 140;
var MINIMUM_UPDATE_INTERVAL_SEC = 1 * 60;
var TWITTER_API_URI = 'http://api.twitter.com/1/';
var TWITTER_SEARCH_URI = 'http://search.twitter.com/search?q=';
var TWITTER_UI_URI = 'http://twitter.com/';

var DEFAULT_TWEET_HTML_TEMPLATE = [
  '<span class="main">',
  '{prafbe_information}',
  '{user_icon}',
  '{screen_name}',
  '{text}',
  '</span>',
  '<span class="meta">',
  '{posted_time}',
  '{button_to_reply}',
  '{button_to_show_conversation}',
  '{button_to_toggle_favorite}',
  '{button_to_learn_as_a_right_tweet}',
  '{button_to_learn_as_a_wrong_tweet}',
  '</span>',
].join('');




// Global  {{{2

var g_external_configuration = {/* preference_name: value */};
var g_parameters = {'automatic_update': true};
var g_plugins = [/* plugin = {event_name: function, ...}, ... */];
var g_prafbe_learning_count = 0;
var g_preferences = {/* name: preference, ... */};
var g_since_id_home = DUMMY_SINCE_ID;  // BUGS: Tweet #1 cannot be shown.
var g_since_id_mentions = DUMMY_SINCE_ID;  // BUGS: Tweet #1 cannot be shown.
var g_tweet_id_to_reply = null;
var g_update_timer = null;
var g_user = null;








// Core  {{{1
function authenticate()  //{{{2
{
  request_twitter_api_with_oauth({
    callback: function (response) {
      if (response.error == null) {
        g_user = response;
        update();
      }
    },
    from: 'Authentication',
    method: 'get',
    uri: TWITTER_API_URI + 'account/verify_credentials.json',
  });
  return;
}




function before_post()  //{{{2
{
  var text = $('#tweet_box').val();

  if (text == '') {
    // Update timeline manually.
    update();
    reset_automatic_update_timer(
      g_preferences.update_interval_sec()
    );
    return;
  }

  if (MAX_TWEET_CONTENT < text.length) {
    // Warn and disable to post a too long tweet.
    for (var i = 0; i < 3; i++) {
      $('#tweet_content_counter').fadeOut('fast');
      $('#tweet_content_counter').fadeIn('fast');
    }
    return;
  }

  // Post a tweet.
  parameters = {};
  parameters.status = text;
  if (g_tweet_id_to_reply)
    parameters.in_reply_to_status_id = g_tweet_id_to_reply;

  request_twitter_api_with_oauth({
    callback: function (response) {
      if (response == null)  // NB: Same origin policy.
        show_balloon('Post', 'Tweet has been posted');
      else if (response.error == null)
        update_with_given_tweet(response);
      else
        ;
    },
    from: 'Post',
    method: $('#post_form').attr('method'),
    parameters: parameters,
    uri: $('#post_form').attr('action'),
  });

  // Clear stuffs.
  $('#tweet_box').val('');
  g_tweet_id_to_reply = null;

  return;
}




function class_name_from_tweet_id(tweet_id)  //{{{2
{
    return 'tweet_id_' + tweet_id;
}




function count_tweet_content(e)  //{{{2
{
  var remain = MAX_TWEET_CONTENT - $('#tweet_box').val().length;

  $('#tweet_content_counter').text(remain);

  $('#tweet_content_counter').removeClass();
  if (remain < 0)
    $('#tweet_content_counter').addClass('much_content');
  else if (remain == 0)
    $('#tweet_content_counter').addClass('full_content');
  else if (remain < MAX_TWEET_CONTENT)
    $('#tweet_content_counter').addClass('some_content');
  else if (remain == MAX_TWEET_CONTENT)
    $('#tweet_content_counter').addClass('no_content');
  else
    ;

  return true;
}




function fnfnen_external_configuration(data)  //{{{2
{
  g_external_configuration = data;
  g_preferences.apply(true);
  return;
}




function html_from_tweet(tweet)  //{{{2
{
  var bias = tweet_db.data(tweet, 'prafbe_learning_bias');
  var values = {
    prafbe_information: [
      'span',
      [
        '@',
        ['class', 'debug prafbe'],
      ],
      format_probability(tweet_db.data(tweet, 'prafbe_result')),
    ],
    user_icon: [
      'a',
      [
        '@',
        ['class', 'user_icon'],
        ['href', TWITTER_UI_URI + tweet.user.screen_name],
      ],
      [
        'img',
        [
          '@',
          ['alt', '@' + tweet.user.screen_name],
          ['height', 48],
          ['src', tweet.user.profile_image_url],
          ['width', 48],
        ],
      ],
    ],
    screen_name: [
      'a',
      [
        '@',
        ['class', 'screen_name'],
        ['href', TWITTER_UI_URI + tweet.user.screen_name],
      ],
      tweet.user.screen_name,
    ],
    text: [
      'span',
      [
        '@',
        ['class', 'text'],
      ],
      make_links_in_text(tweet.text),
    ],
    posted_time: [
      'a',
      [
        '@',
        ['class', 'posted_time'],
        ['href',
          TWITTER_UI_URI + tweet.user.screen_name + '/status/' + tweet.id_str],
      ],
      human_readable_format_from_date(new Date(tweet.created_at)),
    ],
    button_to_reply: [
      'a',
      [
        '@',
        ['class', 'button reply'],
        ['href', string_from_tree([
          'javascript:set_up_to_reply(',
            "'", tweet.user.screen_name, "'", ',',
            "'", tweet.id_str, "'",
          ')',
        ])]
      ],
      '&#x21b5;',  // Carriage return symbol
    ],
    button_to_show_conversation: (
      tweet.in_reply_to_status_id
      ? [
        'a',
        [
          '@',
          ['class', 'button conversation'],
          ['href', 'javascript:show_conversation(\'' + tweet.id_str + '\')'],
        ],
        '&#x267b;',  // Black universal recycling symbol
      ]
      : ''
    ),
    button_to_toggle_favorite: [
      'a',
      [
        '@',
        ['class', 'button favorite'],
        ['href', 'javascript:toggle_favorite(\'' + tweet.id_str + '\')'],
      ],
      favorite_symbol(tweet.favorited),
    ],
    button_to_learn_as_a_right_tweet: [
      'a',
      [
        '@',
        ['class', 'button prafbe'],
        ['href', 'javascript:learn_tweet(\''+tweet.id_str+'\', true, true)'],
      ],
      (0 < bias
       ? '&#x25b2;' + bias.toString()
       : '&#x25b3;'),
    ],
    button_to_learn_as_a_wrong_tweet: [
      'a',
      [
        '@',
        ['class', 'button prafbe'],
        ['href', 'javascript:learn_tweet(\''+tweet.id_str+'\', false, true)'],
      ],
      (bias < 0
       ? '&#x25bc;' + Math.abs(bias).toString()
       : '&#x25bd;'),
    ],
  };
  for (var i in values)
    values[i] = html_from_jsxn([values[i]]);

  return expand_template(
    g_preferences.tweet_html_template(),
    values
  );
}




function learn_tweet(tweet_id, right_tweet_p, interactive_p)  //{{{2
{
  var tweet = tweet_db.get(tweet_id);
  var bias = (tweet_db.data(tweet, 'prafbe_learning_bias') || 0);

  var tokens = tokenize_tweet(tweet);
  var step = function () {
    if (right_tweet_p) {
      if (0 <= bias)
        prafbe.learn(g_preferences.prafbe_right_dict(), tokens);
      else
        prafbe.unlearn(g_preferences.prafbe_wrong_dict(), tokens);
    } else {
      if (bias <= 0)
        prafbe.learn(g_preferences.prafbe_wrong_dict(), tokens);
      else
        prafbe.unlearn(g_preferences.prafbe_right_dict(), tokens);
    }
    g_prafbe_learning_count++;
    bias += (right_tweet_p ? 1 : -1);
  };
  var old_status = is_spam_tweet_p(tweet);
  var new_status = old_status;
  var limit = 100;  // step() may be repeated many times.  Define the limit.
  while (new_status == old_status && 0 < limit) {
    step();

    var learned_right_tweet_as_right_p = ((!old_status) && right_tweet_p);
    var learned_wrong_tweet_as_wrong_p = (old_status && (!right_tweet_p));
    if (learned_right_tweet_as_right_p || learned_wrong_tweet_as_wrong_p)
      break;
    if (bias != 0)
      new_status = is_spam_tweet_p(tweet);
    limit--;
  }
  tweet_db.data(tweet, 'prafbe_learning_bias', bias);

  if (interactive_p) {
    if (false) {
      // To improve response time for interactive learn_tweet(),
      // save_prafbe_learning_result() is not called intentionally.
      //
      // Though learning result should be saved at this point, it takes a long
      // time to save.  And save_prafbe_learning_result() is also called from
      // TweetDatabase.add() which is periodically called via update().
      save_prafbe_learning_result();
    }

    var update_view = function (tweet_id) {
      // $('foo').replaceWith($('#bar')) replaces all foo elements with #bar,
      // but #bar is not cloned for each foo element.  So it actually removes
      // all foo elements then moves #bar to the location of the last foo.
      // Therefore node_tweet must be cloned for each time.
      var node_tweet = node_from_tweet(tweet_db.get(tweet_id));
      $('.' + class_name_from_tweet_id(tweet_id))
        .replaceWith(function () {return node_tweet.clone();});
    };
    if (false) {  // FIXME: Add preference.
      for (var i in tweet_db.ids())
        update_view(i);
    } else {
      update_view(tweet_id);
    }
  }

  return;
}




function make_links_in_text(text)  //{{{2
{
  // FIXME: Regular expression for URI.
  return text.replace(
    /https?:\/\/[\w!#$%&'*+,.\/:;=?@~-]+|@(\w+)|#(\w+)/g,
    function (matched_string, screen_name, hashtag) {
      if (screen_name) {
        return html_from_jsxn([
          [
            'a',
            [
              '@',
              ['class', 'screen_name'],
              ['href', TWITTER_UI_URI + screen_name],
            ],
            matched_string,
          ],
        ]);
      } else if (hashtag) {
        return html_from_jsxn([
          [
            'a',
            [
              '@',
              ['class', 'hashtag'],
              ['href',
               TWITTER_SEARCH_URI + encodeURIComponent(matched_string)],
            ],
            matched_string,
          ],
        ]);
      } else {
        return html_from_jsxn([
          [
            'a',
            [
              '@',
              ['class', 'link'],
              ['href', matched_string],
            ],
            matched_string,
          ],
        ]);
      }
    }
  );
}




function node_from_tweet(tweet)  //{{{2
{
    var node_tweet = create_element('div');

    node_tweet.data('json', tweet);

    node_tweet.addClass('tweet');
    node_tweet.addClass(class_name_from_tweet_id(tweet.id_str));
    if (tweet_mention_p(tweet))
      node_tweet.addClass('mention');
    if (tweet_mine_p(tweet))
      node_tweet.addClass('mine');
    node_tweet.addClass(censorship_classes_from_tweet(tweet).join(' '));

    // tweet may be modified in-place by censorship_classes_from_tweet(),
    // so that html_from_tweet() should be called after it.
    node_tweet.html(html_from_tweet(tweet));

    return node_tweet;
}




function node_from_tweets_n2o(tweets_n2o)  //{{{2
{
  var node_tweet_hub = create_element('div');
  var node_dummy_tweet = create_element('div');

  node_tweet_hub.append(node_dummy_tweet);
  node_tweet_hub.addClass('tweet_hub');
  if (tweets_n2o.length == 0)
    node_tweet_hub.addClass('empty');

  for (var i in tweets_n2o)
    node_tweet_hub.append(node_from_tweet(tweets_n2o[i]));

  node_dummy_tweet.remove();

  return node_tweet_hub;
}




function set_up_to_reply(screen_name, tweet_id)  //{{{2
{
  g_tweet_id_to_reply = tweet_id;
  $('#tweet_box').val('@' + screen_name + ' ' + $('#tweet_box').val());
  $('#tweet_box').focus();

  // Scroll to #console.
  scroll(0);
  return;
}




function show_conversation(tweet_id)  //{{{2
{
  var tweets_in_conoversation_n2o = list_tweets_in_conversation_n2o(tweet_id);

  var column_name = 'Conversation';
  var node_column = column(column_name);
  if (node_column.length == 0) {
    node_column = create_column(column_name, 'temporary');
    append_column(node_column);
  }
  node_column.empty();

  select_column(column_name);

  add_tweets_n2o_into_column(node_column, tweets_in_conoversation_n2o);

  complete_missing_tweets_in_a_conversation(tweets_in_conoversation_n2o,
                                            node_column);
}


function list_tweets_in_conversation_n2o(tweet_id)
{
  var tweets_in_conoversation_n2o = [];  // newest_tweet, ..., oldest_tweet

  var id = tweet_id;
  while (id != null) {
    var tweet = tweet_db.get(id);
    if (tweet == null)
      break;

    tweets_in_conoversation_n2o.push(tweet);

    id = tweet.in_reply_to_status_id;
  }

  return tweets_in_conoversation_n2o;
}


function complete_missing_tweets_in_a_conversation(tweets_n2o, node_column)
{
  var fetch_next_tweet = function (tweets_n2o) {
    var oldest_tweet = tweets_n2o[tweets_n2o.length - 1];
    var next_tweet_id = oldest_tweet.in_reply_to_status_id;
    if (next_tweet_id) {
      var next_tweets_n2o = list_tweets_in_conversation_n2o(next_tweet_id);
      if (1 <= next_tweets_n2o.length) {
        // A part of conversation including next_tweet_id is already loaded.
        // Reuse it to make a response quickly.
        append_tweets_n2o(next_tweets_n2o);
      } else {
        // Specified tweet (next_tweet_id) is not loaded.  Fetch it.
        request_twitter_api_with_oauth({
          callback: function (response) {
            if (response.error == null)
              append_tweets_n2o([response]);
          },
          from: 'Conversation',
          method: 'get',
          uri: TWITTER_API_URI + 'statuses/show/' + next_tweet_id + '.json',
        });
      }
    }
  };
  var append_tweets_n2o = function (next_tweets_n2o) {
    tweet_db.add(next_tweets_n2o);

    // Conversation column may be deleted by user while completing tweets.
    var column_exists_p = (0 < node_column.parent().length);
    if (column_exists_p) {
      add_tweets_n2o_into_column(node_column, next_tweets_n2o, 'append');
      fetch_next_tweet(next_tweets_n2o);
    }
  };

  if (1 <= tweets_n2o.length)
    fetch_next_tweet(tweets_n2o);
}




function toggle_favorite(tweet_id)  //{{{2
{
  var nodes_tweet = $("." + class_name_from_tweet_id(tweet_id));
  var nodes_buttons = nodes_tweet.children('.button.favorite');
  var tweet = nodes_tweet.data('json');
  var currently_favorited_p = tweet.favorited;
  var new_favorited_p = !currently_favorited_p;

  function fade_in() {nodes_buttons.fadeIn('slow', fade_out);}
  function fade_out() {nodes_buttons.fadeOut('slow', fade_in);}
  function start_fading() {fade_out();}
  function stop_fading() {fade_out = nop;}
  function update_views()
  {
    tweet.favorited = new_favorited_p;
    nodes_tweet.data('json', tweet);
    nodes_buttons.text(favorite_symbol(new_favorited_p));
    stop_fading();
  }

  request_twitter_api_with_oauth({
    callback: function (response) {
      if (response && response.error)
        stop_fading();
      else
        update_views();
    },
    from: 'Favorite',
    method: 'post',
    parameters: {
    },
    uri: (
      TWITTER_API_URI
      + (currently_favorited_p
          ? 'favorites/destroy'
          : 'favorites/create')
      + '/'
      + tweet_id
      + '.json'
    ),
  });
  start_fading();
  return;
}




function tweet_mention_p(tweet)  //{{{2
{
  return tweet.text.match(new RegExp('@' + g_user.screen_name + '\\b', 'i'));
}




function tweet_mine_p(tweet)  //{{{2
{
  return tweet.user.id_str == g_user.id_str;
}




// Update  {{{2
// Variables  {{{3

var QUEUE_ID_HOME = 'home';
var QUEUE_ID_MENTIONS = 'mentions';
var VALID_QUEUE_IDS = [QUEUE_ID_HOME, QUEUE_ID_MENTIONS];

var g_tweet_queues = {/* queue_id: tweets_n2o = [newest, ..., oldest] */};


function callback_update(response, name_since_id, queue_id)  //{{{3
{
  // response = [{newest-tweet}, ..., {oldest-tweet}]

  var new_tweets_n2o = [];
  if (response.error == null) {
    new_tweets_n2o = response;

    if (0 < new_tweets_n2o.length) {
      var newest_id = new_tweets_n2o[0].id_str;
      GLOBAL_VARIABLES[name_since_id] = (
        0 < compare_tweet_ids(GLOBAL_VARIABLES[name_since_id], newest_id)
        ? GLOBAL_VARIABLES[name_since_id]
        : newest_id
      );
    }
  } else {
    return;
  }

  queue_tweets_n2o(new_tweets_n2o, queue_id);
  return;
}


function merge_tweets_n2o(tweet_sets)  //{{{3
{
  var tweet_table = {};
  var tweet_ids = [];
  for (var i in tweet_sets) {
    var tweets = tweet_sets[i];
    for (var j in tweets) {
      var t = tweets[j];
      if (tweet_table[t.id_str] == null) {
        tweet_table[t.id_str] = t;
        tweet_ids.push(t.id_str);
      }
    }
  }

  tweet_ids.sort(compare_tweet_ids);
  tweet_ids.reverse();

    // newest, ..., oldest
  var merged_tweets_n2o = (
    tweet_ids
    .map(function (id) {return tweet_table[id];})
  );

  return merged_tweets_n2o;
}


function queue_tweets_n2o(tweets_n2o, queue_id)  //{{{3
{
  // Prepend tweets into a queue.
  if (g_tweet_queues[queue_id] == null)
    g_tweet_queues[queue_id] = [];
  var queue = g_tweet_queues[queue_id];
  var args = [0, 0];
  args.push.apply(args, tweets_n2o);
  queue.splice.apply(queue, args);

  // Show tweets if all queues are filled.
  var full_p = true;
  for (var i in VALID_QUEUE_IDS)
    full_p = full_p && (g_tweet_queues[VALID_QUEUE_IDS[i]] != null);
  if (full_p) {
    var merged_tweets_n2o = merge_tweets_n2o(g_tweet_queues);

    $('#last_updated_time').text('Last updated: ' + new Date().toString());
    tweet_db.add(merged_tweets_n2o);
    update_censored_columns(merged_tweets_n2o);

    g_tweet_queues = {};
  }
}


function reset_automatic_update_timer(interval_sec)  //{{{3
{
  if (g_parameters['automatic_update']) {
    clearInterval(g_update_timer);
    g_update_timer = setInterval(update, interval_sec * 1000);
  }
  return;
}


function update()  //{{{3
{
  if (!g_user)
    return authenticate();

  request_twitter_api_with_oauth({
    callback: function (response) {
      callback_update(response, 'g_since_id_home', QUEUE_ID_HOME);
    },
    from: 'Update (home)',
    method: 'get',
    parameters: {
      count: g_preferences.maximum_number_of_tweets_to_fetch(),
      since_id: g_since_id_home,
    },
    uri: TWITTER_API_URI + 'statuses/home_timeline.json',
  });
  request_twitter_api_with_oauth({
    callback: function (response) {
      callback_update(response, 'g_since_id_mentions', QUEUE_ID_MENTIONS);
    },
    from: 'Update (mentions)',
    method: 'get',
    parameters: {
      count: g_preferences.maximum_number_of_tweets_to_fetch(),
      since_id: g_since_id_mentions,
    },
    uri: TWITTER_API_URI + 'statuses/mentions.json',
  });
  return;
}


function update_with_given_tweet(tweet)  //{{{3
{
  if (!(tweet_db.has_p(tweet)))
  {
    tweet_db.add([tweet]);
    update_censored_columns([tweet]);
  }
  return;
}








// Censorship  {{{1
// Variables  {{{2

var g_censored_columns = {/* name: required_classes, ... */};
var g_censorship_law = [/* {classes, property, pattern}, ... */];




function censored_tweet_p(tweet, required_classes)  //{{{2
{
  var actual_classes = censorship_classes_from_tweet(tweet);

  var ok_p = true;
  for (var _ in required_classes)
    ok_p = ok_p && (0 <= actual_classes.indexOf(required_classes[_]));

  return ok_p;
}




function censorship_classes_from_tweet(tweet)  //{{{2
{
  var classes;

  if (tweet_db.data(tweet, 'censorship_law') != g_censorship_law) {
    classes = [];
    for (var i in g_censorship_law) {
      var rule = g_censorship_law[i];

      var keys = rule.property.split('.');
      var value = tweet;
      for (var j in keys) {
        if (value == null || value == undefined)
          break;
        var value = value[keys[j]];
      }

      if (rule.pattern.test(to_string(value)))
        classes.push.apply(classes, rule.classes);
    }
    tweet_db.data(tweet, 'censorship_classes', classes);
    tweet_db.data(tweet, 'censorship_law', g_censorship_law);
  } else {
    classes = tweet_db.data(tweet, 'censorship_classes');
  }
  classes = classes.slice(0);

  var p = calculate_spam_probability(tweet);
  var bias = tweet_db.data(tweet, 'prafbe_learning_bias');
  classes.push(is_spam_tweet_p(tweet)
               ? 'spam'
               : 'nonspam');
  classes.push('score' + Math.min(Math.round(p * 10), 9));
  if (0 < bias)
    classes.push('bias_plus');
  if (bias < 0)
    classes.push('bias_minus');

  return classes;
}




function fill_column_with_censored_tweets(node_column, required_classes) //{{{2
{
  var ids = [];
  for (var id in tweet_db.ids())
    ids.push(id);
  ids.sort(compare_tweet_ids);
  ids.reverse();
  var ids_n2o = ids;
  var tweets_n2o = ids_n2o.map(function (_) {return tweet_db.get(_);});

  var matches_p = function (t) {return censored_tweet_p(t, required_classes);}
  var censored_tweets_n2o = tweets_n2o.filter(matches_p);

  if (0 < censored_tweets_n2o.length)
    add_tweets_n2o_into_column(node_column, censored_tweets_n2o);

  return;
}




function set_up_censored_columns(rule_text)  //{{{2
{
  var old_censored_columns = g_censored_columns;
  var columns_order = [];

  // Parse settings on "censored" columns.
  g_censored_columns = {};
  var lines = rule_text.split('\n');
  for (var i in lines) {
    var line = lines[i];
    if (/^\s*#/.test(line))
      continue;

    var FIELD_SEPARATOR = ':';
    var REQUIRED_FIELDS_COUNT = 2;
    var fields = line.split(FIELD_SEPARATOR);
    if (fields.length < REQUIRED_FIELDS_COUNT)
      continue;

    var name = fields[0];
    var required_classes;
    try {
      required_classes = (fields
                          .slice(REQUIRED_FIELDS_COUNT - 1)
                          .join(FIELD_SEPARATOR)
                          .split(/\s+/));
    } catch (e) {
      log_error('Censored columns', 'Error in rule: "' + line + '"');
      continue;
    }

    g_censored_columns[name] = required_classes;
    columns_order.push(name);
  }

  // Add predefined columns as if they are written in rule_text.
  g_censored_columns[HOME_COLUMN_NAME] = [];  // All tweets will be appeared.
  columns_order = $.merge([HOME_COLUMN_NAME], columns_order);

  // Remove existing "censored" columns.
  for (var column_name in old_censored_columns)
    delete_column(column_name, true);

  // Add "censored" columns.
  for (var _ in columns_order) {
    var column_name = columns_order[_];
    var node_column = create_column(column_name, 'censorship_result');
    fill_column_with_censored_tweets(node_column,
                                     g_censored_columns[column_name]);
    append_column(node_column,
                  (column_name == HOME_COLUMN_NAME
                   ? 'first'
                   : 'last'));
  }
  select_column(HOME_COLUMN_NAME);

  return;
}




function set_up_censorship_law(rule_text)  //{{{2
{
  g_censorship_law = [];

  var lines = rule_text.split('\n');
  for (var i in lines) {
    var line = lines[i];
    if (/^\s*#/.test(line))
      continue;

    var FIELD_SEPARATOR = ':'
    var fields = line.split(FIELD_SEPARATOR);
    if (fields.length < 3)
      continue;

    var re_pattern;
    try {
       var _ = fields.slice(2).join(FIELD_SEPARATOR);
       var ignore_case_p = _.indexOf('?') == 0;
       var pattern = ignore_case_p ? _.substring(1) : _;
       var flags = ignore_case_p ? 'i' : '';
       re_pattern = new RegExp(pattern, flags);
    } catch (e) {
      log_error('Censorship law', 'Error in pattern: "' + line + '"');
      continue;
    }

    g_censorship_law.push({
      classes: fields[0].split(/\s+/),
      property: fields[1],
      pattern: re_pattern,
    });
  }

  return;
}




function update_censored_columns(tweets_n2o) //{{{2
{
  // Tweet views (.tweet) are filtered at CSS level instead of DOM level.
  // Because tweet views may be updated after they are inserted into a column.

  raise_event('new_tweets', {tweets: tweets_n2o});

  for (var column_name in g_censored_columns)
    add_tweets_n2o_into_column(column(column_name), tweets_n2o);

  var css = [];
  css.push('.column .tweet {display: none;}\n');
  for (var column_name in g_censored_columns) {
    var required_classes = g_censored_columns[column_name];
    css.push([
      '.column',
      '.', class_name_from_column_name(column_name),
      ' ',
      '.tweet',
      required_classes.map(function (x) {return ['.', x];}),
      ' ',
      '{display: block;}',
      '\n',
    ]);
  }
  replace_stylesheet('fnfnen_column_filtering_stylesheet',
                     string_from_tree(css));

  return;
}








// Columns  {{{1
function add_tweets_n2o_into_column(node_column, tweets_n2o, opt_place)  //{{{2
{
  var place = opt_place || 'prepend';  // MUST be 'append' or 'prepend'.

  var node_tweets = node_from_tweets_n2o(tweets_n2o);
  node_tweets.hide();
  node_column[place](node_tweets);
  node_tweets.slideDown();

  // Scroll to the head of the latest tweet hub.
  if (node_column.hasClass('active'))
    scroll(0);

  return;
}




function append_column(node_column, opt_position)  //{{{2
{
  // opt_position MUST be 'first', 'last' or 'predefined'.
  var position = opt_position || 'last';

  if (position != 'predefined')
    $('#columns').append(node_column);

  var column_name = node_column.data('title');

  var node_selector = create_element('span');
  node_selector.attr('class', 'column_selector');
  node_selector.data('title', column_name);
  node_selector.click(function () {
    select_column(column_name);
    return false;
  });

  var node_label = create_element('span');
  node_label.addClass('label');
  node_label.text(column_name);

  if (node_column.hasClass('temporary')) {
    var node_button = create_element('span');
    node_button.addClass('button');
    node_button.text('\u2612');  // [X] - BALLOT BOX WITH X
    node_button.click(function () {
      delete_column(column_name);
      return;
    });
  }

  node_selector.append(node_label);
  node_selector.append(node_button);
  if (position == 'first')
    $('#column_selectors').prepend(node_selector);
  else
    $('#column_selectors').append(node_selector);
  return;
}




function class_name_from_column_name(column_name)  //{{{2
{
  return column_name.toLowerCase().replace(/[^0-9a-z_-]/g, '');
}




function column(opt_column_name)  //{{{2
{
  if (opt_column_name) {
    return $('.column').filter(function () {
      return $(this).data('title') == opt_column_name;
    });
  } else {
    return $('.column');
  }
}




function column_selector(opt_column_name)  //{{{2
{
  if (opt_column_name) {
    return $('.column_selector').filter(function () {
      return $(this).data('title') == opt_column_name;
    });
  } else {
    return $('.column_selector');
  }
}




function create_column(column_name, additional_classes)  //{{{2
{
  var node_column = create_element('div');
  node_column.data('title', column_name);
  node_column.addClass('column');
  if (additional_classes)
    node_column.addClass(additional_classes);
  node_column.addClass(class_name_from_column_name(column_name));

  node_column.hide();

  return node_column;
}




function delete_column(column_name_or_node, forced_p)  //{{{2
{
  var column_name;
  var node_column;
  if (typeof(column_name_or_node) == 'string') {
    column_name = column_name_or_node;
    node_column = column(column_name);
  } else {
    node_column = column_name_or_node;
    column_name = node_column.data('title');
  }

  if (node_column.length != 1) {
    return log_error(
      'System (delete_column)',
      'Unexpected column_name_or_node: ' + column_name_or_node
    );
  }

  // Some kinds of columns are indestructible.
  if (node_column.hasClass('predefined')
      || ((!forced_p) && node_column.hasClass('censorship_result')))
    return;

  if (node_column.hasClass('active'))
    select_column(HOME_COLUMN_NAME);  // FIXME: Is there better column?

  node_column.remove();
  column_selector(column_name).remove();
}




function select_column(column_name)  //{{{2
{
  var KEY_VIEW = 'view'

  $('.active.column').data(KEY_VIEW, window.pageYOffset);

  column().removeClass('active').hide();
  column(column_name).addClass('active').show();

  column_selector().removeClass('active');
  column_selector(column_name).addClass('active').removeClass('unread');

  var view = $('.active.column').data(KEY_VIEW);
  if (view != null)
    scroll(view);
  return;
}








// Log  {{{1
function log(type, from, message)  //{{{2
{
  var node_log = create_element('div');
  node_log.addClass('log');
  node_log.addClass(type);

  var node_date = create_element('span');
  node_date.addClass('date');
  node_date.text(human_readable_format_from_date(new Date()));

  var node_type = create_element('span');
  node_type.addClass('type');
  node_type.text(type.charAt(0).toUpperCase() + type.substring(1));

  var node_from = create_element('span');
  node_from.addClass('from');
  node_from.text(from);

  var node_message = create_element('span');
  node_message.addClass('message');
  node_message.text(message);

  node_log.append(node_date);
  node_log.append(node_type);
  node_log.append(node_from);
  node_log.append(node_message);
  $('#column_error_log').prepend(node_log);

  show_balloon(from, message);
}




function log_error(from, message)  //{{{2
{
  log('error', from, message);

  column_selector('Error Log').not('.active').addClass('unread');
}




function log_notice(from, message)  //{{{2
{
  log('notice', from, message);
}




function show_balloon(opt_from, message)  //{{{2
{
  var from = message ? opt_from : null;
  var message = message ? message : opt_from;

  var node_from = create_element('span').addClass('from').text(from);
  var node_message = create_element('span').addClass('message').text(message);

  var node_balloon = create_element('div');
  node_balloon.addClass('balloon');
  node_balloon.hide();
  if (from)
    node_balloon.append(node_from);
  node_balloon.append(node_message);

  $('#balloon_container').append(node_balloon);

  (node_balloon
   .fadeIn()
   .delay(10 * 1000)
   .slideUp(function () {$(this).remove();}));
  return;
}








// Plugins  {{{1
function load_plugins(plugin_uris)  //{{{2
{
  for (var i in plugin_uris) {
    var uri = plugin_uris[i];

    if (/^\s*$/.test(uri))  // Skip blank lines.
      continue;

    var node_script = create_element('script');
    node_script.attr('src', uri);
    node_script.attr('type', 'text/javascript');
    $('body').append(node_script);
  }
}




function raise_event(event_name, kw)  //{{{2
{
  for (var i in g_plugins) {
    var event_handler = g_plugins[i][event_name] || nop;
    event_handler(kw);
  }
}




function register_plugin(plugin)  //{{{2
{
  g_plugins.push(plugin);
}








// Prafbe  {{{1
function calculate_spam_probability(tweet)  //{{{2
{
  var p = tweet_db.data(tweet, 'prafbe_result');
  var c = tweet_db.data(tweet, 'prafbe_learning_count');
  if (p == null || c == null || c < g_prafbe_learning_count) {
    var tokens = prafbe.list_most_interesting_tokens(
      g_preferences.prafbe_right_dict(),
      g_preferences.prafbe_wrong_dict(),
      tokenize_tweet(tweet),
      15,
      true
    );
    var ps = tokens.map(function (x) {return x[2];});
    p = prafbe.calculate_spam_probability(ps);
  }

  tweet_db.data(tweet, 'prafbe_learning_count', g_prafbe_learning_count);
  tweet_db.data(tweet, 'prafbe_result', p);

  return p;
}




function is_spam_tweet_p(tweet)  //{{{2
{
  return (g_preferences.spam_probability_threshold()
          <= calculate_spam_probability(tweet));
}




function save_prafbe_learning_result()  //{{{2
{
  var MAXIMUM_BYTES = g_preferences.maximum_size_of_prafbe_dict_kib() * 1024;
  var kibibytes = function (bytes) {
    return Math.round(bytes / 1024);
  };
  var save = function (p) {
    var original_size = p.encode(p()).length;
    var l = original_size;
    while (MAXIMUM_BYTES < l) {
      prafbe.compact(p());
      l = p.encode(p()).length;
    }
    p.save();

    if (l != original_size) {
      log_notice(
        p.id,
        [
          'Compacted:',
          kibibytes(original_size),
          'KiB =>',
          kibibytes(l),
          'KiB'
        ].join(' ')
      );
    }
  };

  save(g_preferences.prafbe_right_dict);
  save(g_preferences.prafbe_wrong_dict);
}




function serialize_prafbe_dict_into_json(dict)  //{{{2
{
  // $.toJSON is too slow for a big prafbe dict though $.toJSON uses
  // browser-native JSON serializer/parser if it's available.  So that it's
  // necessary to implement custom JSON serializer for a big prafbe dict to
  // improve performance.
  //
  // For example, suppose d to be a big prafbe dict where $.toJSON(d).length
  // is roughly equal to 350 KiB.  $.toJSON(d) takes about 3000 ms while
  // serialize_prafbe_dict_into_json(d) takes less than 90 ms on Safari 5.

  var xs = [];
  xs.push('{');
  for (var key in dict)
    xs.push('"', key, '":', dict[key], ',');
  if (xs[xs.length - 1] == ',')
    xs.pop();  // Remove the last extra ','.
  xs.push('}');
  return xs.join('');
}




function tokenize_object(object)  //{{{2
{
  var result = [];

  for (var key in object) {
    var value = object[key];
    var tokens;
    if (typeof value == 'string') {
      tokens = prafbe.tokenize(value);
    } else if (typeof value == 'object') {
      tokens = tokenize_object(value);
    } else {
      tokens = [];
    }

    result.push.apply(
      result,
      tokens.map(function (x) {
        return key + '*' + x;
      })
    );
  }

  return result;
}




function tokenize_tweet(tweet)  //{{{2
{
  var tokens = tweet_db.data(tweet, 'prafbe_tokens');
  if (tokens == null) {
    tokens = tokenize_object(tweet);
    tweet_db.data(tweet, 'prafbe_tokens', tokens);
  }
  return tokens;
}








// Preference  {{{1
// FIXME: Warn about some preferences require to reload fnfnen to take effect.
function Preference(id, default_value, opt_kw)  //{{{2
{
  var kw = opt_kw || {};

  var _ = function (opt_value) {
    if (opt_value === undefined) {
      return _.current_value;
    } else {
      var old_value = _.current_value;
      _.current_value = opt_value;
      _.save();
      _.on_application();
      return old_value;
    }
  };

  _.applying_priority = kw.applying_priority || DEFAULT_APPLYING_PRIORITY;
  _.columns = kw.columns || 80;
  _.custom_encoder = kw.custom_encoder || $.toJSON;
  _.default_value = default_value;
  _.form_type = kw.form_type || 'text';
  _.help_text = kw.help_text || null;
  _.id = id;
  _.is_advanced_p = (kw.is_advanced_p != null ? kw.is_advanced_p : false);
  _.maximum_value = kw.maximum_value || Number.MAX_VALUE;
  _.minimum_value = kw.minimum_value || Number.MIN_VALUE;
  _.on_application = kw.on_application || nop;
  _.read_only_p = kw.read_only_p || false;  // User cannot modify value.
  _.rows = kw.rows || 25;
  _.value_type = typeof(default_value);
  _.view_only_p = kw.view_only_p || false;  // Value will never be saved.

  _.apply = function (via_external_configuration_p) {
    var old_value = _.current_value;
    _.current_value = _.get_form();
    if (_.should_save_p(_.current_value, old_value))
      _.save();
    if (via_external_configuration_p) {
      // Leave form content as-is.
      // But use external configuration if it is available.
      var value = g_external_configuration[_.id];
      if (value != undefined)
        _.current_value = value;  // FIXME: Do validation like get_form().
    }
    _.on_application(via_external_configuration_p);
  };

  _.decode = function (value) {
    if (value != null) {
      return (_.value_type == 'string'
              ? value
              : $.evalJSON(value));
    } else {
      return null;
    }
  };

  _.encode = function (value) {
    return (_.value_type == 'string'
            ? value
            : _.custom_encoder(value));
  };

  _.get_form = function () {
    var v = _.decode(_.node().val());
    if (_.value_type == 'number') {
      if (isNaN(v))
        v = _.current_value;
      if (v < _.minimum_value)
        v = _.minimum_value;
      if (_.maximum_value < v)
        v = _.maximum_value;
    }
    return v;
  };

  _.initialize_form = function () {
    var node_reset_button = create_element('input');
    node_reset_button.attr('type', 'button');
    node_reset_button.attr('value', 'Reset');
    node_reset_button.click(function () {
      // There is more simple way to reset value: _(_.default_value).  But it
      // automatically saves and applies new value.  The reset button is used
      // when user edits preferences.  So that saving and applying should be
      // executed via the "Apply" button.
      _.current_value = _.default_value;
      _.set_form(_.encode(_.current_value));
    });

    var node_help_button = create_element('input');
    node_help_button.attr('type', 'button');
    node_help_button.val('?');
    node_help_button.click(function () {
      alert(_.help_text);
    });

    var node_dt = create_element('dt');
    node_dt.text(englishize(_.id)
                 + (_.read_only_p ? ' (read only)' : ''));
    node_dt.append(' ');
    node_dt.append(node_reset_button);
    if (_.help_text)
      node_dt.append(node_help_button);

    var node_input;
    if (_.form_type == 'textarea') {
      node_input = create_element('textarea');
      node_input.attr('cols', _.columns);
      node_input.attr('rows', _.rows);
    } else {
      node_input = create_element('input');
      node_input.attr('type', _.form_type);
    }
    node_input.attr('name', _.id);
    node_input.val(_.encode(_.current_value));
    if (_.read_only_p)
      node_input.attr('readonly', 'readonly');

    var node_dd = create_element('dd');
    node_dd.append(node_input);

    if (_.is_advanced_p) {
      $('#form_preferences #advanced_preferences_content').
        append(node_dt).
        append(node_dd);
    } else {
      $('#form_preferences #advanced_preferences_header').
        before(node_dt).
        before(node_dd);
    }
  }

  _.node = function () {
    return $(':input[name="' + _.id + '"]');
  };

  _.save = function () {
    var encoded_value = _.encode(_.current_value);
    if (!(_.view_only_p))
      $.storage(_.id, encoded_value);
    _.set_form(encoded_value);
  };

  _.set_form = function (encoded_value) {
    _.node().val(encoded_value);
  };

  _.should_save_p = function (l, r) {
    if (_.value_type == 'object') {
      if (_.read_only_p) {
        // In this case, this preference will never be modified by user.
        return false;
      } else {
        return true;
      }
    } else {
      return l != r;
    }
  };

  _.current_value = _.decode($.storage(id)) || default_value;

  return _;
}




function PreferenceForm()  //{{{2
{
  // Properties
  this.preference_items = {};  // {id: Preference, ...}

  // Methods
  this.apply = function (opt_mode) {
    var via_external_configuration_p = (opt_mode == 'initialization'
                                        ? false
                                        : opt_mode);

    var priorities = [];  // [[applying_priority, id], ...]
    for (var id in this.preference_items)
      priorities.push([this.preference_items[id].applying_priority, id]);
    priorities.sort();

    for (var _ in priorities) {
      this.preference_items[priorities[_][1]].apply(
        via_external_configuration_p
      );
    }

    // Notify to user.
    var actually_applied_p = (
      this.preference_items.external_configuration_uri() == ''
      || via_external_configuration_p
    );
    if (actually_applied_p && opt_mode != 'initialization')
      log_notice('Preferences', 'Saved');
  };

  this.register = function (id, default_value, options) {
    var p = new Preference(id, default_value, options);
    this.preference_items[id] = p;
    this[id] = p;  // For ease of access.
    p.initialize_form();
  };

  // Initialization
  var _this = this;
  $('#form_preferences').submit(function (event) {
    _this.apply();
    return false;
  });
}








// Tweet Database  {{{1
function TweetDatabase()  //{{{2
{
  this._db = {};  // tweet_id: tweet
  this._data_db = {};  // tweet_id: {arbitrary_key: arbitrary_value}

  this.add = function (new_tweets) {
    for (i in new_tweets) {
      var tweet = new_tweets[i];
      if (!this.has_p(tweet)) {
        this._db[tweet.id_str] = tweet;

        // Learn new tweets automatically.
        //
        // To simplify the code, old tweets are treated as learned ones even
        // if they aren't actually learned.  For example, show_conversation()
        // may fetch tweets which are not learned yet.  But it's rare to occur
        // and such old tweets should be filtered well.
        if (compare_tweet_ids(g_preferences.last_learned_tweet_id(),
                              tweet.id_str)
            < 0)
        {
          learn_tweet(tweet.id_str, !is_spam_tweet_p(tweet), false);
        }
      }
    }

    var tweet_ids = new_tweets.map(function (t) {return t.id_str;});
    tweet_ids.push(g_preferences.last_learned_tweet_id());
    g_preferences.last_learned_tweet_id(
      tweet_ids.reduce(function (a, b) {
        return (0 <= compare_tweet_ids(a, b)
                ? a
                : b);
      })
    );

    save_prafbe_learning_result();
    return;
  };

  this.data = function (_, key, opt_value) {
    var id_str = typeof(_) == 'string' ? _ : _.id_str;
    var d = this._data_db[id_str];
    if (d == null) {
      d = {};
      this._data_db[id_str] = d;
    }

    if (opt_value == null) {
      return d[key];
    } else {
      var previous_value = d[key];
      d[key] = opt_value;
      return previous_value;
    }
  };

  this.get = function (id_str) {
    return this._db[id_str];
  };

  this.has_p = function (_) {
    var id_str = typeof(_) == 'string' ? _ : _.id_str;
    return this._db[id_str] != null;
  };

  this.ids = function () {
    return this._db;
  };
}




var tweet_db = new TweetDatabase();  //{{{2








// Twitter API  {{{1
// Shared variables  {{{2

var OAUTHED_API_DEFAULT_PARAMETERS = {
  suppress_response_codes: true,
};

var g_oauthed_api_request_queue = [];




var callback_for_jsonp_request = 'Placeholder for a callback closure';  //{{{2




function finish_processing_a_request()  //{{{2
{
  g_oauthed_api_request_queue.shift();  // Discard the finished request.
  update_requesting_status();
  process_queued_api_request_with_oauth();
  return;
};




function request_twitter_api_with_oauth(request)  //{{{2
{
  var normalized_method = request.method.toUpperCase();

  g_oauthed_api_request_queue.push({
    callback: request.callback || nop,
    from: request.from || '?',
    method: normalized_method,  // required
    parameters: $.extend({},  // To avoid destructive side effect.
                         OAUTHED_API_DEFAULT_PARAMETERS,
                         request.parameters,
                         (normalized_method == 'GET'
                          ? {callback: 'callback_for_jsonp_request'}
                          : {})),
    uri: request.uri,  // required
  });
  update_requesting_status();

  if (g_oauthed_api_request_queue.length <= 1)
    process_queued_api_request_with_oauth();
  return;
}




function process_queued_api_request_with_oauth()  //{{{2
{
  if (g_oauthed_api_request_queue.length < 1)
    return;

  var request = g_oauthed_api_request_queue[0];

  // Set up parameters to send.
  $('#request_form').attr('action', request.uri);
  $('#request_form').attr('method', request.method);
  $('#request_form #additional_arguments').empty();
  for (var name in request.parameters) {
    var e = create_element('input');
    e.attr('id', name);
    e.attr('name', name);
    e.attr('type', 'hidden');
    e.val(request.parameters[name]);
    $('#request_form #additional_arguments').append(e);
  }
  consumer.sign_form($('#request_form').get(0), $('#secret_form').get(0));

  // Send a request.
  //
  // NB: Assumption: Requesting format is always JSON.
  // NB: Assumption: Twitter API supports JSONP.
  //
  // NB: There is an alternative way -- jQuery.ajax().  But jQuery.ajax() uses
  // XmlHttpRequest for many cases and XmlHttpRequest is usually restricted
  // with same origin poricy.

  // error_timer doubles the parts of a timer id and a lock.
  // Though the way to lock is not perfect yet.
  var error_timer = null;
  error_timer = setTimeout(
    function () {
      if (error_timer) {
        error_timer = null;  // Prevents "loaded" handler.

        var response = {error: 'Request timeout'};
          // Request timeout often occurs.  It's not worth to mention to user.
          // Treat it as an informative message instead of an error.
        log_notice(request.from, response.error);
        request.callback(response);

        finish_processing_a_request();
      }
    },
    g_preferences.request_timeout_interval_sec() * 1000
  );

  if (request.method == 'GET') {
    callback_for_jsonp_request = function (response) {
      if (error_timer) {
        clearTimeout(error_timer);  // Prevents error_timer handler.
        error_timer = null;

        if (response.error)
          log_error(request.from, response.error);
        request.callback(response);
        setTimeout(finish_processing_a_request, 0);
      }
    };
    var uri = request.uri + '?' + $('#request_form').serialize();
    load_cross_domain_script(uri);
    // finish_processing_a_request() will be called by
    // callback_for_jsonp_request() if the request is completed.
  } else {
    var loaded_handler = function () {
      if (error_timer) {
        clearTimeout(error_timer);  // Prevents error_timer handler.
        error_timer = null;

        var response;
        try {
          // Normally it's not allowed to read a frame content from a script
          // which comes from different domain because of same origin policy.
          // A script which comes from file:// is not restricted by same
          // origin policy, so that the script can read any frame content.
          // But it seems to depend on the implementation of each web browser.
          response = eval('(' + $('#request_iframe').contents().text() + ')');
        } catch (e) {
          response = null;
        }
        if (response && response.error)
          log_error(request.from, response.error);
        request.callback(response);

        setTimeout(finish_processing_a_request, 0);
      }
    };

    $('#request_iframe').one('load', loaded_handler);
    $('#request_form').submit();
  }

  return;
}




function update_requesting_status()  //{{{2
{
  if (1 <= g_oauthed_api_request_queue.length) {
    $('#requesting_status').text(
      'Now requesting: '
      + (g_oauthed_api_request_queue.map(function (request) {
           return api_name_from_uri(request.uri);
         })
         .join(', '))
    ).slideDown();
  } else {
    $('#requesting_status').text('(idle)').slideUp();
  }
}








// Misc.  {{{1
function api_name_from_uri(api_uri)  //{{{2
{
  return api_uri.replace(TWITTER_API_URI, '').replace(/\..*/, '');
}




function create_element(element_name)  //{{{2
{
  return $(document.createElement(element_name));
}




function compare_tweet_ids(l, r)  //{{{2
{
  // Where l and r is tweet.id_str.
  return (parseFloat(l) - parseFloat(r)) || l.localeCompare(r);
}




function englishize(id)  //{{{2
{
  var words = id.split('_');

  if (1 <= words.length) {
    for (var _ in words)
      words[_] = /^uri$/i.test(words[_]) ? words[_].toUpperCase() : words[_];

    words[0] = words[0].substring(0, 1).toUpperCase() + words[0].substring(1);

    var i = words.length - 1;
    if (words[i] == 'sec')
      words[i] = '(sec.)';
    if (words[i] == 'kib')
      words[i] = '(KiB)';
  }

  return words.join(' ');
}




function expand_template(template, values)  //{{{2
{
  return template.replace(
    /{([A-Za-z0-9_]+)}/g,
    function (matched_text, p1) {
      return values[p1];
    }
  );
}




function favorite_symbol(favorite_p)  //{{{2
{
  return (favorite_p
          ? '\u2605'  // black (filled) star
          : '\u2606'  // white (empty) star
          );
}




function format_probability(p)  //{{{2
{
  var v = Math.min(Math.round(p * 10000) / 10000, 0.9999);
  return (v.toString() + '0000').replace(/^\d+\.?(\d\d\d\d).*$/, '$1');
}




function html_from_jsxn(jsxn)  //{{{2
{
  // jsxn := [element, ...]
  //
  // element := [name, attribute-list?, child-of-element, ...]
  // attribute-list := ['@', attribute, ...]
  // attribute := [name, value]
  // child-of-element := element | text
  //
  // name := string
  // text := string
  // value := string

  return string_from_tree(tree_from_jsxn(jsxn));
}




function human_readable_format_from_date(date)  //{{{2
{
  return (date.getFullYear()
          + '-' + pad(date.getMonth() + 1)
          + '-' + pad(date.getDate())
          + ' ' + pad(date.getHours())
          + ':' + pad(date.getMinutes())
          + ':' + pad(date.getSeconds()));
}

function pad(n)
{
  return n < 10 ? '0' + n : n;
}




var load_cross_domain_script = (function () {  //{{{2
  var s_cached_nodes = {};

  return function (script_uri) {
    var key = script_uri.split('?')[0];
    if (s_cached_nodes[key])
      s_cached_nodes[key].remove();

    var e = create_element("script");
    e.attr('src', script_uri);
    e.attr('type', "text/javascript");

    // We should call jQuery API such as "$('body').append(e)" for readability
    // and consistency, but we can not use it here.  Because:
    //
    // - jQuery internally uses $.ajax() if a script element is given to
    //   .append().  This $.ajax() call sends a request to a URI which is
    //   different from the original URI in the script element to avoid
    //   caching by the browser.
    //
    // - Any request with OAuth must include a signature which is calculated
    //   from various information including a URI to send the request.
    //
    // As a result, "$('body').append(e)" sends a request to a different URI
    // which is invalid for OAuth -- the request will be always failed because
    // its signature is incorrect.  So that we have to use "raw" API instead.
    document.body.appendChild(e.get(0));

    s_cached_nodes[key] = e;
  };
})();




function nop()  //{{{2
{
  return;
}




function scroll(y_coordinate)  //{{{2
{
  scrollTo(0, y_coordinate);
  return;
}




function string_from_tree(tree)  //{{{2
{
  // tree := string or [tree, ...]
  if (typeof(tree) == 'string')
    return tree;
  else if (typeof(tree) == 'number')
    return tree.toString();
  else
    return tree.map(string_from_tree).join('');
}




function replace_stylesheet(id, text)  //{{{2
{
  // Not all schemas/DTDs define id attribute for style element.
  // Use jQuery.data() to identify style element for a given id.
  //
  // NB: There is another candidate that is title attribute.  But it can not
  // be used.  Because style element with title attribute causes unexpected
  // result.  For example, if there are 3 style elements which have "foo",
  // "bar" and "baz" as their title attribute values, one of them is applied
  // and the rest are ignored, at least on Safari 5.  It seems like link
  // element for alternate stylesheet, but I couldn't find this behavior is
  // described in any W3C recommendation.

  $('style').
    filter(function () {return $(this).data('id') == id;}).
    remove();

  var node_style = create_element('style');
  node_style.data('id', id);
  node_style.attr('type', 'text/css');
  node_style.text(text);
  $('head').append(node_style);
}




function to_string(value)  //{{{2
{
  if (value == null)
    return 'null';
  else if (value == undefined)
    return 'undefined';
  else
    return value.toString();
}




function tree_from_jsxn(jsxn)  //{{{2
{
  return jsxn.map(tree_from_jsxn_element);
}




function tree_from_jsxn_attribute(jsxn_attribute)  //{{{2
{
  var name = jsxn_attribute[0];
  var value = jsxn_attribute[1];  // FIXME: Escape special characters.
  return [' ', name, '=', '"', value, '"'];
}




function tree_from_jsxn_element(jsxn_element)  //{{{2
{
  if (typeof(jsxn_element) == 'string') {
    return jsxn_element;  // FIXME: Escape special characters.
  } else {
    var name = jsxn_element[0];
    var _attribute_list = jsxn_element[1];
    var has_attribute_list_p = (_attribute_list instanceof Array
                              && _attribute_list[0] == '@');
    var attribute_list = (has_attribute_list_p
                          ? _attribute_list.slice(1)  // ['@', [...], ...]
                          : []);
    var child_of_element_list = jsxn_element.slice(has_attribute_list_p
                                                   ? 2
                                                   : 1);

    if (0 < child_of_element_list.length) {
      return [
        '<', name, attribute_list.map(tree_from_jsxn_attribute), '>',
        child_of_element_list.map(tree_from_jsxn_element),
        '</', name, '>',
      ];
    } else {
      return [
        '<', name, attribute_list.map(tree_from_jsxn_attribute), '/>',
      ];
    }
  }
}








// Main  {{{1
function initialize(steps)  //{{{2
{
  var completed_p = false;
  var executed_p = function (x) {return x.executed_p;};
  var _i = 0;
  var _result_table = (create_element('table')
                       .attr('summary', 'Initialization results'));

  var _header_row = create_element('tr');
  _header_row.append(create_element('th').text('#'));
  for (var ks in steps)
    _header_row.append(create_element('th')
                       .text(ks.replace(/^initialize_/, '')));
  _result_table.append(_header_row);

  for (var ks in steps) {
    steps[ks]._requirements = steps[ks].requirements.map(function (x) {
      return steps[x];
    });
  }

  while (!completed_p) {
    _i++;
    completed_p = true;
    var _result_row = create_element('tr');
    _result_row.append(create_element('th').text(_i));

    for (var ks in steps) {
      var s = steps[ks];

      completed_p = completed_p && s.executed_p;
      var requirements_ready_p = s._requirements.every(executed_p);
      var this_completed_p = executed_p(s);
      if (requirements_ready_p && !this_completed_p) {
        s.procedure();
        s.executed_p = true;
      }

      _result_row.append(create_element('td').text(
        (requirements_ready_p ? 'R' : '_') + (this_completed_p ? 'S' : '_')
      ));
    }

    _result_table.append(_result_row);
  }

  $('body').append(_result_table.hide());
  return;
}




$(document).ready(function () {  //{{{2
  var executed_in_valid_application_page_p = /fnfnen/.test($('title').text());
  if (!executed_in_valid_application_page_p)
    return;  // Skip bootstrap; it seems to be executed as a part of tests.

  var initialization_steps = {
    initialize_advanced_preferences: {  //{{{
      requirements: [],
      procedure: function () {
        $('#advanced_preferences_content').empty();
        $('#advanced_preferences_content').hide();
        $('#button_to_toggle_advanced_preferences').click(function () {
          $('#advanced_preferences_content').slideToggle();
        });
      },
    },  //}}}
    initialize_columns: {  //{{{
      requirements: [],
      procedure: function () {
        $('.predefined.column').each(function () {
          var node_column = $(this);
          var title = node_column.attr('title');
          node_column.data('title', title);
          node_column.removeAttr('title');
        });

        $('#column_selectors').empty();
        $('.predefined.column').each(function () {
          append_column($(this), 'predefined');
        });
      },
    },  //}}}
    initialize_misc: {  //{{{
      requirements: [],
      procedure: function () {
        $('#tweet_box').val('');
        $('#balloon_container').empty();
        $('#column_error_log').empty();
        $('#requesting_status').hide();
      },
    },  //}}}
    initialize_oauth: {  //{{{
      requirements: [],
      procedure: function () {
        var oauth_consumer_key = $.storage('form_oauth_consumer_key_value');
        var oauth_consumer_secret = $.storage('form_consumer_secret_value');
        var oauth_token = $.storage('access_token');
        var oauth_token_secret = $.storage('access_secret');
        if (oauth_consumer_key == null
            || oauth_consumer_secret == null
            || oauth_token == null
            || oauth_token_secret == null)
        {
          location.href = 'oauth/phase1.html';
        }
        $('#request_form *[name="oauth_token"]').val(oauth_token);
        $('#request_form *[name="oauth_consumer_key"]').val(oauth_consumer_key);
        $('#secret_form *[name="consumer_secret"]').val(oauth_consumer_secret);
        $('#secret_form *[name="token_secret"]').val(oauth_token_secret);
      },
    },  //}}}
    initialize_parameters: {  //{{{
      requirements: [],
      procedure: function () {
        var ss = window.location.href.split('?', 2);
        var parameters = (ss[1] ? ss[1] : '').split('&');
        parameters = ((1 <= parameters.length) && (parameters[0] != '')
                      ? parameters
                      : []);

        for (var i in parameters) {
          var key_value = parameters[i].split('=', 2);
          var key = decodeURIComponent(key_value[0]);
          var value = eval(decodeURIComponent(key_value[1]));  // FIXME: eval?

          g_parameters[key] = value;
        }
        return;
      },
    },  //}}}
    initialize_preferences: {  //{{{
      requirements: ['initialize_columns', 'initialize_misc'],
      procedure: function () {
        g_preferences = new PreferenceForm();

        g_preferences.register('custom_stylesheet',  //{{{
          '/* .user_icon {display: inline;} ... */',
          {
            form_type: 'textarea',
            on_application: function () {
              replace_stylesheet('fnfnen_custom_stylesheet', this());
            },
            rows: 10
          }
        );  //}}}
        g_preferences.register('tweet_html_template',  //{{{
          DEFAULT_TWEET_HTML_TEMPLATE,
          {
            form_type: 'textarea',
            rows: 3,
          }
        );  //}}}
        g_preferences.register('censorship_law',  //{{{
          [
            '# Lines start with "#" are comments, so that they are ignored.',
            '# Blank lines are also ignored.',
            '#',
            '# Format: "{classes}:{property}:{pattern}"',
            '#',
            '#  {classes}',
            '#    Names to be added value of "class" attribute of a tweet.',
            '#',
            '#  {property}',
            '#    The name of property to be censored.',
            '#    Examples: "text", "source", "user.screen_name".',
            '#',
            '#  {pattern}',
            '#    Regular expression to test whether a tweet is censored or not.',
            '#    A tweet is censored if {pattern} is matched to the value of',
            '#    {property}.  If {pattern} starts with "?", pattern matching is',
            '#    case-insensitive.',
            '#',
            '# Examples:',
            '#',
            '#   censored retweet:text:\\bRT @',
            '#   censored user:user.screen_name:?_bot$',
            '#   interested keyword:text:?\\bgit\\b',
            '#',
            '# Note that you also have to customize stylesheet to use censored',
            '# results.  For example, add the following:',
            '#',
            '#   .censored.tweet {text-decoration: line-through;}',
            '#   .interested.tweet {font-weight: bolder;}',
            ''
          ].join('\n'),
          {
            form_type: 'textarea',
            on_application: function () {
              set_up_censorship_law(this());
            },
            rows: 10
          }
        );  //}}}
        g_preferences.register('censored_columns',  //{{{
          [
            '# Lines start with "#" are comments, so that they are ignored.',
            '# Blank lines are also ignored.',
            '#',
            '# Format: "{column_name}:{classes}"',
            '#',
            '#  {column_name}',
            '#    The name of column to show censored tweets.',
            '#',
            '#  {classes}',
            '#    Space-separated names of classes.  If a tweet has all classes',
            '#    as specified by {classes}, the tweet is shown in the column.',
            '#',
            '# Examples:',
            '#',
            '#   retweets:retweet',
            '#   git:git',
            ''
          ].join('\n'),
          {
            applying_priority: (
              g_preferences.censorship_law.applying_priority + 1
            ),
            form_type: 'textarea',
            on_application: function () {
              set_up_censored_columns(this());
            },
            rows: 10
          }
        );  //}}}
        g_preferences.register('plugins',  //{{{
          '',
          {
            form_type: 'textarea',
            on_application: function () {
              var plugin_uris = this().split('\n');
              load_plugins(plugin_uris);
            },
            rows: 10
          }
        );  //}}}
        g_preferences.register('update_interval_sec',  //{{{
          DEFAULT_UPDATE_INTERVAL_SEC,
          {
            minimum_value: MINIMUM_UPDATE_INTERVAL_SEC,
            on_application: function () {
              reset_automatic_update_timer(this());
            }
          }
        );  //}}}
        g_preferences.register('maximum_number_of_tweets_to_fetch',  //{{{
          200,
          {
            maximum_value: 200,
            minimum_value: 20,
          }
        );  //}}}

        g_preferences.register('request_timeout_interval_sec',  //{{{
          15,
          {
            is_advanced_p: true,
          }
        );  //}}}
        g_preferences.register('spam_probability_threshold',  //{{{
          0.90,
          {
            is_advanced_p: true,
          }
        );  //}}}
        g_preferences.register('external_configuration_uri',  //{{{
          '',
          {
            // Should apply at the last to override already applied values.
            applying_priority: LAST_APPLYING_PRIORITY,
            is_advanced_p: true,
            on_application: function (via_external_configuration_p) {
              if (!via_external_configuration_p) {
                if (this()) {
                  // Loaded script should call fnfnen_external_configuration().
                  load_cross_domain_script(this());
                }
              }
            }
          }
        );  //}}}
        g_preferences.register('last_learned_tweet_id',  //{{{
          '-13',  // Dummy tweet id which is less than any tweet id.
          {
            is_advanced_p: true,
            read_only_p: true,
          }
        );  //}}}
        g_preferences.register('prafbe_right_dict',  //{{{
          {},
          {
            custom_encoder: serialize_prafbe_dict_into_json,
            form_type: 'textarea',
            is_advanced_p: true,
            read_only_p: true,
            rows: 3,
          }
        );  //}}}
        g_preferences.register('prafbe_wrong_dict',  //{{{
          {},
          {
            custom_encoder: serialize_prafbe_dict_into_json,
            form_type: 'textarea',
            is_advanced_p: true,
            read_only_p: true,
            rows: 3,
          }
        );  //}}}
        g_preferences.register('maximum_size_of_prafbe_dict_kib',  //{{{
          1024,
          {
            is_advanced_p: true,
          }
        );  //}}}

        g_preferences.apply('initialization');
      },
    },  //}}}
    initialize_to_call_twitter_api: {  //{{{
      requirements: [],
      procedure: function () {
        // Add a secret iframe to hide interaction with Twitter.
        var node_iframe = create_element('iframe');
        node_iframe.attr('id', 'request_iframe');
        node_iframe.attr('name', 'xpost');
        node_iframe.attr('src', 'about:blank');
        node_iframe.css('display', 'none');
        $('body').append(node_iframe);
        $('#request_form').attr('target', 'xpost');
      },
    },  //}}}
    initialize_to_post: {  //{{{
      requirements: [],
      procedure: function () {
        $('#post_form').submit(function () {before_post(); return false;});
        $('#tweet_box').keyup(count_tweet_content);
      },
    },  //}}}
  };

  initialize(initialization_steps);

  log_notice('System', 'Initialization has been completed');

  raise_event('ready');

  if (g_parameters['automatic_update'])
    update();
});








// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
