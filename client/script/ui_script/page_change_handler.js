// This script handles what happens if the page was changed but the extension window was open.
// If the extension window was open and the user went into 10bis' website from another website, we should update
// the extension window, and if the user went out from 10bis' website while the extension window
// was open, we should display an appropriate error by moving back to the index.html inside the extension window.
if (typeof chrome !== "undefined") {
    chrome.runtime.onMessage.addListener(request => {
        if (request["message"] == "pageChanged" && typeof request.url === "string") {
            if (request.url.indexOf("10bis.co.il") !== -1 && window.location.href.indexOf("index.html") !== -1) {
                window.location.reload();
            }
            else if (request.url.indexOf("10bis.co.il") === -1 && window.location.href.indexOf("index.html") === -1) {
                window.location.href = "index.html";
            }
        }
    });
}
