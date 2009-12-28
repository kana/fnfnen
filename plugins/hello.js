// hello - Example of fnfnen plugin

register_plugin((function(){
  return {
    ready: function(){
      // Raised when fnfnen is ready to use.
      alert('i sasara <Esc>g?b');
    },
    new_tweets: function(kw){
      // Raised when new tweets have been fetched.
      // Each tweet may be modified.
      alert(kw.tweets.length + ' tweets!');
    },
  };
})());




// vim: expandtab shiftwidth=2 softtabstop=2
