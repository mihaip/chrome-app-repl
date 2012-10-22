// Assumes the existence of a log(text, opt_level) function (it has different
// implementations in the host and sandbox pages.

var LogLevel = {
  OUTPUT: 'output',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error'
};

function warning(text) {
  return log(text, LogLevel.WARNING);
}

function error(text) {
  return log(text, LogLevel.ERROR);
}

function info(text) {
  return log(text, LogLevel.INFO);
}
