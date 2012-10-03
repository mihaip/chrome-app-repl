function sendHostMessage(type, params) {
  top.postMessage({type: type, params: params}, '*');
}

function log(text, opt_color) {
  sendHostMessage(MessageType.LOG, {text: text, opt_color: opt_color});
}

addMessageHandler(MessageType.INIT_APIS, function(apiDescriptors) {
  log('initializing APIs');
});

addMessageHandler(MessageType.EVAL, function(code) {
  var result;
  var exception;
  try {
    // TODO(mihai): serialization.
    result = eval(code);
  } catch (e) {
    // TODO(mihai): serialization.
    exception = e;
  }

  sendHostMessage(MessageType.EVAL_RESULT, {
    result: result,
    exception: exception
  });
});