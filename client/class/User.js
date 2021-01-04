/**
 * Class User - Contains user related methods.
 */
class User {
    /**
     * Singleton - Returns the active instance of the logged user.
     * 
     * @returns {User}
     */
    static getInstance() {
        if (!Helper.isEmpty(this._instance)) {
            return this._instance;
        }

        this._instance = new User();
        this._instance.fetchUserProperties();

        return this._instance;
    }

    /**
     * This method fetches the user's properties and updates the instance.
     * 
     * @returns {Promise<void>}
     */
    async fetchUserProperties() {
        const userInfo = User.getUserFromSite()["data"];

        // Checking if there is an active user in 10bis where we can fetch the data from.
        if (!Helper.isEmpty(userInfo)) {
            this.userToken = userInfo["userToken"];
            this.fullName = userInfo["firstName"] + " " + userInfo["lastName"];
            this.cellphone = userInfo["cellphone"];
            this.email = userInfo["email"];

            const previousUserToken = await Helper.getStorageValue("currentUserToken");

            // Checking if the user logged into a new account.
            if (previousUserToken != this.userToken) {
                await GroupeatMain.userSwitchHandler();
                Helper.setStorageValue("currentUserToken", this.userToken);
            }
        }
        else {
            // We couldn't find an active user, so we need to fetch it from the storage.
            this.userToken = await Helper.getStorageValue("currentUserToken");

            // If we couldn't find an active user and the GroupeatMain class exists, it means
            // the user has logged off.
            if (typeof GroupeatMain !== "undefined") {
                await GroupeatMain.userSwitchHandler(); // If we're here, it means the user probably logged off.
            }
        }

        this.testUserId = await User.fetchTestUserId();
        Helper.setStorageValue("currentTestUserId", this.testUserId);
    }

    /**
     * This method returns the user's object from 10bis.
     * 
     * @returns {object}
     */
    static getUserFromSite() {
        if (typeof __NEXT_DATA__ !== "undefined" && !Helper.isEmpty(__NEXT_DATA__)) {
            return __NEXT_DATA__["props"]["initialProps"]["initialState"]["user"];
        }
        
        return {};
    }

    /**
     * This method returns whether the user is connected or not.
     * 
     * @returns {Boolean}
     */
    isConnected() {
		return this.userToken != "";
	}
    
    /**
     * This method receives a userToken and returns whether it's valid or not.
     * 
     * @param {string} userToken 
     * @returns {Boolean}
     */
    static isUserTokenValid(userToken) {
        if (Helper.isEmpty(userToken)) {
            return false;
        }

        try {
            atob(userToken);
        }
        catch(e) {
            return false;
        }

        return true;
    }

    /**
     * This method receives a testUserId and sets the testUserId in storage.
     * This should only be used when creating a new test user, or else it can cause some problems.
     * 
     * @param {string} testUserId 
     * @returns {Promise<void>}
     */
    static async setTestingUser(testUserId) {
        await Helper.setStorageValue("testUserId", testUserId);
        
        User.getInstance().testUserId = testUserId;
    }

    /**
     * This method returns the current testUserId that is saved in the storage.
     * 
     * @returns {Promise<string|null>}
     */
    static async fetchTestUserId() {
        return await Helper.getStorageValue("testUserId");
    }

    /**
     * This method creates a new test user.
     * If the password doesn't match the password in Groupeat's server, the request will fail.
     * 
     * @param {string} fullName 
     * @param {string} password 
     * @returns {Promise<void>}
     */
    static async registerTestUserInGroupeat(fullName, password) {
        // INPRODUCTION: Remove this method.
        const user = User.getInstance();
        const data = {
            "userToken": user.userToken,
            "fullName": fullName,
            "cellphone": user.cellphone,
            "email": user.email,
            "password": password
        };

        const result = await Request.sendGroupeatRequest("user/registerUser", data);

        await User.setTestingUser(result["result"]);
        window.location.reload();
    }

    /**
     * This method registers the users in Groupeat.
     * 
     * @returns {Promise<object>}
     */
    async registerUserInGroupeat() {
        const data = {
            "userToken": this.userToken,
            "fullName": this.fullName,
            "cellphone": this.cellphone,
            "email": this.email
        };
        
        return await Request.sendGroupeatRequest("user/registerUser", data);
    }

    /**
     * This method cancels any unpaid orders the user has.
     * 
     * @returns {Promise<object>}
     */
    static async cancelTodayUnpaidOrders() {
        const requestData = await Request.getBasicRequestDataObject();
    
        return await Request.sendGroupeatRequest("user/cancelTodayUnpaidOrders", requestData);
    }

    get exists() {
        return !Helper.isEmpty(this.userToken);
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
        return this._testUserId;
    }

    set testUserId(testUserId) {
        this._testUserId = testUserId;
    }
}
