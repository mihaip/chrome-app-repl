chrome.app.runtime.onLaunched.addListener(openWindow);
chrome.app.runtime.onRestarted.addListener(openWindow);

function openWindow() {
  chrome.app.window.create('window.html', {
    id: 'window',
    defaultWidth: 600,
    defaultHeight: 700,
    defaultTop: 20,
    defaultLeft: 20
  });
}
