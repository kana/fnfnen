// fnfnen, a web-based twitter client
// Version: 0.0.0
// Copyright (C) 2009 kana <http://whileimautomaton.net/>
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
// FIXME: Add custom column to show censored tweets.
// FIXME: Add raise_event() for several places.
// FIXME: Implement "mentions" column.
// FIXME: Merge "mentions" into "home".
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








// Variables  {{{1
// Constants  {{{2

var DEFAULT_UPDATE_INTERVAL_SEC = 5 * 60;
var DUMMY_SINCE_ID = 1;
var MAX_COUNT = 200;
var MAX_TWEET_CONTENT = 140;
var MINIMUM_UPDATE_INTERVAL_SEC = 1 * 60;
var TWITTER_API_URI = 'http://api.twitter.com/1/';
var TWITTER_UI_URI = 'http://twitter.com/';




// Global  {{{2

var g_api_request_queue = [];
var g_parameters = {'automatic_update': true};
var g_plugins = [/* plugin = {event_name: function, ...}, ... */];
var g_pref_update_interval_sec = null;
var g_since_id = null;
var g_tweet_id_to_reply = null;
var g_update_timer = null;
var g_user = null;








// Core  {{{1
function after_post()  //{{{2
{
  $('#tweet_box').val('');

  g_tweet_id_to_reply = null;
  $('#in_reply_to_status_id').remove();

  return;
}




function apply_preferences()  //{{{2
{
  var global_variables = window;
  for (var variable_name in global_variables) {
    if (/^g_pref_.+/.test(variable_name)) {
      global_variables[variable_name].apply();
    }
  }

  // Notify to user.
  show_balloon('Preferences have been saved.');
  return false;
}




function authenticate()  //{{{2
{
  call_twitter_api(TWITTER_UI_URI,
                   'account/verify_credentials',
                   {'callback': 'callback_authenticate'});
  return;
}

