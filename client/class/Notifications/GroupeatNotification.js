class GroupeatNotification {
    /**
     * This method receives notification data and displays a notification to the user.
     * This method can only work through a service worker and cannot be used in any other script!
     * 
     * @param {object} registration Required by the service worker.
     * @param {string} title 
     * @param {string} message 
     * @param {object} data 
     * @param {Boolean} requireInteraction If set to true, the notification will not close until the user manually closes it.
     * @returns {object}
     */
    static showServiceWorkerGroupeatNotification(registration, title, message, data, requireInteraction) {
        if (typeof requireInteraction === "undefined") {
            requireInteraction = false;
        }

        const options = {
            "body": message,
            "data": data,
            "icon": "images/icon128.png",
            "requireInteraction": requireInteraction
        };

        return registration.showNotification(title, options);
    }

    /**
     * This method receives notification data and displays a notification to the user.
     * This method can only work in the foreground (or background scripts) and cannot be used with service workers.
     * 
     * @param {string} title 
     * @param {string} message 
     * @param {function} onclick 
     * @param {Boolean} requireInteraction 
     */
    static showForegroundGroupeatNotification(title, message, onclick, requireInteraction) {
        if (typeof requireInteraction === "undefined") {
            requireInteraction = false;
        }

        chrome.runtime.sendMessage({"type": "groupeatForegroundNotification", "options": { 
            "iconUrl": chrome.extension.getURL("images/icon128.png"),
            "title": title,
            "message": message,
            "onclick": onclick,
            "requireInteraction": requireInteraction
        }});
    }

    /**
     * This method resets the unread notifications count that is shown on Groupeat's icon in the extensions bar in chrome.
     */
    static resetUnreadNotificationsCount() {
        chrome.browserAction.setBadgeBackgroundColor({color: [0, 255, 0, 128]});
        chrome.browserAction.setBadgeText({text: ''});
    }

    /**
     * This method sets the unread notifications count that is shown on Groupeat's icon in the extensions bar in chrome.
     * 
     * @param {Integer} unreadItemCount
     */
    static setUnreadNotificationsCount(unreadItemCount) {
        chrome.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 128]});
        chrome.browserAction.setBadgeText({text: '' + unreadItemCount});
    }
}

// Constants
GroupeatNotification.NOTIFICATIONS_STORAGE_KEY = "groupeatNotifications";
