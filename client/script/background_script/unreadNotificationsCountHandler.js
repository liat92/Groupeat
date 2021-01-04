/**
 * Class UnreadNotificationsCountHandler - handles updating the unread notifications count that is displayed
 * on the extension's icon.
 */
class UnreadNotificationsCountHandler {
    /**
     * This method updates the count of unread notifications on the extension's icon.
     * 
     * @returns {Promise<void>}
     */
    static async updateUnreadNotificationsCount() {
        const user = User.getInstance();
        const office = await Office.getInstance();
    
        await user.fetchUserProperties();
        await office.fetchOfficeProperties();
    
        // This may happen if the user is not registered / logged in.
        if ((Helper.isEmpty(user.userToken) && Helper.isEmpty(user.testUserId)) || Helper.isEmpty(office.addressKey) || Helper.isEmpty(office.addressCompanyId)) {
            return;
        }
    
        const requestData = await Request.getBasicRequestDataObject();
        const result = await Request.sendGroupeatRequest("user/getUnreadNotifications", requestData);
        const unreadNotifications = result["result"];
    
        if (unreadNotifications.length > 0) {
            GroupeatNotification.setUnreadNotificationsCount(unreadNotifications.length);
        }
        else {
            GroupeatNotification.resetUnreadNotificationsCount();
        }
    }

    /**
     * This method initializes the unread notifications count handler which constantly runs in the background.
     */
    static init() {
        setInterval(() => {
            UnreadNotificationsCountHandler.updateUnreadNotificationsCount().catch(); // Avoiding errors.
        }, UnreadNotificationsCountHandler.UNREAD_NOTIFICATIONS_CHECK_INTERVAL);
    }
}

// Constants
UnreadNotificationsCountHandler.UNREAD_NOTIFICATIONS_CHECK_INTERVAL = 8 * 1000; // 8 seconds.

UnreadNotificationsCountHandler.init();