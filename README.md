## Read-eval-print loop (REPL) for Chrome App APIs.

[Chrome packaged app](http://developer.chrome.com/apps) that lets you play around with any of the [app APIs](http://developer.chrome.com/apps/api_index.html).

Since packaged apps don't allow the direct use of `eval()`, implementing a REPL is a bit tricky. The app `eval()`s all code in a [sandboxed frame](http://developer.chrome.com/apps/app_external.html#sandboxing). To enable API usage in a sandboxed frame (where APIs are normally disallowed), proxy/stub functions are created for all APIs such that they're executed in the main frame and the results forwarded back.
