onmessage = function(event) {
  var result;
  var exception;
  try {
    // TODO(mihai): serialization.
    result = eval(event.data);
  } catch (e) {
    // TODO(mihai): serialization.
    exception = e;
  }
  event.source.postMessage({
      result: result,
      exception: exception
    },
    event.origin);
};