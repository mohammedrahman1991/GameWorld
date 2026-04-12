var Commentary = (function() {
  var LINES = {
    curry_three:   "Splash! Chef from way downtown! That's money!",
    curry_two:     "Chef with the mid-range — automatic!",
    edwards_dunk:  "ANT-MAN throws it DOWN! What an athlete!",
    edwards_three: "Ant-Man from three — he has range tonight!",
    edwards_two:   "Ant-Man scores two — he's cooking!",
    steal:         "Picked his pocket! Turnover!",
    block:         "Rejection! Get that outta here!",
    miss:          "No good — but the crowd is loving this!"
  };
  var _busy = false;

  function say(event) {
    if (_busy) return;
    var text = LINES[event];
    if (!text) return;
    _busy = true;

    fetch('/api/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('API ' + res.status);
      return res.blob();
    })
    .then(function(blob) {
      var url   = URL.createObjectURL(blob);
      var audio = new Audio(url);
      audio.onended = function() { _busy = false; URL.revokeObjectURL(url); };
      audio.onerror = function() { _busy = false; };
      audio.play().catch(function() { _busy = false; });
    })
    .catch(function(err) {
      console.warn('Commentary skipped:', err.message);
      _busy = false;
    });
  }

  return { say: say };
})();
