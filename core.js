// Core of fnfnen.

function show_tweets(d, node_column)
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

function html_from_tweet(tweet)
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




$(document).ready(function(){
  $('#column_home').empty();

  show_tweets(
    [{'text': 'you', 'user': {'screen_name': 'Mashiro'}},
     {'text': 'love', 'user': {'screen_name': 'Sasara'}},
     {'text': 'i', 'user': {'screen_name': 'Alter'}}],
    $('#column_home'));
});

// __END__
// vim: expandtab shiftwidth=2 softtabstop=2
