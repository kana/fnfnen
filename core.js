// fnfnen, a web-based twitter client
// Version: 0.0.0
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
// FIXME: Add raise_event() for several places.
// FIXME: Multiple columns.
// FIXME: Multiple tabpages.
// FIXME: Warn about some preferences require to reload fnfnen to take effect.
//
// - A tabpage contains 1 or more columns.
// - A column is to show tweets or other information.
// - Currently, a tabpage contains only 1 column.  There is no distinction
//   between column and tabpage.  Use term "column" at this moment.
//
// - Variables suffixed with "_ms" and "_MS" contain an integer as millisecond.
// - Variables suffixed with "_sec" and "_SEC" contain an integer as second.
// - Suffix "_n2o"/"_o2n" means an array of values which are sorted from newest
//   to oldest or from oldest to newest.








// Variables  {{{1
// Constants  {{{2

var DEFAULT_APPLYING_PRIORITY = 0;
var DEFAULT_UPDATE_INTERVAL_SEC = 5 * 60;
var DUMMY_SINCE_ID = 1;
var GLOBAL_VARIABLES = window;
var HOME_COLUMN_NAME = 'Home';
var MAX_COUNT_HOME = 200;
var MAX_COUNT_MENTIONS = 200;
var MAX_TWEET_CONTENT = 140;
var MINIMUM_UPDATE_INTERVAL_SEC = 1 * 60;
var TWITTER_API_URI = 'http://api.twitter.com/1/';
var TWITTER_UI_URI = 'http://twitter.com/';




// Global  {{{2

var g_external_configuration = {/* preference_name: value */};
var g_parameters = {'automatic_update': true};
var g_plugins = [/* plugin = {event_name: function, ...}, ... */];
var g_preferences = {/* name: preference, ... */};
var g_since_id_home = DUMMY_SINCE_ID;  // BUGS: Tweet #1 cannot be shown.
var g_since_id_mentions = DUMMY_SINCE_ID;  // BUGS: Tweet #1 cannot be shown.
var g_tweet_id_to_reply = null;
var g_update_timer = null;
var g_user = null;








// Core  {{{1
function after_post(d)  //{{{2
{
  // On success: d = {text: '...', ...};
  // On failure: d = {error: '...', ...};

  if (!(d.error))
    update_with_given_tweet(d);
  else
    log_error('Post', d.error);

  return;
}




function apply_preferences(via_external_configuration_p)  //{{{2
{
  var priorities = [];  // [[applying_priority, name], ...]
  for (var name in g_preferences)
    priorities.push([g_preferences[name].applying_priority, name]);
  priorities.sort();

  for (var _ in priorities)
    g_preferences[priorities[_][1]].apply(via_external_configuration_p);

  // Notify to user.
  var actually_applied_p = (
    g_preferences.external_configuration_uri.current_value == ''
    || via_external_configuration_p
  );
  if (actually_applied_p)
    log_notice(arguments.callee.name, 'Preferences have been saved.');

  return;
}




function authenticate()  //{{{2
{
  request_twitter_api_with_oauth({
    method: 'get',
    parameters: {
      callback: callback_authenticate.name,
    },
    uri: TWITTER_API_URI + 'account/verify_credentials.json',
  });
  return;
}

function callback_authenticate(d)
{
  if (d.error) {
    log_error(arguments.callee.name, d.error);
    return;
  }

  g_user = d;

  update();
  return;
}




