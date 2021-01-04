/**
 * Class UserOfficeRegistration - handles registering the user and office in 10bis automatically.
 */
class UserOfficeRegistration {
    /**
     * This method receives a storageKey and an object and generates a unique key that
     * should be used when storing information about the object in the cache.
     * 
     * @param {string} storageKey 
     * @param {object} data 
     * @returns {string}
     */
    static generateFullKeyFromData(storageKey, data) {
        let fullKey = storageKey;

        for (let i in data) {
            if (typeof data[i] === "undefined") {
                continue;
            }

            if (Helper.isEmpty(data[i])) {
                data[i] = 0;
            }

            fullKey += "_" + data[i];
        }

        return fullKey;
    }

    /**
     * This method checks if a specific object is already registered in Groupeat's server.
     * The method first checks if we already registered it and it is found in the extension's cache.
     * 
     * @param {string} storageKey 
     * @param {object} data 
     * @param {string} requestPath 
     * @returns {Promise<Boolean>}
     */
    static async isObjectExistsInServer(storageKey, data, requestPath) {
        const fullKey = UserOfficeRegistration.generateFullKeyFromData(storageKey, data);
        const exists = await Helper.keyExistsInStorage(fullKey);

        // Checking if the object is stored in the cache.
        if (exists) {
            return true;
        }

        const response = await Request.sendGroupeatRequest(requestPath, data);

        if (response["result"]) {
            Helper.setStorageValue(fullKey, true);
        }

        return response["result"];
    }

    /**
     * This method returns whether the user is registered in Groupeat or not.
     * 
     * @returns {Promise<Boolean>}
     */
    static async isUserRegistered() {
        const testUserId = await User.fetchTestUserId();
        const data = {
            "userToken": User.getInstance().userToken,
            "testUserId": testUserId
        };

        return await UserOfficeRegistration.isObjectExistsInServer("registeredUser", data, "user/userExists");
    }
    
    /**
     * This method returns whether the office is registered in Groupeat or not.
     * 
     * @returns {Promise<Boolean>}
     */
    static async isOfficeRegistered() {
        const testUserId = await User.fetchTestUserId();
        const office = await Office.getInstance();
        const data = {
            "userToken": User.getInstance().userToken,
            "testUserId": testUserId,
            "addressCompanyId": office.addressCompanyId,
            "addressKey": office.addressKey
        };

        return await UserOfficeRegistration.isObjectExistsInServer("registeredOffices", data, "office/officeExists");
    }

    /**
     * This method returns whether the user belongs to the current office in the server or not.
     * 
     * @returns {Promise<Boolean>}
     */
    static async isUserInOffice() {
        const testUserId = await User.fetchTestUserId();
        const office = await Office.getInstance();
        const data = {
            "userToken": User.getInstance().userToken,
            "testUserId": testUserId,
            "addressCompanyId": office.addressCompanyId,
            "addressKey": office.addressKey
        };

        return await UserOfficeRegistration.isObjectExistsInServer("userRegisteredToOffice", data, "user/userRelatedToOffice");
    }
    
    /**
     * This method registers the current user in Groupeat if he's not registered yet.
     * 
     * @returns {Promise<object>}
     */
    static async registerUser() {
        const result = await UserOfficeRegistration.isUserRegistered();
    
        if (result) {
            return;
        }
    
        return await User.getInstance().registerUserInGroupeat();
    }
    
    /**
     * This method registers the office in Groupeat if it isn't registered yet.
     * 
     * @returns {Promise<object>}
     */
    static async registerOffice() {
        const result = await UserOfficeRegistration.isOfficeRegistered();
    
        if (result) {
            return;
        }

        const office = await Office.getInstance();
    
        return await office.registerOfficeInGroupeat();
    }
    
    /**
     * This method adds the current user to the current active office.
     * 
     * @returns {Promise<object>}
     */
    static async addUserToOffice() {
        const userInOffice = await UserOfficeRegistration.isUserInOffice();

        if (userInOffice) {
            return;
        }

        const requestData = await Request.getBasicRequestDataObject();

        return await Request.sendGroupeatRequest("user/addUserToOffice", requestData);
    }
    
    /**
     * This method registers the user and office in Groupeat and adds the user to the office.
     */
    static async registerUserAndOffice() {
        // We need to wait for the active address to load before we can continue.
        await Office.waitForActiveAddressToLoad();

        if (!User.getInstance().exists) {
            return;
        }
        
        await UserOfficeRegistration.registerUser();
    
        if (!Office.isActiveAddressAnOffice()) {
            return;
        }
    
        await UserOfficeRegistration.registerOffice();
        await UserOfficeRegistration.addUserToOffice();
    }
}

// Initializing the user and office registration when the page is loaded.
jQuery(document).ready(() => {
    UserOfficeRegistration.registerUserAndOffice()
    .then(() => {
        // Updating the user's fcmId in Groupeat so we know where we should send notifications to.
        return FCM.updateUserFCMInGroupeat();
    })
    .catch();
});
