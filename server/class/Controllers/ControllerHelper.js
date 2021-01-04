const User = require("./../User.js");
const Office = require("./../Office.js");
const Helper = require("./../General/Helper.js");

const NotExistsError = require("./../Errors/NotExistsError.js");
const UnknownError = require("./../Errors/UnknownError.js");

/**
 * Class ControllerHelper - Contains some useful functions that all (or most) controllers share in common.
 */
class ControllerHelper {
    /**
     * This method receives userToken, addressCompanyId, addressKey and optional testUserId, validates the details
     * and returns a user and office objects which belong to the User and Office classes.
     * 
     * @param {string} userToken 
     * @param {string} addressCompanyId 
     * @param {string} addressKey 
     * @param {string} testUserId (optional)
     * @returns {Promise<object>}
     */
    static async authenticateUserAndOffice(userToken, addressCompanyId, addressKey, testUserId) {
        const user = await ControllerHelper.authenticateUser(userToken, testUserId);
        const office = await ControllerHelper.authenticateOffice(addressCompanyId, addressKey);
        const userInOffice = await office.isUserInOffice(user);

        if (!userInOffice) {
            throw new NotExistsError("Could not authenticate user and office.", {
                "userToken": userToken,
                "addressCompanyId": addressCompanyId,
                "addressKey": addressKey,
                "testUserId": testUserId
            });
        }

        return {
            "user": user,
            "office": office
        };
    }

    /**
     * This method receives userToken and optional testUserId, validates the details
     * and returns a user object which belongs to the User class.
     * 
     * @param {string} userToken 
     * @param {string} testUserId (optional)
     * @returns {Promise<User>}
     */
    static async authenticateUser(userToken, testUserId) {
        const user = new User();

        if (!Helper.isEmpty(testUserId)) {
            await user.initInstanceByTestUserId(testUserId);
        }
        else {
            await user.initInstanceByUserToken(userToken);
        }

        return user;
    }

    /**
     * This method receives addressCompanyId and addressKey, validates the details
     * and returns an office object which belongs to the Office class.
     * 
     * @param {string} addressCompanyId 
     * @param {string} addressKey 
     * @returns {Promise<Office>}
     */
    static async authenticateOffice(addressCompanyId, addressKey) {
        const office = new Office();

        await office.initInstanceByAddress(addressCompanyId, addressKey);

        return office;
    }

    /**
     * This method handles the response of a request.
     * The promise is the promise that we wait for its completion.
     * The resultField is the field that contains the result that is given from the promise.
     * The preProcessValueFunc is a function that processes the result before returning it to the client.
     * 
     * @param {object} response 
     * @param {Promise} promise 
     * @param {string} resultField 
     * @param {function} preProcessValueFunc 
     */
    static responseHandler(response, promise, resultField, preProcessValueFunc) {
        promise.then(result => {
            if (typeof preProcessValueFunc === "function") {
                result = preProcessValueFunc(result);
            }

            const resp = {};

            resp[resultField] = result;
            response.status(200).json(resp);
        })
        .catch(err => {
            if (typeof err.getErrorID === "function") {
                response.status(400).json({"error": err.getErrorID()});
                console.log(err);
            }
            else{
                response.status(500).json({"error": new UnknownError("An unknown error was occurred.", err).getErrorID()});
                console.log(err);
            }
        });
    }

    /**
     * This method validates the request.
     * If the request is invalid, the method updates the response and returns false.
     * 
     * @param {object} request 
     * @param {object} response 
     * @returns {Boolean}
     */
    static requestValidation(request, response) {
        if (!Helper.isAjaxRequest(request)) {
            response.status(404).json({"error": UnknownError.getErrorID()});
            return false;
        }

        return true;
    }

    /**
     * This method receives a request and returns the parameters that the server knows about.
     * This is done for both security reasons and to avoid code duplication.
     * 
     * @param {object} request 
     * @returns {object}
     */
    static getKnownRequestParameters(request) {
        const parameters = {};
        const knownParams = ["userToken", "testUserId", "addressCompanyId", "addressKey", "restaurantId", "order", "billingLines",
                             "totalAmount", "shoppingCartGuid", "dateAdded", "restaurants", "fullName", "cellphone", "email",
                             "password", "fcmId", "step"];

        for (let i = 0; i < knownParams.length; i++) {
            const currentParameter = knownParams[i];

            if (typeof request.body[currentParameter] !== "undefined") {
                parameters[currentParameter] = request.body[currentParameter];
            }
        }

        return parameters;
    }
}

module.exports = ControllerHelper;