class Request {
    /**
     * This method sends an Ajax request to a given path (URL).
     * 
     * @param {string} path 
     * @param {object} data 
     * @param {"POST"|"GET"} method 
     */
    static async sendAjaxRequest(path, data, method) {
        let validationPassed = true;

        if (typeof data !== "object") {
            data = {};
        }

        // If the path is not a string, then the validation is failed.
        if (typeof path !== "string") {
            validationPassed = false;
        }

        if (typeof method !== "string") {
            method = "POST"; // Setting the default method to POST.
        }
        else if (method.toLowerCase() == "get") {
            method = "GET";
            path += "/?" + Request._serializeGetParameters(data);
        }

        let url;

        // Validating that the path contains http at the beginning or else it's not a valid URL.
        if (path.indexOf("http") === 0) {
            url = path;
        }
        else{
            validationPassed = false;
        }

        // Checking if we should send the request via XMLHttpRequest or fetch.
        if (typeof XMLHttpRequest !== "undefined") {
            return await new Promise((resolve, reject) => {
                if (!validationPassed) {
                    reject();
                    return;
                }

                const xmlhttp = new XMLHttpRequest();
    
                xmlhttp.open(method, url, true);
                xmlhttp.setRequestHeader("Content-Type", "application/json");
                xmlhttp.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        
                xmlhttp.onload = e => {
                    if (xmlhttp.readyState === 4) {
                        if (xmlhttp.status === 200) {
                            resolve(JSON.parse(xmlhttp.responseText));
                        }
                        else {
                            // If the status is different than 200, then we received an error.
                            try {
                                const err = JSON.parse(xmlhttp.responseText);

                                reject(err);
                            }
                            catch (exc) {
                                reject(xmlhttp.statusText);
                            }
                        }
                    }
                };
        
                xmlhttp.onerror = reject;
                xmlhttp.send(JSON.stringify(data));
            });
        }
        else if (typeof fetch !== "undefined") {
            return await fetch(url, {
                "method": method,
                "headers": {
                    "Content-type": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                "body": JSON.stringify(data)
            })
            .then(resp => {
                return resp.json();
            });
        }
        else {
            return await new Promise((resolve, reject) => {
                reject();
            });
        }
    }

    /**
     * This method receives a path to an Ajax 10bis request, data and method and sends the request
     * to 10bis.
     * 
     * @param {string} path 
     * @param {object} data 
     * @param {method} method 
     * @returns {Promise<object>}
     */
    static async send10bisRequest(path, data, method) {
        const timestamp = new Date().getTime();

        if (typeof data !== "object") {
            data = {};
        }

        // Adding a timestamp because some of the requests in 10bis require a timestamp.
        data["timestamp"] = timestamp;

        return await Request.sendAjaxRequest(path, data, method);
    }

    /**
     * This method receives a path to a request in Groupeat's server and data and sends the request to Groupeat.
     * 
     * @param {string} path 
     * @param {object} data 
     * @returns {Promise<object>}
     */
    static async sendGroupeatRequest(path, data) {
        const url = Request._getGroupeatServerUrl() + path;

        return await Request.sendAjaxRequest(url, data, "POST");
    }

    /**
     * This method returns the base of Groupeat's server URL, for example:
     * https://groupeat.info or http://groupeat.info.
     * 
     * @returns {string}
     */
    static _getGroupeatServerUrl() {
        let url;

        if (Request.SECURED_CONNECTION_ENABLED) {
            url = "https://";
        }
        else{
            url = "http://";
        }

        url += Request.GROUPEAT_SERVER_ADDRESS;
        url += "/";

        return url;
    }

    /**
     * This method receives an object and serializes it so it can be used in GET requests.
     * 
     * @param {object} params 
     * @returns {string}
     */
    static _serializeGetParameters(params) {
        let str = "";

        for (let key in params) {
            if (str != "") {
                str += "&";
            }

            str += key + "=" + encodeURIComponent(params[key]);
        }

        return str;
    }

    /**
     * This method returns a basic request data object that is needed to most of the requests that are sent to Groupeat.
     * Among the properties of the object you can find userToken, testUserId, addressCompanyId and addressKey.
     * 
     * @returns {Promise<object>}
     */
    static async getBasicRequestDataObject() {
        const user = User.getInstance();
        const office = await Office.getInstance();
        const testUserId = user.testUserId ? user.testUserId : await User.fetchTestUserId();

        return {
            "userToken": user.userToken,
            "testUserId": testUserId,
            "addressCompanyId": office.addressCompanyId,
            "addressKey": office.addressKey
        };
    }
}

// Constants
Request.GROUPEAT_SERVER_ADDRESS = "groupeat.info";
Request.SECURED_CONNECTION_ENABLED = true; // Defines whether SSL is supported or not.
