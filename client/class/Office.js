/**
 * Class Office - Contains office related methods.
 */
class Office {
    /**
     * Singleton - Returns the active instance of the current office the user is logged into.
     * 
     * @returns {Promise<Office>}
     */
    static async getInstance() {
        if (!Helper.isEmpty(this._instance)) {
            return this._instance;
        }

        this._instance = new Office();
        await this._instance.fetchOfficeProperties();
        
        return this._instance;
    }

    /**
     * This method receives the address object that can be found in 10bis and returns the full address as a text.
     * 
     * @param {object} addressObject 
     * @returns {string}
     */
    static getFullAddressFromAddressObject(addressObject) {
        if (Helper.isEmpty(addressObject)) {
            return "";
        }
        
        return addressObject["streetName"] + " " + addressObject["houseNumber"] + ", " + addressObject["cityName"] + " " + addressObject["entrance"];
    }
    
    /**
     * This method returns the current active address object in 10bis.
     * If there is no active address, the method returns null.
     * 
     * @returns {object|null}
     */
    static getCurrentActiveAddress() {
        // If the __NEXT_DATA__ is empty, we cannot continue.
        if (typeof __NEXT_DATA__ === "undefined" || Helper.isEmpty(__NEXT_DATA__)) {
            return null;
        }

        const $activeAddressWrapper = document.querySelectorAll('[class^="styled__ActiveAddressWrapper"]')[0];

		if (typeof $activeAddressWrapper !== "undefined") {
			__NEXT_DATA__["activeAddress"] = $activeAddressWrapper.textContent;
		}
        
        // Getting the user's object which contains the user's addresses.
        const userInfo = User.getUserFromSite()["data"];
		
        if (Helper.isEmpty(userInfo)) {
            return null;
        }
        
        const currentActiveAddress = __NEXT_DATA__["activeAddress"];
        const allAddresses = userInfo["addresses"];
        
        for (let i = 0; i < allAddresses.length; i++) {
            const fullAddress = Office.getFullAddressFromAddressObject(allAddresses[i]);

            // Checking if the current object's full address matches the active address.
            // If so, we found the active address object and we should return it.
            if (fullAddress == currentActiveAddress) {
                allAddresses[i]["addressKey"] = __NEXT_DATA__["props"]["initialProps"]["initialState"]["currentAddressKey"];
                return allAddresses[i];
            }
        }
        
        return null;
    }
    
    /**
     * This method returns whether the current active address in 10bis is an office's address or not.
     * 
     * @returns {Boolean}
     */
    static isActiveAddressAnOffice() {
        const activeAddress = Office.getCurrentActiveAddress();
    
        if (!Helper.isEmpty(activeAddress)) {
            return activeAddress["isCompanyAddress"] == true;
        }
        
        return false;
    }

    /**
     * This method fetches the office's properties and updates the instance.
     * 
     * @returns {Promise<void>}
     */
    async fetchOfficeProperties() {
        // We need to wait for the active address to load before we can continue.
        await Office.waitForActiveAddressToLoad();

        const activeAddress = Office.getCurrentActiveAddress();

        // Checking if there's an active office in 10bis' website where we can fetch the data from.
        if (!Helper.isEmpty(activeAddress) && !Helper.isEmpty(activeAddress["isCompanyAddress"])) {
            this.addressKey = activeAddress["addressKey"];
            this.addressCompanyId = activeAddress["addressCompanyId"];

            const previousAddressKey = await Helper.getStorageValue("currentAddressKey");
            const previousAddressCompanyId = await Helper.getStorageValue("currentAddressCompanyId");

            // Checking if the office was switched.
            if (previousAddressKey != this.addressKey || previousAddressCompanyId != this.addressCompanyId) {
                if (typeof GroupeatMain !== "undefined") {
                    await GroupeatMain.userSwitchHandler();
                }
                
                Helper.setStorageValue("currentAddressKey", this.addressKey);
                Helper.setStorageValue("currentAddressCompanyId", this.addressCompanyId);
            }
        }
        else {
            // We couldn't find an active address, so we need to fetch it from the storage.
            this.addressKey = await Helper.getStorageValue("currentAddressKey");
            this.addressCompanyId = await Helper.getStorageValue("currentAddressCompanyId");

            // If we couldn't find an active address and the GroupeatMain class exists, it means
            // the user has logged off.
            if (typeof GroupeatMain !== "undefined") {
                await GroupeatMain.userSwitchHandler();
            }
        }
    }

    /**
     * This method returns only when the active address was loaded.
     * 
     * @returns {Promise<void>}
     */
    static async waitForActiveAddressToLoad() {
        if (!Helper.isEmpty(Office.getCurrentActiveAddress())) {
            return;
        }

        return await ContentModifier.waitForElement('[class^="styled__ActiveAddressWrapper"]');
    }
    
    /**
     * This method receives an addressCompanyId and an addressKey and returns whether the addressCompanyId
     * and the addressKey are valid or not.
     * 
     * @param {Integer} addressCompanyId 
     * @param {string} addressKey 
     * @returns {Boolean}
     */
    static isAddressValid(addressCompanyId, addressKey) {
        if (Helper.isEmpty(addressCompanyId) || Helper.isEmpty(addressKey)) {
            return false;
        }

        if (!Helper.isTrueInteger(addressCompanyId)) {
            return false;
        }

        const regExp = new RegExp("^[0-9]{1,4}-[0-9]{1,7}-[0-9]{1,4}-[0-9]{1,9}$", "m");

        return regExp.test(addressKey);
    }

    /**
     * This method creates a new office in Groupeat's server.
     * 
     * @returns {Promise<object>}
     */
    async registerOfficeInGroupeat() {
        const data = await Request.getBasicRequestDataObject();
    
        return await Request.sendGroupeatRequest("office/registerOffice", data);
    }

    get exists() {
        return !Helper.isEmpty(this.addressCompanyId) && !Helper.isEmpty(this.addressKey);
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
