const atob = require("atob");

const DB = require("./Database/DB.js");
const Helper = require("./General/Helper.js");
const Logger = require("./General/Logger.js");
const Notification = require("./General/Notification.js");
const GroupeatDate = require("./General/GroupeatDate.js");

const InvalidInputError = require("./Errors/InvalidInputError.js");
const UserNotExistsError = require("./Errors/UserNotExistsError.js");
const UserAlreadyExistsError = require("./Errors/UserAlreadyExistsError.js");

// Constants
const COLLECTION_NAME = "users";

/**
 * Class User - Contains users related methods.
 */
class User {
    /**
     * This method initiates the user's instance according to its userToken.
     * 
     * @param {string} userToken 
     * @returns {Promise<void>}
     */
    async initInstanceByUserToken(userToken) {
        if (!User.isUserTokenValid(userToken)){
            throw new InvalidInputError("The user token: " + userToken + " is invalid.", {
                "userToken": userToken
            });
        }

        const where = {
            "userToken": userToken,
            "testUserId": 0
        };

        const selectFields = {
            "notifications": 0
        };

        await DB.initInstanceByID(this, COLLECTION_NAME, where, selectFields);

        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + userToken + " does not exist.", {
                "userToken": userToken
            });
        }
    }

    /**
     * This method initiates the user's instance according to its testUserId.
     * 
     * @param {string} testUserId 
     * @returns {Promise<void>}
     */
    async initInstanceByTestUserId(testUserId) {
        const where = {
            "testUserId": testUserId
        };

        const selectFields = {
            "notifications": 0
        };

        await DB.initInstanceByID(this, COLLECTION_NAME, where, selectFields);

        if (!this.exists) {
            throw new UserNotExistsError("The test user with the testUserId: " + testUserId + " does not exist.", {
                "testUserId": testUserId
            });
        }
    }

    /**
     * This method reinitializes the user's instance according to the data in the database.
     * 
     * @returns {Promise<void>}
     */
    async reinitInstance() {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken
            });
        }

        if (!Helper.isEmpty(this.testUserId)) {
            await this.initInstanceByTestUserId(this.testUserId);
        }
        else {
            await this.initInstanceByUserToken(this.userToken);
        }
    }

    /**
     * This method returns whether a user exists according to its userToken.
     * 
     * @param {string} userToken 
     * @returns {Promise<Boolean>}
     */
    static async userExists(userToken) {
        if (!User.isUserTokenValid(userToken)){
            throw new InvalidInputError("The user token: " + userToken + " is invalid.", {
                "userToken": userToken
            });
        }

        const where = {
            "userToken": userToken,
            "testUserId": 0
        };

        const selectFields = {
            "notifications": 0
        };

        const data = await DB.getData(COLLECTION_NAME, where, selectFields);

        return !Helper.isEmpty(data);
    }

    /**
     * This method creates a new user.
     * If the isTestUser flag is positive, then the created user will be a test user and the testUserId will be returned.
     * 
     * @param {string} userToken 
     * @param {string} fullName 
     * @param {string} cellphone 
     * @param {string} email 
     * @param {Boolean} isTestUser 
     * @returns {Promise<string>}
     */
    static async createUser(userToken, fullName, cellphone, email, isTestUser) {
        if (!this.isUserTokenValid(userToken)){
            throw new InvalidInputError("The user token: " + userToken + " is invalid.", {
                "userToken": userToken,
                "fullName": fullName,
                "cellphone": cellphone,
                "email": email,
                "isTestUser": isTestUser
            });
        }

        if (!this.isFullNameValid(fullName)) {
            throw new InvalidInputError("The user's full name: " + fullName + " is invalid.", {
                "userToken": userToken,
                "fullName": fullName,
                "cellphone": cellphone,
                "email": email,
                "isTestUser": isTestUser
            });
        }

        if (!Helper.validatePhone(cellphone)) {
            throw new InvalidInputError("The user's cellphone: " + cellphone + " is invalid.", {
                "userToken": userToken,
                "fullName": fullName,
                "cellphone": cellphone,
                "email": email,
                "isTestUser": isTestUser
            });
        }

        if (!Helper.validateEmail(email)) {
            throw new InvalidInputError("The user's email: " + email + " is invalid.", {
                "userToken": userToken,
                "fullName": fullName,
                "cellphone": cellphone,
                "email": email,
                "isTestUser": isTestUser
            });
        }

        if (!isTestUser && await User.userExists(userToken)){
            throw new UserAlreadyExistsError("The user with the user token: " + userToken + " already exists.", {
                "userToken": userToken,
                "fullName": fullName,
                "cellphone": cellphone,
                "email": email,
                "isTestUser": isTestUser
            });
        }

        let testUserId = 0;

        if (!Helper.isEmpty(isTestUser)) {
            testUserId = Helper.getRandomHash();
        }

        const insertData = {
            "userToken": userToken,
            "fullName": fullName,
            "cellphone": cellphone,
            "email": email,
            "testUserId": testUserId,
            "fcmId": "",
            "fcmIdUpdateDate": "",
            "creationDate": new Date(new GroupeatDate().toISOString())
        };

        await DB.insertData(insertData, ["userToken", "fullName", "cellphone", "email", "testUserId"], COLLECTION_NAME);

        return testUserId;
    }

    /**
     * This method returns all the offices' addresses that the user is related to.
     * 
     * @returns {Promise<Array<object>>}
     */
    async getUserOffices() {
        const selectFields = {
            "_id": 0,
            "addressCompanyId": 1,
            "addressKey": 1
        };

        const offices = await DB.aggregate("offices",
            { "$match": {
                "users.user_id": this._id
            } },
            { "$project": selectFields }
        );

        return offices;
    }

    /**
     * This method resubscribes the user to the offices' notifications topics.
     * If a previousFcmId is supplied, the method will also unsubscribe this fcmId from the offices.
     * 
     * @param {string} previousFcmId 
     * @param {string} fcmId 
     * @returns {Promise<void>}
     */
    async resubscribeToUserOffices(previousFcmId, fcmId) {
        const userOffices = await this.getUserOffices();
        const notification = Notification.getInstance();

        for (let i = 0; i < userOffices.length; i++) {
            const addressCompanyId = userOffices[i]["addressCompanyId"];
            const addressKey = userOffices[i]["addressKey"];
            const topic = addressKey + "_" + addressCompanyId;

            if (!Helper.isEmpty(previousFcmId)) {
                await notification.unsubscribeFromTopic([previousFcmId], topic);
            }
    
            if (!Helper.isEmpty(fcmId)) {
                await notification.subscribeToTopic([fcmId], topic);
            }
        }
    }

    /**
     * This method updates the user's fcmId in the database.
     * The fcmId is the user's computer identifier which we send notifications to.
     * The method returns true if the fcmId was updated and false otherwise.
     * 
     * @param {string} fcmId 
     * @returns {Promise<Boolean>}
     */
    async updateFCM(fcmId) {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken,
                "fcmId": fcmId
            });
        }

        const previousId = this.fcmId;

        if (previousId == fcmId) {
            return false;
        }

        const updateData = {
            "fcmId": fcmId,
            "fcmIdUpdateDate": new Date(new GroupeatDate().toISOString())
        };

        const where = {
            "_id": this._id
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["fcmId"], where);
        this.resubscribeToUserOffices(previousId, fcmId);
        this.fcmId = fcmId;

        return true;
    }

    /**
     * The notifications variable that is returned from the aggregation is an array of objects of notifications which 
     * contain only one notification at a time, so we need to return only the notifications inside these objects.
     * 
     * @param {Array<object>} notifications 
     * @returns {Promise<Array<object>>}
     */
    static organizeNotificationsArray(notifications) {
        const organizedNotifications = [];

        // The notifications variable is an array of objects of notifications which contain only one notification at a time,
        // so we need to return only the notifications inside the objects.
        for (let i = 0; i < notifications.length; i++) {
            organizedNotifications.push(notifications[i]["notifications"]);
        }

        return organizedNotifications;
    }

    /**
     * This method returns the user's notifications which are not marked as removed.
     * 
     * @param {Integer} limit How many notifications should the function return at most.
     * @param {Integer} skip How many notifications should the function skip.
     * @returns {Promise<Array<object>>}
     */
    async getNotifications(limit, skip) {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken,
                "limit": limit,
                "skip": skip
            });
        }

        const selectFields = {
            "_id": 0,
            "notifications": 1
        };

        const aggr = [
            { "$unwind": "$notifications" },
            { "$match": {
                "_id": this._id,
                "notifications.isRemoved": 0
            } },
            { "$sort": {
                "notifications.dateAdded": -1
            } },
            { "$project": selectFields}
        ];

        if (Helper.isTrueInteger(skip) && skip > 0) {
            skip = parseInt(skip);
        }
        else {
            skip = 0;
        }

        if (Helper.isTrueInteger(limit) && limit > 0) {
            limit = parseInt(limit);
            aggr.push({ "$limit": skip + limit }); // Adding the limit to the aggregation.
        }

        if (skip > 0) {
            aggr.push({ "$skip": skip }); // Adding the skip parameter to the aggregation.
        }

        const notifications = await DB.aggregate(COLLECTION_NAME, aggr);
        const organizedNotifications = User.organizeNotificationsArray(notifications);

        return organizedNotifications;
    }

    /**
     * This method is similar to getNotifications, but returns only the unread notifications.
     * 
     * @returns {Promise<Array<object>>}
     */
    async getUnreadNotifications() {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken
            });
        }

        const selectFields = {
            "_id": 0,
            "notifications": 1
        };

        const unreadNotifications = await DB.aggregate(COLLECTION_NAME,
            { "$unwind": "$notifications" },
            { "$match": {
                "_id": this._id,
                "notifications.isRemoved": 0,
                "notifications.isRead": 0
            } },
            { "$sort": {
                "notifications.dateAdded": -1
            } },
            { "$project": selectFields}
        );

        const organizedUnreadNotifications = User.organizeNotificationsArray(unreadNotifications);

        return organizedUnreadNotifications;
    }

    /**
     * This method adds a notification object to the user's notifications array in the database.
     * 
     * @param {object} notification 
     * @returns {Promise<void>}
     */
    async addNotification(notification) {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken,
                "notification": notification
            });
        }

        notification["dateAdded"] = new Date(new GroupeatDate().toISOString());
        notification["isRemoved"] = 0;
        notification["isRead"] = 0;
        notification["dateRemoved"] = null;
        notification["dateRead"] = null;

        await DB.pushDataToArray(COLLECTION_NAME, "notifications", notification, this._id, null, 0);
    }

    /**
     * This method marks all the unmarked notifications of the user as read.
     * 
     * @returns {Promise<void>}
     */
    async markNotificationsAsRead() {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken
            });
        }

        const where = {
            "_id": this._id,
            "notifications": {
                "$elemMatch": {
                    "isRemoved": 0,
                    "isRead": 0
                }
            }
        }

        const updateData = {
            "isRead": 1,
            "dateRead": new Date(new GroupeatDate().toISOString())
        };

        const conditions = {
            "isRemoved": 0,
            "isRead": 0
        };

        await DB.updateArrayItems(COLLECTION_NAME, "notifications", where, updateData, conditions);
    }

    /**
     * This method removes all the user's notifications by marking them as removed.
     * This method is usually used when resetting the user.
     * 
     * @returns {Promise<void>}
     */
    async removeAllNotifications() {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken
            });
        }

        const where = {
            "_id": this._id,
            "notifications": {
                "$elemMatch": {
                    "isRemoved": 0
                }
            }
        }

        const updateData = {
            "isRemoved": 1,
            "dateRemoved": new Date(new GroupeatDate().toISOString())
        };

        const conditions = {
            "isRemoved": 0
        };

        await DB.updateArrayItems(COLLECTION_NAME, "notifications", where, updateData, conditions);
    }

    /**
     * This method receives an exact date (and time) string of a notification that was sent to the user, and removes
     * the notification from the user's notifications list by marking it as removed.
     * 
     * @param {string} dateAdded 
     * @returns {Promise<void>}
     */
    async removeNotification(dateAdded) {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken,
                "dateAdded": dateAdded
            });
        }

        if (Helper.isEmpty(dateAdded) || dateAdded.toString() == "Invalid Date") {
            throw new InvalidInputError("Invalid date received.", {
                "userToken": this.userToken,
                "dateAdded": dateAdded
            });
        }

        dateAdded = new Date(dateAdded);

        const updateData = {
            "notifications.$.isRemoved": 1,
            "notifications.$.dateRemoved": new Date(new GroupeatDate().toISOString())
        };

        const where = {
            "_id": this._id,
            "notifications": {
                "$elemMatch": {
                    "dateAdded": dateAdded
                }
            }
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["notifications.$.isRemoved", "notifications.$.dateRemoved"], where);
    }

    /**
     * This method sends a message to the user's client with a request to let us know whether it is connected or not.
     * 
     * @returns {Promise<void>}
     */
    async requestPingUpdate(title, message) {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken,
                "title": title,
                "message": message,
                "fcmId": this.fcmId
            });
        }

        if (Helper.isEmpty(this.fcmId)) {
            throw new InvalidInputError("The fcmId is missing from the user in the database.", {
                "userToken": this.userToken,
                "title": title,
                "message": message,
                "fcmId": this.fcmId
            });
        }

        const notification = Notification.getInstance();
        const dataToSend = {
            "type": Notification.PING_UPDATE_TYPE,
            "userToken": this.userToken.toString(),
            "testUserId": Helper.isEmpty(this.testUserId) ? "" : this.testUserId.toString(),
            "title": title,
            "message": message
        };

        await notification.sendMessage(this.fcmId, dataToSend);
    }

    /**
     * This method updates the last time we've seen the user's client connected.
     * 
     * @returns {Promise<void>}
     */
    async updatePingTime() {
        if (!this.exists) {
            throw new UserNotExistsError("The user with the userToken: " + this.userToken + " does not exist.", {
                "userToken": this.userToken
            });
        }

        const updateData = {
            "lastPingTime": new Date(new GroupeatDate().toISOString())
        };

        const where = {
            "_id": this._id
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["lastPingTime"], where);
    }

    /**
     * This method receives a userToken and returns whether it is a valid 10bis userToken or not.
     * 
     * @param {string} userToken 
     * @returns {Boolean}
     */
    static isUserTokenValid(userToken) {
        if (Helper.isEmpty(userToken)) {
            return false;
        }

        try {
            atob(userToken); // userToken should be in Base64.
        }
        catch(e) {
            Logger.log("Invalid userToken", {
                "userToken": userToken
            });
            
            return false;
        }

        return true;
    }

    /**
     * This method receives a full name (in english or hebrew) and returns whether it is valid or not.
     * 
     * @param {string} fullName 
     * @returns {Boolean}
     */
    static isFullNameValid(fullName) {
        if (Helper.isEmpty(fullName)) {
            return false;
        }

        const reg = new RegExp("^[A-Za-zא-ת]{2,20} [A-Za-zא-ת]{2,20}$", "m");

        return reg.test(fullName);
    }

    get _id() {
        return this.__id;
    }

    set _id(_id) {
        this.__id = _id;
    }

    get exists() {
        return !Helper.isEmpty(this._id);
    }

    get userToken() {
        return this._userToken;
    }

    set userToken(userToken) {
        this._userToken = userToken;
    }

    get fullName() {
        return this._fullName;
    }

    set fullName(fullName) {
        this._fullName = fullName;
    }

    get cellphone() {
        return this._cellphone;
    }

    set cellphone(cellphone) {
        this._cellphone = cellphone;
    }

    get email() {
        return this._email;
    }

    set email(email) {
        this._email = email;
    }

    get testUserId() {
        if (Helper.isEmpty(this._testUserId)) {
            return 0;
        }
        
        return this._testUserId;
    }

    set testUserId(testUserId) {
        this._testUserId = testUserId;
    }

    get fcmId() {
        return this._fcmId;
    }

    set fcmId(fcmId) {
        this._fcmId = fcmId;
    }

    get lastPingTime() {
        return this._lastPingTime;
    }

    set lastPingTime(lastPingTime) {
        this._lastPingTime = lastPingTime;
    }
}

module.exports = User;
