const DB = require("./Database/DB.js");
const Helper = require("./General/Helper.js");
const Notification = require("./General/Notification.js");
const Logger = require("./General/Logger.js");
const GroupeatDate = require("./General/GroupeatDate.js");

const InvalidInputError = require("./Errors/InvalidInputError.js");
const OfficeNotExistsError = require("./Errors/OfficeNotExistsError.js");
const UserNotExistsError = require("./Errors/UserNotExistsError.js");
const OfficeAlreadyExistsError = require("./Errors/OfficeAlreadyExistsError.js");
const AlreadyExistsError = require("./Errors/AlreadyExistsError.js");

// Constants
const COLLECTION_NAME = "offices"; // The collection name of where the entities of this class are stored in the database.

/**
 * Class Office - Contains offices related methods.
 */
class Office {
    /**
     * This method initiates the office's instance according to the its addressCompanyId and addressKey.
     * 
     * @param {string} addressCompanyId 
     * @param {string} addressKey 
     * @returns {Promise<void>}
     */
    async initInstanceByAddress(addressCompanyId, addressKey) {
        if (!Office.isAddressValid(addressCompanyId, addressKey)) {
            throw new InvalidInputError("The office addressCompanyId: " + addressCompanyId + " or addressKey: " + addressKey + " is invalid.", {
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        const where = {
            "addressCompanyId": addressCompanyId,
            "addressKey": addressKey
        }

        const selectFields = {
            "users": 0
        }

        await DB.initInstanceByID(this, COLLECTION_NAME, where, selectFields);

        if (!this.exists) {
            throw new OfficeNotExistsError("The office with the addressCompanyId: " + addressCompanyId + " and addressKey: " + addressKey + " does not exist.", {
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }
    }

    /**
     * This method receives an office's address and returns whether the office exists in Groupeat's database.
     * 
     * @param {string} addressCompanyId 
     * @param {string} addressKey 
     * @returns {Promise<Boolean>}
     */
    static async officeExists(addressCompanyId, addressKey) {
        if (!Office.isAddressValid(addressCompanyId, addressKey)){
            throw new InvalidInputError("The office addressCompanyId: " + addressCompanyId + " or addressKey: " + addressKey + " is invalid.", {
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        const where = {
            "addressCompanyId": addressCompanyId,
            "addressKey": addressKey
        };

        const selectFields = {
            "_id": 1
        };

        const data = await DB.getData(COLLECTION_NAME, where, selectFields);

        return !Helper.isEmpty(data);
    }

    /**
     * This method receives addressCompanyId and addressKey and registers a new office with the given address
     * in Groupeat's database.
     * 
     * @param {string} addressCompanyId 
     * @param {string} addressKey 
     * @returns {Promise<void>}
     */
    static async createOffice(addressCompanyId, addressKey) {
        if (!Office.isAddressValid(addressCompanyId, addressKey)){
            throw new InvalidInputError("The office addressCompanyId: " + addressCompanyId + " or addressKey: " + addressKey + " is invalid.", {
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        if (await Office.officeExists(addressCompanyId, addressKey)){
            throw new OfficeAlreadyExistsError("The office with the addressCompanyId: " + addressCompanyId + " and addressKey: " + addressKey + " already exists.", {
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        const insertData = {
            "addressCompanyId": addressCompanyId, 
            "addressKey": addressKey, 
            "users": [],
            "creationDate": new Date(new GroupeatDate().toISOString())
        };

        const insertFields = ["addressCompanyId", "addressKey", "users"];

        await DB.insertData(insertData, insertFields, COLLECTION_NAME);
    }

    /**
     * This method receives a user and returns whether the user is related to the office or not.
     * 
     * @param {User} user 
     * @returns {Promise<Boolean>}
     */
    async isUserInOffice(user) {
        if (!user.exists) {
            throw new UserNotExistsError("The user with the userToken: " + user.userToken + " does not exist.", {
                "user": user,
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        if (!this.exists) {
            throw new OfficeNotExistsError("The office with addressCompanyId: " + this.addressCompanyId + ", addressKey: " + this.addressKey + " does not exist.", {
                "user": user,
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        const where = {
            "addressCompanyId": this.addressCompanyId,
            "addressKey": this.addressKey,
            "users": {
                "$elemMatch": {
                    "user_id": user._id
                }
            }
        };

        const selectFields = {
            "_id": 1
        };

        const data = await DB.getData(COLLECTION_NAME, where, selectFields);

        return !Helper.isEmpty(data);
    }

    /**
     * This method receives a user and adds the user to the office.
     * 
     * @param {User} user 
     * @returns {Promise<Boolean>}
     */
    async addUser(user) {
        if (!user.exists) {
            throw new UserNotExistsError("The user with the userToken: " + user.userToken + " does not exist.", {
                "user": user,
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        if (!this.exists) {
            throw new OfficeNotExistsError("The office with addressCompanyId: " + this.addressCompanyId + ", addressKey: " + this.addressKey + " does not exist.", {
                "user": user,
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        if (await this.isUserInOffice(user)) {
            throw new AlreadyExistsError("The office is already in the given user with userToken: " + user.userToken, {
                "user": user,
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
        }

        const dataToPush = {
            "user_id": user._id
        };

        const result = await DB.pushDataToArray(COLLECTION_NAME, "users", dataToPush, this._id);

        // Subscribing the user to the office topic so he may receive notifications.
        user.resubscribeToUserOffices(user.fcmId, user.fcmId);

        return result;
    }

    /**
     * This method sends a notification to every user in the office.
     * 
     * @param {object} message 
     * @returns {Promise<string>}
     */
    async sendOfficeUpdatedNotification(message) {
        const notification = Notification.getInstance();

        return notification.sendMessageToTopic(this.getOfficeUpdatesTopic(), message);
    }

    /**
     * This method receives an addressCompanyId and an addressKey and checks whether they are valid or not.
     * 
     * @param {string} addressCompanyId 
     * @param {string} addressKey 
     * @returns {Boolean}
     */
    static isAddressValid(addressCompanyId, addressKey) {
        if (Helper.isEmpty(addressCompanyId) || Helper.isEmpty(addressKey)) {
            return false;
        }

        const parsedId = parseInt(addressCompanyId);

        if (isNaN(parsedId) || parsedId != addressCompanyId) {
            Logger.log("Invalid address", {
                "location": "Office.isAddressValid",
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });

            return false;
        }

        const regExp = new RegExp("^[0-9]{1,4}-[0-9]{1,7}-[0-9]{1,4}-[0-9]{1,9}$", "m");

        if (!regExp.test(addressKey)) {
            Logger.log("Invalid address", {
                "location": "Office.isAddressValid",
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey
            });
            
            return false;
        }

        return true;
    }

    /**
     * This method returns the topic for office notifications.
     * 
     * @returns {string}
     */
    getOfficeUpdatesTopic() {
        return this.addressKey + "_" + this.addressCompanyId;
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

    get addressCompanyId() {
        return this._addressCompanyId;
    }

    set addressCompanyId(addressCompanyId) {
        this._addressCompanyId = addressCompanyId;
    }

    get addressKey() {
        return this._addressKey;
    }

    set addressKey(addressKey) {
        this._addressKey = addressKey;
    }
}

module.exports = Office;
