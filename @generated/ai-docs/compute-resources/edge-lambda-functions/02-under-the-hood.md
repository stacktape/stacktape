# Under the hood

Stacktape uses _Lambda@Edge_ to power Edge Lambda Functions. These functions are associated with a _CDN_ and are triggered by _CDN_ events—either when a request is made to the _CDN_ (`onRequest`) or when the _CDN_ is about to send a response back to the user (`onResponse`).