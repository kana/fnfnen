fnfnen_external_configuration((function(){
  var censorship_law = [];
  censorship_law.push('mention:text:?\\b@?kana1?\\b');
  censorship_law.push('pure retweet:text:^RT\\s+@');
  censorship_law.push('retweet quotweet:text:\\b(RT|QT)\\s+@');

  var censored_columns = [];
  censored_columns.push('Mentions:mention');
  censored_columns.push('Retweets:retweet');

  return {
    custom_stylesheet: '@import url(sample-style.css)',
    censorship_law: censorship_law.join('\n'),
    censored_columns: censored_columns.join('\n'),
  };
}()));

// vim: expandtab shiftwidth=2 softtabstop=2