function before_post()  //{{{2
{
  var text = $('#tweet_box').val();

  if (text == '') {
    // Update timeline manually.
    update();
    return;
  }

  if (MAX_TWEET_CONTENT < text.length) {
    // Warn about too long tweet.
    for (var i = 0; i < 3; i++) {
      $('#tweet_content_counter').fadeOut('fast');
      $('#tweet_content_counter').fadeIn('fast');
    }

    // FIXME: Send a long tweet if user tries posting it twice.

    // And disable posting.
    return;
  }

  // Post a tweet.
  parameters = {};
  parameters.status = text;
  if (g_tweet_id_to_reply)
    parameters.in_reply_to_status_id = g_tweet_id_to_reply;

  request_twitter_api_with_oauth({
    callback_on_error: function () {
      after_post({error: 'Request time out.'});
    },
    callback_on_success: function () {
      after_post(eval('(' + $('#request_iframe').contents().text() + ')'));
    },
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
  apply_preferences(true);
  return;
}




function html_from_tweet(tweet)  //{{{2
{
  // FIXME: Add a button to retweet a tweet.
  // FIXME: Expand abbreviated URIs in a tweet.
  // FIXME: Make links for hashtags in a tweet.
  return (''
          // user icon
          + '<a class="user_icon"'
          + ' href="' + TWITTER_UI_URI + tweet.user.screen_name + '"'
          + '>'
          + '<img'
          + ' alt="' + '@' + tweet.user.screen_name + '"'
          + ' height="48"'
          + ' src="' + tweet.user.profile_image_url + '"'
          + ' width="48"'
          + '/>'
          + '</a>'
          // screen name
          + '<a class="screen_name"'
          + ' href="' + TWITTER_UI_URI + tweet.user.screen_name + '"'
          + '>'
          + tweet.user.screen_name
          + '</a>'
          // text
          + '<span class="text">'
          + make_links_in_text(tweet.text)
          + '</span>'
          // posted time
          + '<a class="posted_time"'
          + ' href="'
          +    TWITTER_UI_URI
          +    tweet.user.screen_name
          +    '/status/'
          +    tweet.id
          +    '"'
          + '>'
          + human_readable_format_from_date(new Date(tweet.created_at))
          + '</a>'
          // button to reply
          + '<a class="button reply"'
          + ' href="javascript:set_up_to_reply('
          +   "'" + tweet.user.screen_name + "'" + ','
          +   tweet.id
          + ')"'
          + '>'
          + '&#x21b5;'  // Carriage return symbol
          + '</a>'
          // button to show the conversation
          + (tweet.in_reply_to_status_id
             ? (''
                + '<a class="button conversation"'
                + ' href="javascript:show_conversation(' + tweet.id + ')"'
                + '>'
                + '&#x267b;'  // Black universal recycling symbol
                + '</a>')
             : '')
          // button to toggle favorite
          + '<a class="button favorite"'
          + ' href="javascript:toggle_favorite(' + tweet.id + ')">'
          + favorite_symbol(tweet.favorited)
          + '</a>'
         );
}




function make_links_in_text(text)  //{{{2
{
  // FIXME: Regular expression for URI.
  return text.replace(
    /https?:\/\/[\w!#$%&'*+,.\/:;=?@~-]+|@(\w+)/g,
    function(matched_string, screen_name){
      if (screen_name) {
        return ('<a class="screen_name"'
                + ' href="'
                + TWITTER_UI_URI
                + screen_name
                + '">'
                + matched_string
                + '</a>');
      } else {
        return ('<a class="link"'
                + ' href="'
                + matched_string
                + '">'
                + matched_string
                + '</a>');
      }
    }
  );
}




function node_from_tweet(tweet)  //{{{2
{
    var node_tweet = create_element('div');

    node_tweet.data('json', tweet);
    node_tweet.html(html_from_tweet(tweet));

    node_tweet.addClass('tweet');
    node_tweet.addClass(class_name_from_tweet_id(tweet.id));
    if (tweet_mention_p(tweet))
      node_tweet.addClass('mention');
    if (tweet_mine_p(tweet))
      node_tweet.addClass('mine');
    node_tweet.addClass(censorship_classes_from_tweet(tweet).join(' '));

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
  // FIXME: Isn't there more proper way to do it?
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

  select_column(column_name);

  node_column.empty();
  show_tweets_n2o(tweets_in_conoversation_n2o, node_column);
}


function list_tweets_in_conversation_n2o(tweet_id)
{
  var tweets_in_conoversation_n2o = [];  // newest_tweet, ..., oldest_tweet

  var id = tweet_id;
  while (id != null) {
    var tweet = tweet_db.get(id);
    if (tweet == null)  // FIXME: Fetch tweet.
      break;

    tweets_in_conoversation_n2o.push(tweet);

    id = tweet.in_reply_to_status_id;
  }

  return tweets_in_conoversation_n2o;
}




function show_tweets_n2o(tweets_n2o, node_column)  //{{{2
{
  // tweets_n2o = [{newest-tweet}, ..., {oldest-tweet}]

  raise_event('new_tweets', {tweets: tweets_n2o});

  var node_tweet_hub = node_from_tweets_n2o(tweets_n2o);
  node_column.prepend(node_tweet_hub);

  // Scroll to the head of the latest tweet hub.
  // FIXME: Customize behavior on this autoscroll.
  scroll(0);

  return tweets_n2o.length;
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
    callback_on_error: stop_fading,
    callback_on_success: update_views,
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
  return tweet.user.id == g_user.id;
}




// Update  {{{2
// Variables  {{{3

var QUEUE_ID_HOME = 'home';
var QUEUE_ID_MENTIONS = 'mentions';
var VALID_QUEUE_IDS = [QUEUE_ID_HOME, QUEUE_ID_MENTIONS];

var g_tweet_queues = {/* queue_id: tweets_n2o = [newest, ..., oldest] */};


function callback_update(d, name_since_id, queue_id)  //{{{3
{
  // d = [{newest-tweet}, ..., {oldest-tweet}]
  $('#last_updated_time').text('Last updated: ' + new Date().toString());

  var new_tweets_n2o = [];
  if (d.error == null) {
    new_tweets_n2o = filter(d,function(tweet){return !tweet_db.has_p(tweet);});

    if (0 < new_tweets_n2o.length) {
      var NEWEST_TWEET_INDEX = 0;
      GLOBAL_VARIABLES[name_since_id] = Math.max(
        GLOBAL_VARIABLES[name_since_id],
        new_tweets_n2o[NEWEST_TWEET_INDEX].id
      );
    }
    tweet_db.add(new_tweets_n2o);
  } else {
    log_error(arguments.callee.name, d.error);
    return;
  }

  queue_tweets_n2o(new_tweets_n2o, queue_id);
  return;
}


function callback_update_home(d)  //{{{3
{
  callback_update(d, 'g_since_id_home', QUEUE_ID_HOME);
  return;
}


function callback_update_mentions(d)  //{{{3
{
  callback_update(d, 'g_since_id_mentions', QUEUE_ID_MENTIONS);
  return;
}


function merge_tweets_n2o(tweet_sets)  //{{{3
{
  // Assumption - There is no duplicate in tweet_sets.
  var merged_tweets_n2o = [];  // newest, ..., oldest

  for (var i in tweet_sets)
    merged_tweets_n2o.push.apply(merged_tweets_n2o, tweet_sets[i]);

  merged_tweets_n2o.sort(function(l,r){
    if (l.id < r.id)
      return -1;
    else if (l.id == r.id)
      return 0;
    else
      return 1;
  });
  merged_tweets_n2o.reverse();

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
    update_censored_columns(merge_tweets_n2o(g_tweet_queues));

    g_tweet_queues = {};
  }
}


function update()  //{{{3
{
  if (!g_user)
    return authenticate();

  request_twitter_api_with_oauth({
    method: 'get',
    parameters: {
      callback: callback_update_home.name,
      count: MAX_COUNT_HOME,
      since_id: g_since_id_home,
    },
    uri: TWITTER_API_URI + 'statuses/home_timeline.json',
  });
  request_twitter_api_with_oauth({
    method: 'get',
    parameters: {
      callback: callback_update_mentions.name,
      count: MAX_COUNT_MENTIONS,
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
  var classes = [];

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

  return classes;
}




function fill_column_with_censored_tweets(node_column, required_classes) //{{{2
{
  var ids = [];
  for (var id in tweet_db.db)
    ids.push(id);
  ids.sort();  // BUGS: This doesn't work for ids with different length.
  ids.reverse();
  var ids_n2o = ids;
  var tweets_n2o = map(ids_n2o, function(_){return tweet_db.get(_);});

  var matches_p = function(t){return censored_tweet_p(t, required_classes);}
  var censored_tweets_n2o = filter(tweets_n2o, matches_p);

  if (0 < censored_tweets_n2o.length)
    node_column.append(node_from_tweets_n2o(censored_tweets_n2o));

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
      log_error(arguments.callee.name, 'Error in rule: "' + line + '"');
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
      log_error(arguments.callee.name, 'Error in pattern: "' + line + '"');
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
  for (var column_name in g_censored_columns) {
    var node_column = column(column_name);
    var required_classes = g_censored_columns[column_name];
    var matches_p = function(t){return censored_tweet_p(t, required_classes);}

    var censored_tweets_n2o = filter(tweets_n2o, matches_p);

    node_column.prepend(node_from_tweets_n2o(censored_tweets_n2o));
  }

  return;
}








// Columns  {{{1
function append_column(node_column, position)  //{{{2
{
  position = position || 'last';

  if (position != 'predefined')
    $('#columns').append(node_column);

  var column_name = node_column.data('title');

  var node_selector = create_element('span');
  node_selector.attr('class', 'column_selector');
  node_selector.data('title', column_name);
  node_selector.click(function(){
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
    node_button.click(function(){
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




function column(column_name)  //{{{2
{
  if (column_name) {
    return $('.column').filter(function(){
      return $(this).data('title') == column_name;
    });
  } else {
    return $('.column');
  }
}




function column_selector(column_name)  //{{{2
{
  if (column_name) {
    return $('.column_selector').filter(function(){
      return $(this).data('title') == column_name;
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

  if (node_column.length != 1)
    return;  // FIXME: Unexpected situation - raise error.

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
function log(type, where, message)  //{{{2
{
  var node_log = create_element('div');
  node_log.addClass('log');
  node_log.addClass(type);

  var node_when = create_element('span');
  node_when.addClass('when');
  node_when.text(human_readable_format_from_date(new Date()));

  var node_type = create_element('span');
  node_type.addClass('type');
  node_type.text(type.charAt(0).toUpperCase() + type.substring(1));

  var node_where = create_element('span');
  node_where.addClass('where');
  node_where.text(where);

  var node_message = create_element('span');
  node_message.addClass('message');
  node_message.text(message);

  node_log.append(node_when);
  node_log.append(node_type);
  node_log.append(node_where);
  node_log.append(node_message);
  $('#column_error_log').prepend(node_log);

  show_balloon(message);
}




function log_error(where, message)  //{{{2
{
  log('error', where, message);

  column_selector('Error Log').not('.active').addClass('unread');
}




function log_notice(where, message)  //{{{2
{
  log('notice', where, message);
}




function show_balloon(text)  //{{{2
{
  var node_balloon = create_element('div');
  node_balloon.addClass('balloon');
  node_balloon.text(text);
  $('#balloon_container').append(node_balloon);
  node_balloon.fadeOut(10 * 1000, function(){$(this).remove();});
  return;
}








// Plugins  {{{1
// FIXME: Be reloadable.
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








// Preference  {{{1
function Preference(name, default_value, _kw)  //{{{2
{
  var kw = _kw || {};

  this.applying_priority = kw.applying_priority || DEFAULT_APPLYING_PRIORITY;
  this.columns = kw.columns || 80;
  this.current_value = $.cookie(name) || default_value;
  this.default_value = default_value;
  this.form_type = kw.form_type || 'text';
  this.maximum_value = kw.maximum_value || Number.MAX_VALUE;
  this.minimum_value = kw.minimum_value || Number.MIN_VALUE;
  this.name = name;
  this.on_application = kw.on_application || nop;
  this.rows = kw.rows || 25;
  this.value_type = typeof(default_value);

  this.apply = function(via_external_configuration_p) {
    this.get_form();
    this.set_form();
    this.save();
    if (via_external_configuration_p) {
      // Leave form content as-is.
      // But use external configuration if it is available.
      var value = g_external_configuration[this.name];
      if (value != undefined)
        this.current_value = value;  // FIXME: Do validation like get_form().
    }
    this.on_application(via_external_configuration_p);
  };

  this.get_form = function() {
    var v = this.node().val();
    if (this.value_type == 'number') {
      if (isNaN(v))
        v = this.current_value;
      if (v < this.minimum_value)
        v = this.minimum_value;
      if (this.maximum_value < v)
        v = this.maximum_value;
    }
    this.current_value = v;
  };

  this.initialize_form = function() {
    var node_dt = create_element('dt');
    node_dt.text(englishize(this.name));

    var node_input;
    if (this.form_type == 'textarea') {
      node_input = create_element('textarea');
      node_input.attr('cols', this.columns);
      node_input.attr('rows', this.rows);
    } else {
      node_input = create_element('input');
      node_input.attr('type', this.form_type);
    }
    node_input.attr('name', this.name);
    node_input.val(this.current_value);

    var node_dd = create_element('dd');
    node_dd.append(node_input);

    $('#form_preferences > dl > dd.submit').before(node_dt);
    $('#form_preferences > dl > dd.submit').before(node_dd);

    this.apply();
  }

  this.node = function() {
    return $(':input[name="' + this.name + '"]');
  };

  this.save = function() {
    $.cookie(this.name, this.current_value);
  };

  this.set_form = function() {
    this.node().val(this.current_value);
  };

  this.initialize_form();
}








// Tweet Database  {{{1
function TweetDatabase()  //{{{2
{
  this.add = function(new_tweets){
    for (i in new_tweets) {
      var tweet = new_tweets[i];
      if (!this.has_p(tweet))
        this.db[tweet.id] = tweet;
    }
    return;
  };

  this.db = {};  // tweet_id: tweet

  this.get = function(id){
    return this.db[id];
  };

  this.has_p = function(_){
    var id = typeof(_) == 'string' ? _ : _.id;
    return this.db[id] != null;
  };
}




var tweet_db = new TweetDatabase();  //{{{2








// Twitter API  {{{1
// Shared variables  {{{2

var OAUTHED_API_DEFAULT_PARAMETERS = {
  suppress_response_codes: true,
};

var g_oauthed_api_request_queue = [];
var g_oauthed_api_request_sequence = (new Date).getTime();




function request_twitter_api_with_oauth(request)  //{{{2
{
  g_oauthed_api_request_queue.push({
    callback_on_error: request.callback_on_error || nop,
    callback_on_success: request.callback_on_success || nop,
    method: request.method.toUpperCase(),  // required
    parameters: $.extend({},  // To avoid destructive side effect.
                         OAUTHED_API_DEFAULT_PARAMETERS,
                         request.parameters),
    uri: request.uri,  // required
  });

  if (g_oauthed_api_request_queue.length <= 1)
    process_queued_api_request_with_oauth();
  return;
}




function process_queued_api_request_with_oauth()  //{{{2
{
  if (g_oauthed_api_request_queue.length < 1)
    return;

  var request = g_oauthed_api_request_queue.shift();

  // Set up parameters to send.
  //
  // FIXME: Simplify this signing procedure.
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
  // NB: There is an alternative way -- jQuery.ajax().  But jQuery.ajax() uses
  // XmlHttpRequest for many cases and XmlHttpRequest is usually restricted
  // with same origin poricy.
  if (request.parameters.callback != null && request.method == 'GET') {
    var uri = request.uri + '?' + $('#request_form').serialize();
    load_cross_domain_script(uri);
  } else {
    var settle = function(){
      process_queued_api_request_with_oauth();
      return;
    };

    // FIXME: Check the result of a request, not only request timeout.
    var error_timer = setTimeout(
      function(){
        request.callback_on_error();
        settle();
      },
      10 * 1000
    );

    $('#request_iframe').one('load', function(){
      clearTimeout(error_timer);
      request.callback_on_success();
      setTimeout(settle, 0);
    });

    $('#request_form').submit();
  }

  return;
}








// Misc.  {{{1
function create_element(element_name)  //{{{2
{
  return $(document.createElement(element_name));
}




function englishize(name)  //{{{2
{
  // 'foo_bar_baz' ==> 'Foo bar baz'
  // 'foo_bar_sec' ==> 'Foo bar (sec.)'
  // 'foo_uri' ==> 'Foo URI'

  var words = name.split('_');

  if (1 <= words.length) {
    for (var _ in words)
      words[_] = /^uri$/i.test(words[_]) ? words[_].toUpperCase() : words[_];

    words[0] = words[0].substring(0, 1).toUpperCase() + words[0].substring(1);

    var i = words.length - 1;
    if (words[i] == 'sec')
      words[i] = '(sec.)';
  }

  return words.join(' ');
}




function favorite_symbol(favorite_p)  //{{{2
{
  return (favorite_p
          ? '\u2605'  // black (filled) star
          : '\u2606'  // white (empty) star
          );
}




function filter(list, predicate)  //{{{2
{
  var filtered_list = [];

  for (var i in list) {
    var value = list[i];
    if (predicate(value))
      filtered_list.push(value);
  }

  return filtered_list;
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




var load_cross_domain_script = (function(){  //{{{2
  var s_cached_nodes = {};

  return function(script_uri){
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




function map(list, f)  //{{{2
{
  var mapped_list = [];

  for (var i in list) {
    var value = list[i];
    mapped_list.push(f(value));
  }

  return mapped_list;
}




function nop()  //{{{2
{
  return;
}




function scroll(y_coordinate)  //{{{2
{
  scrollTo(0, y_coordinate);
  return;
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




$(document).ready(function(){  //{{{2
  var initialization_steps = {
    initialize_columns: {  //{{{
      requirements: [],
      procedure: function () {
        $('.predefined.column').each(function(){
          var node_column = $(this);
          var title = node_column.attr('title');
          node_column.data('title', title);
          node_column.removeAttr('title');
        });

        $('#column_selectors').empty();
        $('.predefined.column').each(function(){
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
      },
    },  //}}}
    initialize_oauth: {  //{{{
      requirements: [],
      procedure: function () {
        var oauth_consumer_key = $.cookie('form_oauth_consumer_key_value');
        var oauth_consumer_secret = $.cookie('form_consumer_secret_value');
        var oauth_token = $.cookie('access_token');
        var oauth_token_secret = $.cookie('access_secret');
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
        $('#form_preferences').submit(function(event){
          apply_preferences();
          return false;
        });
        g_preferences.update_interval_sec = new Preference(
          'update_interval_sec',
          DEFAULT_UPDATE_INTERVAL_SEC,
          {
            minimum_value: MINIMUM_UPDATE_INTERVAL_SEC,
            on_application: function() {
              if (g_parameters['automatic_update']) {
                clearInterval(g_update_timer);
                g_update_timer = setInterval(update, this.current_value * 1000);
              }
            }
          }
        );
        g_preferences.custom_stylesheet = new Preference(
          'custom_stylesheet',
          '/* .user_icon {display: inline;} ... */',
          {
            form_type: 'textarea',
            on_application: function() {
              $('#custom_stylesheet').remove();

              var node_style = create_element('style');
              node_style.attr('type', 'text/css');
              node_style.text(this.current_value);
              $('body').append(node_style);
            },
            rows: 10
          }
        );
        g_preferences.plugins = new Preference(
          'plugins',
          '',
          {
            form_type: 'textarea',
            on_application: function() {
              var plugin_uris = this.current_value.split('\n');
              load_plugins(plugin_uris);
            },
            rows: 10
          }
        );
        g_preferences.censorship_law = new Preference(
          'censorship_law',
          (''
           + '# Lines start with "#" are comments, so that they are ignored.\n'
           + '# Blank lines are also ignored.\n'
           + '#\n'
           + '# Format: "{classes}:{property}:{pattern}"\n'
           + '#\n'
           + '#  {classes}\n'
           + '#    Names to be added value of "class" attribute of a tweet.\n'
           + '#\n'
           + '#  {property}\n'
           + '#    The name of property to be censored.\n'
           + '#    Examples: "text", "source", "user.screen_name".\n'
           + '#\n'
           + '#  {pattern}\n'
           + '#    Regular expression to test whether a tweet is censored or not.\n'
           + '#    A tweet is censored if {pattern} is matched to the value of\n'
           + '#    {property}.  If {pattern} starts with "?", pattern matching is\n'
           + '#    case-insensitive.\n'
           + '#\n'
           + '# Examples:\n'
           + '#\n'
           + '#   censored retweet:text:\\bRT @\n'
           + '#   censored user:user.screen_name:?_bot$\n'
           + '#   interested keyword:text:?\\bgit\\b\n'
           + '#\n'
           + '# Note that you also have to customize stylesheet to use censored\n'
           + '# results.  For example, add the following:\n'
           + '#\n'
           + '#   .censored.tweet {text-decoration: line-through;}\n'
           + '#   .interested.tweet {font-weight: bolder;}\n'
           + ''),
          {
            form_type: 'textarea',
            on_application: function() {
              set_up_censorship_law(this.current_value);
            },
            rows: 10
          }
        );
        g_preferences.censored_columns = new Preference(
          'censored_columns',
          (''
           + '# Lines start with "#" are comments, so that they are ignored.\n'
           + '# Blank lines are also ignored.\n'
           + '#\n'
           + '# Format: "{column_name}:{classes}"\n'
           + '#\n'
           + '#  {column_name}\n'
           + '#    The name of column to show censored tweets.\n'
           + '#\n'
           + '#  {classes}\n'
           + '#    Space-separated names of classes.  If a tweet has all classes\n'
           + '#    as specified by {classes}, the tweet is shown in the column.\n'
           + '#\n'
           + '# Examples:\n'
           + '#\n'
           + '#   retweets:retweet\n'
           + '#   git:git\n'
           + ''),
          {
            applying_priority: g_preferences.censorship_law.applying_priority + 1,
            form_type: 'textarea',
            on_application: function() {
              set_up_censored_columns(this.current_value);
            },
            rows: 10
          }
        );
        g_preferences.external_configuration_uri = new Preference(
          'external_configuration_uri',
          '',
          {
            // Should apply at the last to override already applied values.
            applying_priority: g_preferences.censored_columns + 1,
            on_application: function(via_external_configuration_p) {
              if (!via_external_configuration_p) {
                if (this.current_value) {
                  // Loaded script should call fnfnen_external_configuration().
                  load_cross_domain_script(this.current_value);
                }
              }
            }
          }
        );
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
        $('#post_form').submit(function(){before_post(); return false;});
        $('#tweet_box').keyup(count_tweet_content);
      },
    },  //}}}
  };

  initialize(initialization_steps);

  log_notice('$(document).ready', 'System has been initialized.');

  raise_event('ready');

  if (g_parameters['automatic_update'])
    update();
});








// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
