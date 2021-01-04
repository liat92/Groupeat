// Constants
const ORDER_PASSED_MINIMUM_TYPE = "1";
const ORDER_CONFIRMATION_TYPE = "2";
const PING_UPDATE_TYPE = "3";

// Initializing the __NEXT_DATA__ to null to avoid problems with some pieces of code that rely on this object's existence.
let __NEXT_DATA__ = null;

// Handling what happens when clicking on a notification.
self.addEventListener('notificationclick', function(e) {
    const data = e.notification.data;

    if (!data || !data["type"]) {
        return;
    }

    const restaurantId = data["restaurantId"];

    switch (data["type"]) {
        // If this is a restaurant related notification, clicking on the notification opens the restaurant's page.
        case ORDER_PASSED_MINIMUM_TYPE:
        case ORDER_CONFIRMATION_TYPE:
            clients.openWindow(Restaurant.getRestaurantUrl(restaurantId));

            break;
    }
});

// Importing scripts and classes that we need to work with.
importScripts("script/firebase-app.js");
importScripts("script/firebase-messaging.js");
importScripts("class/Notifications/GroupeatNotification.js");
importScripts("class/General/Helper.js");
importScripts("class/General/Request.js");
importScripts("class/General/ContentModifier.js");
importScripts("class/Restaurant.js");
importScripts("class/User.js");
importScripts("class/Office.js");

/**
 * This method receives a message payload and if the payload's type is PING_UPDATE_TYPE
 * we send a request to Groupeat which updates the last time the user was seen connected to Groupeat.
 * 
 * @param {object} payload 
 */
async function pingGroupeatHandler(payload) {
    const data = payload["data"];
    const type = data["type"];

    if (type != PING_UPDATE_TYPE) {
        return;
    }

    const userToken = data["userToken"];
    const testUserId = data["testUserId"];

    await Request.sendGroupeatRequest("user/pingUpdate", {
        "userToken": userToken,
        "testUserId": testUserId
    });
}

/**
 * This method receives a message payload and if the payload's type is ORDER_CONFIRMATION_TYPE
 * we charge the user for the relevant order and notify Groupeat's server that the order was paid.
 * 
 * @param {object} payload 
 */
async function automaticPaymentHandler(payload) {
    const data = payload["data"];
    const type = data["type"];

    // Checking that the notification we received is "Ready to make the order".
    if (type != ORDER_CONFIRMATION_TYPE) {
        return;
    }

    const user = User.getInstance();
    const office = await Office.getInstance();

    const restaurantId = parseInt(data["restaurantId"]);
    const userToken = data["userToken"];
    const testUserId = data["testUserId"];
    const addressCompanyId = data["addressCompanyId"];
    const addressKey = data["addressKey"];
    const shoppingCartGuid = data["shoppingCartGuid"];

    // Setting the user and office instances' properties that are needed for the setExistingOrderInShoppingCart method.
    user.userToken = userToken;
    user.testUserId = testUserId;
    office.addressCompanyId = addressCompanyId;
    office.addressKey = addressKey;

    // Notifying Groupeat's server that this order was paid.
    // This is done before the order was actually paid to avoid a problem where Groupeat sends
    // more notifications of this type in the middle of the process.
    await Request.sendGroupeatRequest("order/payOrder", {
        "userToken": userToken,
        "addressCompanyId": addressCompanyId,
        "addressKey": addressKey,
        "restaurantId": restaurantId,
        "testUserId": testUserId
    });

    // We need to set the existing order in 10bis' shopping cart before we can make the order.
    await Restaurant.setExistingOrderInShoppingCart(restaurantId, shoppingCartGuid);

    // WARNING: UNCOMMENTING THE FOLLOWING CODE WILL ACTIVATE REAL PAYMENTS TO 10BIS!!!
    /* 
    await Request.send10bisRequest("https://www.10bis.co.il/NextApi/SubmitOrder", {
        "Culture": "he-IL",
        "DontWantCutlery": false,
        "IsMobileDevice": false,
        "OrderRemarks": "",
        "ShoppingCartGuid": shoppingCartGuid,
        "UiCulture": "he",
        "UserToken": userToken
    }, "POST");
    */
}

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Setting a handler for receiving messages from Groupeat through Firebase.
messaging.setBackgroundMessageHandler(function(payload) {
    automaticPaymentHandler(payload)
    .catch(err => {
        console.log(err);
    });

    pingGroupeatHandler(payload)
    .catch(err => {
        console.log(err);
    });

    // If we are allowed to display notifications, we show a notification with the given title and message.
    if (Notification.permission == "granted") {
        return GroupeatNotification.showServiceWorkerGroupeatNotification(self.registration, payload.data["title"], payload.data["message"], payload.data, false);
    }
});
