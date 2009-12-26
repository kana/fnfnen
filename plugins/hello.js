// hello - Example of fnfnen plugin

register_plugin((function(){
  return {
    ready: function(){
      alert('i sasara <Esc>g?b');
    },
    new_tweets: function(kw){
      alert(kw.tweets.length + ' tweets!');
    },
  };
})());




// vim: expandtab shiftwidth=2 softtabstop=2
