/**
 * Class FCM - Handles Firebase Cloud Messaging stuff.
 */
class FCM {
    /**
     * Singleton - This method returns an instance for the class.
     * 
     * @returns {Promise<FCM>}
     */
    static async getInstance() {
        if (!Helper.isEmpty(FCM._instance)) {
            return FCM._instance;
        }

        // We need to receive a notification permission from the user before we can start using FCM.
        await Notification.requestPermission();
        FCM.initFirebase();

        FCM._instance = new FCM();
        await FCM.getFirebaseMessaging().requestPermission(); // Requesting permission via FCM this time.

        // Fetching the client's FCM token.
        const fcmId = await FCM.getFirebaseMessaging().getToken();

        // Setting the fcmId in the storage because we will need in order to send the user notifications.
        if (!Helper.isEmpty(fcmId)) {
            FCM._instance.fcmId = fcmId;
            Helper.setStorageValue("fcmId", fcmId);
        }

        // Setting an fcmId change handler because we need to know when the fcmId was changed as it is crucial
        // for the extension.
        FCM._instance.fcmIdChangedHandler();

        return FCM._instance;
    }

    /**
     * This method initializes the firebase app.
     */
    static initFirebase() {
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
    }

    /**
     * This method returns a firebase messaging object and registers the firebase-messaging-sw.js file.
     * 
     * @returns {firebase.messaging}
     */
    static getFirebaseMessaging() {
        if (!Helper.isEmpty(FCM.messaging)) {
            return FCM.messaging;
        }

        FCM.messaging = firebase.messaging();
        FCM.messaging.usePublicVapidKey("");

        navigator.serviceWorker.register("./firebase-messaging-sw.js")
        .then(registration => {
            FCM.messaging.useServiceWorker(registration);
        });

        return FCM.messaging;
    }

    /**
     * This method handles FCM token change.
     * If the client's token was changed, we need to update it in the storage and update it in Groupeat's server.
     */
    fcmIdChangedHandler() {
        const self = this;

        FCM.getFirebaseMessaging().onTokenRefresh(function() {
            FCM.getFirebaseMessaging().getToken().then(newFcmId => {
                if (!Helper.isEmpty(newFcmId)) {
                    self.fcmId = newFcmId;
                    Helper.setStorageValue("fcmId", fcmId);

                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, {"message": "fcmIdChanged"});
                    });
                }
            });
        });
    }

    /**
     * This method updates the user's fcmId in Groupeat.
     * 
     * @returns {Promise<Boolean>}
     */
    static async updateUserFCMInGroupeat() {
        const fcmId = await Helper.getStorageValue("fcmId");

        if (Helper.isEmpty(fcmId)) {
            return false;
        }

        const requestData = await Request.getBasicRequestDataObject();

        requestData["fcmId"] = fcmId;

        await Request.sendGroupeatRequest("user/updateFCM", requestData);

        return true;
    }

    get fcmId() {
        return this._fcmId;
    }

    set fcmId(fcmId) {
        this._fcmId = fcmId;
    }
}
