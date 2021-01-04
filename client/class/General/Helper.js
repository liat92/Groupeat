class Helper {
    /**
     * This method returns whether a given variable is empty or not.
     * 
     * @param {*} d
     * @returns {Boolean}
     */
    static isEmpty(d) {
        return typeof d === "undefined" || d == "" || d == null || d == 0 || d.length == 0;
    }

    /**
     * This method returns whether a given variable is actually an integer or not.
     * 
     * @param {*} d 
     * @returns {Boolean}
     */
    static isTrueInteger(d) {
        return parseInt(d) == d;
    }

    /**
     * This method converts a string to upper camel case and returns it.
     * 
     * @param {string} str
     * @returns {string}
     */
    static upperCamelCase(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * This method receives an object and returns the amount of properties in the object.
     * 
     * @param {object} obj 
     * @returns {Integer}
     */
    static objectLength(obj) {
        if (typeof obj !== "object") {
            return 0;
        }

        let counter = 0;

        for (let i in obj) {
            if (!obj.hasOwnProperty(i)) {
                continue;
            }

            counter++;
        }

        return counter;
    }

    /**
     * This method receives an object and a path in the object as an array of strings and returns
     * the item in the object according to the given path.
     * 
     * @param {object} obj 
     * @param {Array<string>} path 
     * @returns {undefined|*}
     */
    static getItemByPath(obj, path) {
        if (typeof obj === "undefined") {
            return;
        }

        for (let i = 0; i < path.length; i++) {
            if (typeof obj[path[i]] === "undefined") {
                return;
            }

            obj = obj[path[i]];
        }

        return obj;
    }

    /**
     * This method receives an object, a path inside the object as an array of strings, a key and a value
     * and sets a value for the key inside the item inside the object.
     * 
     * @param {object} obj 
     * @param {Array<string>} path 
     * @param {string} key 
     * @param {*} value 
     */
    static setItemByPath(obj, path, key, value) {
        const item = getItemByPath(obj, path);

        if (typeof item !== "undefined") {
            item[key] = value;
        }
    }

    /**
     * This function receives an object and a property name and searches for the property in the object.
     * If the property is found, the function returns the path to the object as an array.
     * If the property is not found, the functions returns an empty array.
     * 
     * @param {object} obj 
     * @param {string} propertyName 
     * @returns {Array<string>}
     */
    static findPropertyPathInObject(obj, propertyName) {
        const result = Helper.findPropertyPathInObjectHelper(obj, propertyName, []);

        if (result["found"]) {
            return result["path"];
        }
        else {
            return [];
        }
    }

    /**
     * This function receives an object, a property name and the path the method traveled so far 
     * and searches for the property in the object.
     * If the property is found, the function returns the path to the object as an array.
     * If the property is not found, the functions returns an empty array.
     * 
     * @param {object} obj 
     * @param {string} propertyName 
     * @param {Array<string>} path 
     * @returns {Array<string>}
     */
    static findPropertyPathInObjectHelper(obj, propertyName, path) {
        if (obj == null || obj == undefined || typeof obj !== "object") {
            return {"path": path, "found": false}; // If we're here it means we couldn't find the item.
        }

        // Checking if the property is in the current location.
        for (let prop in obj) {
            if (prop == propertyName) {
                const newPath = path.slice(0);

                newPath.push(prop);
                return {"path": newPath, "found": true};
            }
        }

        // We couldn't find the property, so we need to look in every child of the current location in the object
        // in DFS style.
        for (let prop in obj) {
            const newPath = path.slice(0);

            newPath.push(prop);

            const res = Helper.findPropertyPathInObjectHelper(obj[prop], propertyName, newPath);

            if (res["found"]) {
                return {"path": res["path"], "found": true};
            }
        }

        return {"path": path, "found": false};
    }

    /**
     * This method receives a key and returns whether there is a value for this key in the chrome.storage or not.
     * 
     * @param {string} key 
     * @returns {Promise<Boolean>}
     */
    static async keyExistsInStorage(key) {
        return await new Promise(resolve => {
            // This may happen in testing environment.
            if (typeof chrome === "undefined" || typeof chrome.storage === "undefined") {
                resolve(false);
            }
            else {
                chrome.storage.sync.get([key], function(result) {
                    if (typeof result[key] !== "undefined") {
                        resolve(true);
                    }
                    else{
                        resolve(false);
                    }
                });
            }
        });
    }

    /**
     * This method receives a key and returns the value that is stored in the chrome.storage for this key.
     * If the key doesn't contain a value, the method returns null.
     * 
     * @param {string} key 
     * @returns {Promise<*>}
     */
    static async getStorageValue(key) {
        return await new Promise(resolve => {
            // This may happen in testing environment.
            if (typeof chrome === "undefined" || typeof chrome.storage === "undefined") {
                resolve(null);
            }
            else{
                chrome.storage.sync.get([key], function(result) {
                    if (typeof result[key] !== "undefined") {
                        resolve(result[key]);
                    }
                    else{
                        resolve(null);
                    }
                });
            }
        });
    }

    /**
     * This method receives a key and value and sets the key: value pair in the chrome.storage.
     * 
     * @param {string} key 
     * @param {*} value 
     */
    static async setStorageValue(key, value) {
        // This may happen in testing environment.
        if (typeof chrome === "undefined" || typeof chrome.storage === "undefined") {
            return;
        }

        const dataToSet = {};

        dataToSet[key] = value;
        chrome.storage.sync.set(dataToSet);
    }
}
