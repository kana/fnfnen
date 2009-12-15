// Core of fnfnen.
// Variables  {{{1

var DUMMY_SINCE_ID = 1;
var MAX_COUNT = 200;
var MAX_TWEET_CONTENT = 140;
var TWITTER_API_URI = 'http://api.twitter.com/1/';
var TWITTER_UI_URI = 'http://twitter.com/';
var UPDATE_INTERVAL = 5 * 60 * 1000;  // in milliseconds

var g_parameters = {'automatic_update': true};
var g_since_id = null;
var g_tweet_id_to_reply = null;
var g_update_timer = null;
var g_user = null;








// Code  {{{1
function after_post()  //{{{2
{
  $('#tweet_box').val('');

  g_tweet_id_to_reply = null;
  $('#in_reply_to_status_id').remove();

  return;
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
  if (d.error)
    return alert(d.error);

  g_user = d;

  update();
  return;
}




function before_post()  //{{{2
{
  // Update timeline manually.
  if ($('#tweet_box').val() == '') {
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

  // FIXME: Disable or warn too long tweet.
  return true;
}




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
  }
})();




function count_tweet_content(e)  //{{{2
{
  var remain = MAX_TWEET_CONTENT - $('#tweet_box').val().length;

  $('#tweet_content_counter').text(remain);

  $('#tweet_content_counter').removeClass();
  if (remain < 0)
    $('#tweet_content_counter').addClass('much-content');
  else if (remain == 0)
    $('#tweet_content_counter').addClass('full-content');
  else if (remain < MAX_TWEET_CONTENT)
    $('#tweet_content_counter').addClass('some-content');
  else if (remain == MAX_TWEET_CONTENT)
    $('#tweet_content_counter').addClass('no-content');
  else
    ;

  return true;
}




function create_element(element_name)  //{{{2
{
  return $(document.createElement(element_name));
}




function favorite_symbol(favorite_p)  //{{{2
{
  return (favorite_p
          ? '&#x2605;'  // black (filled) star
          : '&#x2606;'  // white (empty) star
          );
}




function html_from_tweet(tweet)  //{{{2
{
  // FIXME: Add a button to retweet a tweet.
  // FIXME: Expand abbreviated URIs in a tweet.
  // FIXME: Make links for hashtags in a tweet.
  return (''
          /* user icon */
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
          /* screen name */
          + '<a class="screen_name"'
          + ' href="' + TWITTER_UI_URI + tweet.user.screen_name + '"'
          + '>'
          + tweet.user.screen_name
          + '</a>'
          /* text */
          + '<span class="text">'
          + make_links_in_text(tweet.text)
          + '</span>'
          /* posted time */
          + '<span class="posted_time">'
          + human_readable_format_from_date(new Date(tweet.created_at))
          + '</span>'
          /* button to reply */
          + '<a class="button reply"'
          + ' href="javascript:set_up_to_reply('
          +   "'" + tweet.user.screen_name + "'" + ','
          +   tweet.id
          + ')"'
          + '>'
          + '&#x21b5;'  // Carriage return symbol
          + '</a>'
          /* button to show the conversation */
          + (tweet.in_reply_to_status_id
             ? (''
                + '<a class="button conversation"'
                + ' href="javascript:show_conversation(' + tweet.id + ')"'
                + '>'
                + '&#x267b;'  // Black universal recycling symbol
                + '</a>')
             : '')
          /* button to toggle favorite */
          + '<a class="button favorite"'
          + ' href="javascript:toggle_favorite(' + tweet.id + ')">'
          + favorite_symbol(tweet.favorited)
          + '</a>'
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




function scroll(y_coordinate)  //{{{2
{
  scrollTo(0, y_coordinate);
  return;
}




function set_up_to_reply(screen_name, tweet_id)  //{{{2
{
  var active_column = $('#column_home');  // FIXME: Use the active column.

  g_tweet_id_to_reply = tweet_id;
  $('#tweet_box').val('@' + screen_name + ' ' + $('#tweet_box').val());
  $('#tweet_box').focus();

  scroll(active_column.attr('scrollHeight'));
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
  if (d.length == 0)
    return 0;

  var node_tweet_hub = create_element('div');
  var node_dummy_tweet = create_element('div');

  node_tweet_hub.append(node_dummy_tweet);
  node_tweet_hub.addClass('tweet-hub');

  for (var i in d) {
    var node_tweet = create_element('div');
    node_tweet.data('json', d[i]);
    node_tweet.html(html_from_tweet(d[i]));

    node_tweet.addClass('tweet');
    node_tweet.addClass('tweet_id_' + d[i].id);
    if (tweet_mention_p(d[i]))
      node_tweet.addClass('mention');
    if (tweet_mine_p(d[i]))
      node_tweet.addClass('mine');
    // FIXME: node_tweet.addClass('censored censored-{kind}');

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




function toggle_favorite(tweet)  //{{{2
{
  // FIXME: NIY
  alert(tweet);
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
    $('#i_error_message').text(d.error);
    alert(d.error);
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




// Main  {{{1

$(document).ready(function(){
  // Misc.
  initialize_parameters();
  $('#column_home').empty();
  $('#i_error_message').empty();
  $('#tweet_box').val('');

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
  $('#tweet_box').focus(function(){
                          $('#tweet_content_counter').css('display', 'inline');
                        });
  $('#tweet_box').blur(function(){
                         $('#tweet_content_counter').css('display', 'none');
                       });
  $('#tweet_box').blur();

  // To update.
  if (g_parameters['automatic_update']) {
    g_update_timer = setInterval(update, UPDATE_INTERVAL);
    update();
  }
});








// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