function callback_authenticate(d)
{
  if (d.error) {
    show_balloon(d.error);
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
    return false;
  }

  if (g_tweet_id_to_reply) {
    var node_reply_id = create_element('input');
    node_reply_id.attr('id', 'in_reply_to_status_id');
    node_reply_id.attr('name', 'in_reply_to_status_id');
    node_reply_id.attr('type', 'hidden');
    node_reply_id.val(g_tweet_id_to_reply);
    $('#post_form').append(node_reply_id);
  }

  if (MAX_TWEET_CONTENT < text.length) {
    // Warn about too long tweet.
    for (var i = 0; i < 3; i++) {
      $('#tweet_content_counter').fadeOut('fast');
      $('#tweet_content_counter').fadeIn('fast');
    }

    // FIXME: Send a long tweet if user tries posting it twice.

    // And disable posting.
    return false;
  }

  return true;
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




function enqueue_api_request(  //{{{2
  base_uri,
  api_name,
  parameters,
  callback_on_success,
  callback_on_error
)
{
  g_api_request_queue.push({
    'base_uri': base_uri,
    'api_name': api_name,
    'parameters': parameters,
    'callback_on_success': callback_on_success,
    'callback_on_error': callback_on_error
  });

  if (g_api_request_queue.length <= 1)
    process_queued_api_request();
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




function initialize_parameters()  //{{{2
{
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




function process_queued_api_request()  //{{{2
{
  if (g_api_request_queue.length < 1)
    return;

  request_info = g_api_request_queue.shift();

  //// Construct form to post API request.
  var TARGET_NAME = 'target_' + (new Date).getTime();

  var node_post_block = create_element('div');
  node_post_block.css('display', 'none');

  var node_form = create_element('form');
  node_form.attr('action',
                 (request_info.base_uri + request_info.api_name + '.xml'));
  node_form.attr('method', 'post');
  node_form.attr('target', TARGET_NAME);
  node_post_block.append(node_form);

  // FIXME: Append <input> for request_info.parameters.

  var node_iframe = create_element('iframe');
  node_iframe.attr('name', TARGET_NAME);
  node_iframe.attr('src', 'about:blank');
  node_post_block.append(node_iframe);

  //// Set up event handlers.
  var settle = function(){
    node_post_block.remove();
    process_queued_api_request();
    return;
  };

  // FIXME: Check the result of a request, not only request timeout.
  var error_timer = setTimeout(
    function(){
      request_info.callback_on_error();
      settle();
    },
    10 * 1000
  );

  var submitted_p = false;
  node_iframe.load(function(){
    if (!submitted_p) {
      setTimeout(
        function(){
          node_form.submit();
        },
        0
      );
      submitted_p = true;
    } else {
      clearTimeout(error_timer);
      request_info.callback_on_success();
      setTimeout(settle, 0);
    }
  });

  //// Load the form.
  $('body').append(node_post_block);

  return;
}




function select_column(column_name)  //{{{2
{
  $('.column')
    .removeClass('active')
    .hide();
  $('.column')
    .filter(function(){return $(this).attr('title') == column_name;})
    .addClass('active')
    .show();

  $('.column_selector')
    .removeClass('active');
  $('.column_selector')
    .filter(function(){return $(this).text() == column_name;})
    .addClass('active');

  return;
}




function set_up_to_reply(screen_name, tweet_id)  //{{{2
{
  g_tweet_id_to_reply = tweet_id;
  $('#tweet_box').val('@' + screen_name + ' ' + $('#tweet_box').val());
  $('#tweet_box').focus();

  // Scroll to #console.
  // FIXME: Isn't there more proper way to do it?
  scroll($('#columns').attr('scrollHeight'));
  return;
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




function show_conversation(tweet_id)  //{{{2
{
  // FIXME: NIY
  return;
}




function show_tweets(d, node_column)  //{{{2
{
  // d = [{newest-tweet}, ..., {oldest-tweet}]

  raise_event('new_tweets', {tweets: d});

  if (d.length == 0)
    return 0;

  var node_tweet_hub = create_element('div');
  var node_dummy_tweet = create_element('div');

  node_tweet_hub.append(node_dummy_tweet);
  node_tweet_hub.addClass('tweet_hub');

  for (var i in d) {
    var node_tweet = create_element('div');
    node_tweet.data('json', d[i]);
    node_tweet.html(html_from_tweet(d[i]));

    node_tweet.addClass('tweet');
    node_tweet.addClass(class_name_from_tweet_id(d[i].id));
    if (tweet_mention_p(d[i]))
      node_tweet.addClass('mention');
    if (tweet_mine_p(d[i]))
      node_tweet.addClass('mine');
    node_tweet.addClass(censorship_classes_from_tweet(d[i]).join(' '));

    node_tweet_hub.prepend(node_tweet);
  }

  node_dummy_tweet.remove();

  node_column.append(node_tweet_hub);

  // Scroll to the head of the latest tweet hub.
  // FIXME: Customize behavior on this autoscroll.
  scroll(node_column.attr('scrollHeight')
         - node_tweet_hub.attr('scrollHeight'));

  return d.length;
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

  enqueue_api_request(TWITTER_UI_URI,
                      ((currently_favorited_p
                        ? 'favorites/destroy'
                        : 'favorites/create')
                       + '/' + tweet_id),
                      {},
                      update_views,
                      stop_fading);
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




function update()  //{{{2
{
  if (!g_user)
    return authenticate();

  call_twitter_api(TWITTER_API_URI,
                   'statuses/home_timeline',
                   {'callback': 'callback_update',
                    'count': MAX_COUNT,
                    'since_id': g_since_id || DUMMY_SINCE_ID});
  return;
}

function callback_update(d)
{
  $('#i_last_updated_time').text('Last updated: ' + new Date().toString());

  if (d.error)
  {
    show_balloon(d.error);
    return;
  }

  if (g_since_id) {
    for (var i = 0; i < d.length; i++) {
      if (d[i].id <= g_since_id)
        d.splice(i--, 1);
    }
  }

  var NEWEST_TWEET_INDEX = 0;
  g_since_id = d[NEWEST_TWEET_INDEX].id;

  show_tweets(d, $("#column_home"));
  return;
}








// API  {{{1
call_twitter_api = (function(){  //{{{2
  var s_seq = (new Date).getTime();  // To avoid browser-side caching.
  var s_lcds_nodes = {};  // {api_name: node_script, ...}

  return function(base_uri, api_name, _parameters) {
    parameters = $.extend(false, _parameters, {'seq': s_seq++});

    var ps = [];
    for (var key in parameters)
      ps.push(key + '=' + parameters[key]);

    s_lcds_nodes[api_name] = load_cross_domain_script(
      base_uri + api_name + '.json' + '?' + ps.join('&'),
      s_lcds_nodes[api_name]
   );
  };
})();




function load_cross_domain_script(uri, node)  //{{{2
{
  if (node && node.parentNode)
    node.parentNode.removeChild(node);

  node = document.createElement("script");
  node.src = uri;
  node.type = "text/javascript";
  document.body.appendChild(node);

  return node;
}








// Censorship  {{{1
// Variables  {{{2

var g_censorship_law = [/* {classes, property, pattern}, ... */];




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
      classes.push(rule.classes);
  }

  return classes;
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
      show_balloon('Error in pattern: "' + line + '"');
      continue;
    }

    g_censorship_law.push({
      classes: fields[0],
      property: fields[1],
      pattern: re_pattern,
    });
  }

  return;
}












// Cookie  {{{1
// Initialization  {{{2
if (!window.localStorage) {
  window.localStorage = (window.globalStorage
                         && window.globalStorage[location.hostname]);
}




function cookie_key(key)  //{{{2
{
  return 'fnfnen_' + key;
}




function read_cookie(key, default_value)  //{{{2
{
  if (window.localStorage && window.localStorage[cookie_key(key)])
    return new String(window.localStorage[cookie_key(key)]);

  var pkey = key + '=';
  var normalizezd_cookie = document.cookie + ';';
  var start = normalizezd_cookie.indexOf(pkey);
  if (0 <= start) {
    var end = normalizezd_cookie.indexOf(';', start);
    return unescape(normalizezd_cookie.substring(start + pkey.length, end));
  } else {
    return default_value;
  }
}




function write_cookie(key, value)  //{{{2
{
  if (window.localStorage) {
    window.localStorage[cookie_key(key)] = value;
  } else {
    var expired_date = new Date();
    expired_date.setTime(expired_date.getTime() + (100 * 24 * 60 * 60 * 1000));
    document.cookie = (key + '=' + escape(value) + ';'
                       + 'expires=' + expired_date.toGMTString());
  }
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

  this.columns = kw.columns || 80;
  this.current_value = read_cookie(name, default_value);
  this.default_value = default_value;
  this.form_type = kw.form_type || 'text';
  this.maximum_value = kw.maximum_value || Number.MAX_VALUE;
  this.minimum_value = kw.minimum_value || Number.MIN_VALUE;
  this.name = name;
  this.on_application = kw.on_application || nop;
  this.rows = kw.rows || 25;
  this.value_type = typeof(default_value);

  this.apply = function() {
    this.get_form();
    this.set_form();
    this.save();
    this.on_application();
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

    var node_dd = create_element('dd');
    node_dd.append(node_input);

    $('#form_preferences > dl > dd.submit').before(node_dt);
    $('#form_preferences > dl > dd.submit').before(node_dd);

    this.set_form();
    this.save();
    this.on_application();
  };

  this.node = function() {
    return $(':input[name="' + this.name + '"]');
  };

  this.save = function() {
    write_cookie(this.name, this.current_value);
  };

  this.set_form = function() {
    this.node().val(this.current_value);
  };

  this.initialize_form();
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

  var words = name.split('_');

  if (1 <= words.length) {
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

$(document).ready(function(){
  // Misc.
  initialize_parameters();
  $('#column_home, #column_mentions').empty();
  $('#tweet_box').val('');
  $('#column_selectors').empty();
  $('#balloon_container').empty();

  // Columns.
  $('.column').each(function(){
    var node_a = create_element('a');
    var column_name = $(this).attr('title');
    node_a.attr('class', 'column_selector');
    node_a.text(column_name);
    node_a.click(function(){
      select_column(column_name);
      return;
    });
    $('#column_selectors').append(node_a);
  });
  select_column('Home');

  // Preferences.
  $('#form_preferences').submit(apply_preferences);
  g_pref_update_interval_sec = new Preference(
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
  g_pref_custom_stylesheet = new Preference(
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
  g_pref_plugins = new Preference(
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
  g_pref_censorship_law = new Preference(
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

  // To post.
    // Add a secret iframe to hide interaction with Twitter.
  var node_iframe = create_element('iframe');
  node_iframe.attr('id', 'post_iframe');
  node_iframe.attr('name', 'xpost');
  node_iframe.attr('src', 'about:blank');
  node_iframe.css('display', 'none');
  $('body').append(node_iframe);
  $('#post_form').attr('target', 'xpost');
    // Event handlers.
  $('#post_form').submit(before_post);
  $('#post_iframe').load(after_post);
  $('#tweet_box').keyup(count_tweet_content);

  // To update.
  if (g_parameters['automatic_update'])
    update();

  raise_event('ready');
});








// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
