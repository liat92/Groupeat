/**
 * Class TimeToOrderHandler - handles displaying the time to order notification at the correct time.
 */
class TimeToOrderHandler {
    /**
     * This method returns whether the current time is the time to order or not.
     * 
     * @returns {Promise<Boolean>}
     */
    static async isItTimeToOrder() {
        const timeToOrder = await Helper.getStorageValue(TimeToOrderHandler.TIME_TO_ORDER_STORAGE_KEY);

        if (Helper.isEmpty(timeToOrder)) {
            return false;
        }

        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMinutes = currentTime.getMinutes();
        const currentTimeString = currentHour.toString() + (currentMinutes < 10 ? "0" : "") + currentMinutes.toString();

        if (timeToOrder != currentTimeString) {
            return false;
        }

        return true;
    }

    /**
     * This method displays the time to order notification if it's the correct time.
     * 
     * @returns {Promise<void>}
     */
    static async displayNotification() {
        if (!(await TimeToOrderHandler.isItTimeToOrder())) {
            return;
        }

        const user = User.getInstance();
        const office = await Office.getInstance();

        await user.fetchUserProperties();
        await office.fetchOfficeProperties();

        // This may happen if the user is not registered / logged in.
        if (Helper.isEmpty(user.userToken) || Helper.isEmpty(office.addressKey) || Helper.isEmpty(office.addressCompanyId)) {
            return;
        }

        const requestData = await Request.getBasicRequestDataObject();
        const result = await Request.sendGroupeatRequest("user/getTodayOrders", requestData);
        const orders = result["result"];

        // Checking if the user has a paid order, if he has - we don't need to display a notification.
        for (let i = 0; i < orders.length; i++) {
            if (!Helper.isEmpty(orders[i]["isPaid"])) {
                return;
            }
        }

        // If the user has joined a group order but the order didn't pass the required minimum, we show a different message.
        if (orders.length) {
            BackgroundNotification.showNotification("זמן להזמין", "עדיין אין לך הזמנה משרדית שעוברת את המינימום והשעה 11 מתקרבת.", null, true);
        }
        else {
            BackgroundNotification.showNotification("זמן להזמין", "עדיין לא הזמנת מתן ביס היום והשעה 11 מתקרבת.", null, true);
        }
    }

    /**
     * This method initializes the time to order handler which constantly runs in the background.
     */
    static init() {
        setInterval(() => {
            TimeToOrderHandler.displayNotification().catch();
        }, TimeToOrderHandler.TIME_TO_ORDER_CHECK_INTERVAL);
    }
}

// Constants
TimeToOrderHandler.TIME_TO_ORDER_STORAGE_KEY = "timeToOrder";
TimeToOrderHandler.TIME_TO_ORDER_CHECK_INTERVAL = 60 * 1000; // 60 seconds.

TimeToOrderHandler.init();
