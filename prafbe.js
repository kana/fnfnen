var prafbe = {};

prafbe.MINIMUM_TOKEN_PROBABILITY = 0.0001;
prafbe.TOKEN_COUNT_KEY = '*token-count*';  // must contain non-token character.
prafbe.UNFAMILIAR_TOKEN_PROBABILITY = 0.4;




prafbe._learn = function (dict, s_or_tokens, d)
{
  var tokens = (typeof s_or_tokens == 'string'
                ? prafbe.tokenize(s_or_tokens)
                : s_or_tokens);
  var sum = prafbe.sum_token_counts(dict);

  for (var i in tokens) {
    var t = tokens[i];
    var n_old = dict[t];
    var n_new = (n_old || 0) + d;
    sum += d;
    if (0 < n_new) {
      dict[t] = n_new;
    } else {
      delete dict[t];
      sum += -n_new;
    }
  }

  dict[prafbe.TOKEN_COUNT_KEY] = sum;
};




prafbe.calculate_spam_probability = function (probabilities)
{
  var _probabilities = (0 < probabilities.length
                        ? probabilities
                        : [prafbe.UNFAMILIAR_TOKEN_PROBABILITY]);
  var p1 = _probabilities.
           reduce(function (a, b) {return a * b;});
  var p2 = _probabilities.
           map(function (x) {return 1 - x;}).
           reduce(function (a, b) {return a * b;});
  return p1 / (p1 + p2);
};




prafbe.calculate_spamness = function (right_dict, wrong_dict, token)
{
  var r = right_dict[token] || 0;
  var w = wrong_dict[token] || 0;
  var rn = prafbe.sum_token_counts(right_dict);
  var wn = prafbe.sum_token_counts(wrong_dict);
  var rp = Math.min(1, (2 * r) / rn);
  var wp = Math.min(1, w / wn);
  var mp = prafbe.MINIMUM_TOKEN_PROBABILITY;

  if (2 * r + w < 5) {
    return prafbe.UNFAMILIAR_TOKEN_PROBABILITY;
  } else if (r == 0) {
    return w <= 10 ? (1 - 2 * mp) : (1 - mp);
  } else if (w == 0) {
    return r <= 10 ? mp * 2 : mp;
  } else {
    return Math.max(mp, Math.min(1 - mp, wp / (rp + wp)));
  }
};




prafbe.compact = function (dict, opt_divisor)
{
  var divisor = opt_divisor || 10;
  for (var i in dict) {
    var n = Math.round(dict[i] / divisor);
    if (0 < n)
      dict[i] = n;
    else
      delete dict[i];
  }
  delete dict[prafbe.TOKEN_COUNT_KEY];
}




prafbe.learn = function (dict, s)
{
  return prafbe._learn(dict, s, 1);
}




prafbe.list_bigrams = function (s)
{
  var bigrams = [];

  for (var i = 1; i < s.length; i++)
    bigrams.push(s[i - 1] + s[i]);

  return 0 < bigrams.length ? bigrams : [s];
};




prafbe.list_most_interesting_tokens =
function (right_dict, wrong_dict, tokens, n, opt_with_extra_p)
{
  var with_extra_p = (opt_with_extra_p || false);

  var pairs = [];
  var found = {};
  for (var i in tokens) {
    var t = tokens[i];
    if (!(found[t])) {
      var probability = prafbe.calculate_spamness(right_dict, wrong_dict, t)
      var score = Math.abs(0.5 - probability);
      pairs.push([t, score, probability]);
      found[t] = true;
    }
  }

  var most_interesting_pairs = (
    pairs
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .slice(0, n)
  );
  return (
    with_extra_p
    ? most_interesting_pairs
    : most_interesting_pairs.map(function (x) {return x[0];})
  );
};




prafbe.sum_token_counts = function (dict)
{
  var n = dict[prafbe.TOKEN_COUNT_KEY];

  if (n == null) {
    n = 0;
    for (var i in dict)
      n += dict[i];
    dict[prafbe.TOKEN_COUNT_KEY] = n;
  }

  return n;
};




prafbe.tokenize = function (s)
{
  return (
    s
    .replace(/([\u0000-\u007F]+)|([^\u0000-\u007F]+)/g, function (_, p1, p2) {
      if (p1) {
        return p1.replace(/[^A-Za-z0-9.\-$!']+/g, ' ')
      } else {
        return ' ' + prafbe.list_bigrams(p2).join(' ') + ' ';
      }
    })
    .split(/\s+/)
    .map(function (x) {return x.replace(/^\.+/, '');})
    .map(function (x) {return x.replace(/\.+$/, '');})
    .filter(function (x) {return x != '';})
    .filter(function (x) {return !(/^\d+$/.test(x));})
  );
};




prafbe.unlearn = function (dict, s)
{
  return prafbe._learn(dict, s, -1);
}




// __END__
// vim: expandtab shiftwidth=2 softtabstop=2
// vim: foldmethod=marker
