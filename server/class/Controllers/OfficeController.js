const ControllerHelper = require("./../Controllers/ControllerHelper.js");
const Office = require("./../Office.js");
const User = require("./../User.js");
const Restaurant = require("./../Restaurant.js");

const UserNotExistsError = require("./../Errors/UserNotExistsError.js");

/**
 * Class OfficeController - Handles office related requests.
 */
class OfficeController {
    constructor(app, express) {
        this._app = app;
        this._express = express;
    }

    /**
     * This method initializes the office related requests handlers.
     */
    start() {
        // This request receives userToken, addressCompanyId and addressKey and returns whether the office
        // with the given details exists or not.
        this._app.post("/office/officeExists", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);
            const promise = User.userExists(params["userToken"])
            .then(result => {
                if (!result) {
                    throw new UserNotExistsError("The user with userToken = " + params["userToken"] + " does not exist.", request);
                }

                return Office.officeExists(params["addressCompanyId"], params["addressKey"]);
            });

            ControllerHelper.responseHandler(response, promise, "result");
        });

        // This request receives userToken, addressCompanyId and addressKey and registers a new office in
        // Groupeat's servers.
        this._app.post("/office/registerOffice", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);
            const promise = User.userExists(params["userToken"])
            .then(result => {
                if (!result) {
                    throw new UserNotExistsError("The user with userToken = " + params["userToken"] + " does not exist.", request);
                }

                return Office.createOffice(params["addressCompanyId"], params["addressKey"])
            });

            ControllerHelper.responseHandler(response, promise, "result", () => {
                return true;
            });
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey
        // and returns the group orders for the relevant office.
        this._app.post("/office/getGroupOrders", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);
            const promise = ControllerHelper.authenticateUserAndOffice(params["userToken"], params["addressCompanyId"], params["addressKey"], params["testUserId"])
            .then(authenticated => {
                let office = authenticated["office"];

                return Restaurant.getTodayOfficeOrders(office);
            });

            ControllerHelper.responseHandler(response, promise, "result", todayGroupOrders => {
                // Removing the "orders" field from each group order because it should not be given to the users.
                // The users do not need to know the exact orders.
                for (let i = 0; i < todayGroupOrders.length; i++) {
                    delete todayGroupOrders[i]["orders"];
                }

                return todayGroupOrders;
            });
        });
    }
}

module.exports = OfficeController;