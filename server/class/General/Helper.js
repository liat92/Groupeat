const crypto = require('crypto');
const xss = require("xss");

/**
 * Class Helper - Contains many general and useful methods.
 */
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
     * This method receives a mongodb document and an instance and calls the instance's init methods
     * according to the data in the document.
     * 
     * @param {object} inst 
     * @param {object} doc 
     */
    static initInstanceWithDoc(inst, doc) {
        for (let j in doc){
            if (!(j in doc) || !(j in inst)) {
                continue;
            }

            const propertyPlacementCode = "inst." + j + " = (doc." + j + ")";

            eval(propertyPlacementCode);
        }
    }

    /**
     * This method receives an express' request object and returns whether the request is an Ajax request or not.
     * 
     * @param {object} req 
     * @returns {Boolean}
     */
    static isAjaxRequest(req) {
        return req.xhr;
    }

    /**
     * This method returns the amount of properties in a given object.
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
     * This method receives a string and returns whether the string is a valid email or not.
     * 
     * @param {string} email 
     * @returns {Boolean}
     */
    static validateEmail(email) {
        if (Helper.isEmpty(email)) {
            return false;
        }

        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        return re.test(String(email).toLowerCase());
    }

    /**
     * This method receives a string and returns whether the string is a valid israeli phone number or not.
     * 
     * @param {string} phone 
     * @returns {Boolean}
     */
    static validatePhone(phone) {
        if (Helper.isEmpty(phone)) {
            return false;
        }

        phone = phone.replace("-", "").trim();

        const phoneRegex = {
            "asteriskKey": /^\*{1}[2-9]{1}[0-9]{1,4}$/,

            /**
             * Prefixes: 02, 03, 04, 08, 09
             * Optional dash after the prefix
             * Digit in the range of 1-9 and 6 more digits in the range of 0-9
             */
            "bezeq": /^[0]{1}((?![5,6,7])[2-9]){1}(-)*[2-9]{1}[\d]{6}$/,

            /**
             * Prefixes: 1599, 1700, 1800, 1801
             * Optional dash after the prefix's first digit
             * Optional dash after the prefix (4 digits)
             * Digit between 1-9, two more digits between 0-9, optinal dash, 3 digits
             */
            "special": /^((1)[-]*((599)|(700)|(800)|(801))[-]*([0-9]{1}[0-9]{2}[-]*[0-9]{3}))$/,

            /**
             * Prefixes: 050, 052, 053, 054, 055, 057, 058
             * Optional dash after prefix
             *
             */
            "cellular": /^(05){1}[\d]{1}(-)*[2-9]{1}[\d]{6}$/,

            /**
             * Prefixes: 072, 073, 074, 076, 077, 078
             * Optional dash after prefix
             * Digit in the range of 2-9 and 6 more digits in the range of 0-9
             */
            "home_new": /^(07){1}((?!5)[2-8])(-)*[1-9]{1}[\d]{6}$/
        };

        for (let regex in phoneRegex) {
            if (phoneRegex[regex].test(phone)) {
                return true;
            }
        }

        return false;
    }

    /**
     * This method generates a random hex hash value.
     * 
     * @returns {string}
     */
    static getRandomHash() {
        const hashLength = 20;

        return crypto.randomBytes(hashLength).toString('hex');
    }

    /**
     * This method receives an object and an array of properties in the object and strips the strings
     * in the object from malicious XSS code.
     * 
     * @param {object} data 
     * @param {Array<string>} props The properties we want to filter.
     */
    static filterXSS(data, props) {
        for (let prop in props) {
            if (typeof data[prop] === "string") {
                data[prop] = xss(data[prop]);
            }
        }
    }

    /**
     * This method receives an object and information about its properties.
     * If any of the object properties doesn't fit the metadata inside propertiesInformation, the method returns
     * false and otherwise returns true.
     * 
     * @param {object} obj 
     * @param {object} propertiesInformation
     * @returns {Boolean}
     */
    static isObjectValid(obj, propertiesInformation) {
        if (Helper.isEmpty(obj) || typeof obj !== "object" || typeof propertiesInformation !== "object") {
            return false;
        }

        for (let property in propertiesInformation) {
            if (typeof obj[property] === "undefined") {
                return false;
            }

            if (propertiesInformation[property] == "int") {
                if (!Helper.isTrueInteger(obj[property])) {
                    return false;
                }
            }
            else if (propertiesInformation[property] == "string") {
                if (typeof obj[property] !== "string") {
                    return false;
                }
            }
            else if (propertiesInformation[property] != "any") {
                if (typeof obj[property] != propertiesInformation[property]) {
                    return false;
                }
            }
        }

        return true;
    }
}

module.exports = Helper;
