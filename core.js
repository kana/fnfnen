// Core of fnfnen.
// Variables  {{{1

var TWITTER_UI_URI = 'http://twitter.com/';
var TWITTER_API_URI = 'http://api.twitter.com/1/';
var MAX_COUNT = 200;

var g_authentication_element = null;
var g_seq = (new Date).getTime();
var g_update_element = null;
var g_user = null;
var g_since_id = null;








// Code  {{{1
function authenticate()  //{{{2
{
  g_authentication_element = load_cross_domain_script(
    (TWITTER_API_URI
     + "account/verify_credentials.json?callback=callback_authenticate&seq="
     + (g_seq++)),
    g_authentication_element);
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




function show_tweets(d, node_column)  //{{{2
{
  // d = [{newest-tweet}, ..., {oldest-tweet}]
  if (d.length == 0)
    return 0;

  var node_tweet_hub = $('<div></div>');
  var node_dummy_tweet = $('<div></div>');
  node_tweet_hub.append(node_dummy_tweet);

  for (var i in d) {
    var node_tweet = $('<div></div>');
    node_tweet.html(html_from_tweet(d[i]));
    node_tweet.data('json', d[i]);

    node_tweet_hub.prepend(node_tweet);
  }

  node_dummy_tweet.remove();

  node_column.append(node_tweet_hub);
  return d.length;
}




function update()  //{{{2
{
  if (!g_user)
    return authenticate();

  g_update_element = load_cross_domain_script(
    (TWITTER_API_URI
     + 'statuses/home_timeline.json?seq='
     + (g_seq++)
     + '&count='
     + MAX_COUNT
     + '&callback=callback_update'
     + (g_since_id ? '&since_id=' + g_since_id : '')),
    g_update_element);
  return;
}

function callback_update(d)
{
  $('#i_last_updated_time').text('Last updated: ' + new Date().toString());

  if (d.error)
    return alert(d.error);

  if (g_since_id) {
    for (var i = 0; i < d.length; i++) {
      if (d[i].id <= g_since_id)
        d.splice(i--, 1);
    }
  }

  show_tweets(d, $("#column_home"));
  return;
}




// Main  {{{1

$(document).ready(function(){
  $('#column_home').empty();
  $('#update_button').click(function(){
    update();
  });
});








// __END__  {{{1
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker