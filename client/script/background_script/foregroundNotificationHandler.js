/**
 * Class ForegroundNotificationHandler - handles displaying notifications that were sent from foreground scripts.
 * 
 * content_scripts cannot display notifications, so we send a message to this background script which displays the
 * notification for the content_script.
 */
class ForegroundNotificationHandler {
    /**
     * This method initializes the foreground notification handler.
     */
    static init() {
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.type =! "groupeatForegroundNotification") {
                return;
            }

            BackgroundNotification.showNotification(request["options"]["title"], request["options"]["message"], request["options"]["onclick"], request["options"]["requireInteraction"]);
        
            if (typeof request["options"] !== "undefined" && typeof request["options"]["callback"] !== "undefined") {
                sendResponse(request["options"]["callback"]);
            }
        });
    }
}

ForegroundNotificationHandler.init();
