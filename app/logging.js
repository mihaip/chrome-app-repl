// Assumes the existence of a log(text, opt_level) function (it has different
// implementations in the host and sandbox pages.

var LogLevel = {
  OUTPUT: 'output',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error'
};

function warning(text) {
  log(text, LogLevel.WARNING);
}

function error(text) {
  log(text, LogLevel.ERROR);
}

function info(text) {
  log(text, LogLevel.INFO);
}
