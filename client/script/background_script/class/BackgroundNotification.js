/**
 * Class BackgroundNotification - handles displaying notifications from background scripts.
 */
class BackgroundNotification {
    /**
     * This method displays a notification according to the given parameters.
     * 
     * @param {string} title 
     * @param {string} message 
     * @param {function|null|undefined} onclick 
     * @param {Boolean} requireInteraction If set to true, the notification will not close until the user closes it.
     */
    static showNotification(title, message, onclick, requireInteraction) {
        const options = {
            "type": "basic",
            "title": title,
            "message": message,
            "iconUrl": "images/icon128.png",
            "requireInteraction": requireInteraction
        };
    
        chrome.notifications.create(null, options, notificationId => {
            if (typeof onclick !== "function") {
                return;
            }
    
            (function(notificationId) {
                chrome.notifications.onClicked.addListener(pressedNotificationId => {
                    if (pressedNotificationId == notificationId) {
                        onclick();
                    }
                });
            })(notificationId);
        });
    }
}
