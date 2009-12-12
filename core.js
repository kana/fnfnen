// Core of fnfnen.
// Variables  {{{1

var DUMMY_SINCE_ID = 1;
var MAX_COUNT = 200;
var TWITTER_API_URI = 'http://api.twitter.com/1/';
var TWITTER_UI_URI = 'http://twitter.com/';
var UPDATE_AT_START_P = false;
var UPDATE_INTERVAL = 5 * 60 * 1000;  // in milliseconds

var g_seq = (new Date).getTime();
var g_since_id = null;
var g_update_timer = null;
var g_user = null;








// Code  {{{1
function after_post()  //{{{2
{
  $('#tweet_box').val('');
  return;
}




function authenticate()  //{{{2
{
  call_twitter_api(TWITTER_UI_URI,
                   'account/verify_credentials',
                   {'callback': 'callback_authenticate',
                    'seq': g_seq++});
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

  // FIXME: Disable or warn too long tweet.
  return true;
}




function call_twitter_api(base_uri, api_name, parameters)  //{{{2
{
  var ps = [];
  for (var key in parameters)
    ps.push(key + '=' + parameters[key]);

  g_lcds_nodes[api_name] = load_cross_domain_script(
    base_uri + api_name + '.json' + '?' + ps.join('&'),
    g_lcds_nodes[api_name]
 );
}

var g_lcds_nodes = {}




function create_element(element_name)  //{{{2
{
  return $(document.createElement(element_name));
}




function html_from_tweet(tweet)  //{{{2
{
  // FIXME: More information
  return (''
          /* screen name */
          + '<span class="screen_name">'
          + tweet.user.screen_name
          + '</span>'
          /* text */
          + '<span class="text">'
          + tweet.text
          + '</span>'
         );
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




function scroll(y_coordinate)  //{{{2
{
  scrollTo(0, y_coordinate);
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
    node_tweet.addClass('tweet');
    node_tweet.attr('id', node_column.attr('id') + '-' + d[i].id);
    node_tweet.html(html_from_tweet(d[i]));
    node_tweet.data('json', d[i]);

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




function update()  //{{{2
{
  if (!g_user)
    return authenticate();

  call_twitter_api(TWITTER_API_URI,
                   'statuses/home_timeline',
                   {'callback': 'callback_update',
                    'count': MAX_COUNT,
                    'seq': g_seq++,
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

  // To update.
  g_update_timer = setInterval(update, UPDATE_INTERVAL);

  if (UPDATE_AT_START_P)
    update();
});








// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
