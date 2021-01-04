const firebaseAdmin = require("firebase-admin");
const Helper = require("./Helper.js");
const serviceAccount = require("../../firebase/groupeat-firebase-adminsdk.json"); // Firebase config file.

/**
 * Class Notification - Handles sending notifications from the server using Firebase.
 */
class Notification {
    /**
     * Singleton - returns the current instance of the class and initializes the firebase app on first run.
     * 
     * @returns {Notification}
     */
    static getInstance() {
        if (!Helper.isEmpty(Notification.instance)) {
            return Notification.instance;
        }

        Notification.instance = new Notification();

        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount),
            databaseURL: "https://groupeat.firebaseio.com"
        });

        return Notification.instance;
    }

    /**
     * This method receives a registration token and a message and sends a notification to the given registration token
     * with the given message.
     * 
     * @param {string} registrationToken 
     * @param {object} message 
     * @return {Promise<messaging.MessagingDevicesResponse>}
     */
    async sendMessage(registrationToken, message) {
        if (Helper.isEmpty(registrationToken)) {
            return null;
        }

        const payload = {
            "data": message
        };

        const options = {
            "priority": "high"
        };

        return await firebaseAdmin.messaging().sendToDevice(registrationToken, payload, options);
    }

    /**
     * This method receives a topic and a message and sends a notification to all users that are registered to the topic
     * with the given message.
     * 
     * @param {string} topic 
     * @param {object} message 
     * @returns {Promise<string>}
     */
    async sendMessageToTopic(topic, message) {
        if (Helper.isEmpty(topic)) {
            return null;
        }

        const payload = {
            "data": message,
            "topic": topic
        };

        return await firebaseAdmin.messaging().send(payload);
    }

    /**
     * This method receives an array of registration tokens and a topic and subscribes the registration tokens to
     * the given topic.
     * 
     * @param {Array<string>} registrationTokens 
     * @param {string} topic 
     * @returns {Promise<messaging.MessagingTopicManagementResponse>}
     */
    async subscribeToTopic(registrationTokens, topic) {
        if (Helper.isEmpty(registrationTokens) || Helper.isEmpty(topic)) {
            return null;
        }

        if (typeof registrationTokens !== 'object') {
            return null;
        }

        return await firebaseAdmin.messaging().subscribeToTopic(registrationTokens, topic);
    }

    /**
     * This method receives an array of registration tokens and a topic and unsubscribes the registration tokens from
     * the given topic.
     * 
     * @param {Array<string>} registrationTokens 
     * @param {Promise<string>} topic 
     * @returns {Promise<messaging.MessagingTopicManagementResponse>}
     */
    async unsubscribeFromTopic(registrationTokens, topic) {
        if (Helper.isEmpty(registrationTokens) || Helper.isEmpty(topic)) {
            return null;
        }

        if (typeof registrationTokens !== 'object') {
            return null;
        }

        return await firebaseAdmin.messaging().unsubscribeFromTopic(registrationTokens, topic);
    }
}

// Constants
Notification.ORDER_PASSED_MINIMUM_TYPE = "1";
Notification.ORDER_CONFIRMATION_TYPE = "2";
Notification.PING_UPDATE_TYPE = "3";
Notification.GROUP_ORDER_FAILED_TYPE = "4";

module.exports = Notification;
