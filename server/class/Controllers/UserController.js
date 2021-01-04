const ControllerHelper = require("./ControllerHelper.js");
const Helper = require("./../General/Helper.js");
const User = require("./../User.js");
const Restaurant = require("./../Restaurant.js");

// Constants
const TESTING_PASSWORD = "dfkjg457thsjnzmncvsidh8e47y534";

/**
 * Class UserController - Handles user related requests.
 */
class UserController {
    constructor(app, express) {
        this._app = app;
        this._express = express;
    }

    /**
     * This method initializes the user related requests handlers.
     */
    start() {
        // This request receives a userToken and returns whether the user exists or not.
        this._app.post("/user/userExists", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);
            const promise = User.userExists(params["userToken"]);

            ControllerHelper.responseHandler(response, promise, "result");
        });

        // This request receives a userToken, fullName, cellphone, email and password and registers a new user in Groupeat.
        this._app.post("/user/registerUser", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);

            // If we're given a password, it means we want to create a test user.
            if (!Helper.isEmpty(params["password"]) && params["password"] != TESTING_PASSWORD) {
                response.status(400).json({"error": "invalid testing password."});
                return;
            }

            const promise = User.createUser(params["userToken"], params["fullName"], params["cellphone"], params["email"], params["password"]);

            ControllerHelper.responseHandler(response, promise, "result", testUserId => {
                if (!Helper.isEmpty(testUserId)) {
                    return testUserId;
                }

                return true;
            });
        });

        // This request receives a userToken, testUserId (optional), addressCompanyId and addressKey and returns
        // whether the user is related to the relevant office or not.
        this._app.post("/user/userRelatedToOffice", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);
            let user;

            const promise = ControllerHelper.authenticateUser(params["userToken"], params["testUserId"])
            .then(authenticatedUser => {
                user = authenticatedUser;

                return ControllerHelper.authenticateOffice(params["addressCompanyId"], params["addressKey"]);
            })
            .then(authenticatedOffice => {
                return authenticatedOffice.isUserInOffice(user);
            });

            ControllerHelper.responseHandler(response, promise, "result");
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and registers
        // the user in the relevant office.
        this._app.post("/user/addUserToOffice", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);
            let user;

            const promise = ControllerHelper.authenticateUser(params["userToken"], params["testUserId"])
            .then(authenticatedUser => {
                user = authenticatedUser;

                return ControllerHelper.authenticateOffice(params["addressCompanyId"], params["addressKey"]);
            })
            .then(authenticatedOffice => {
                return authenticatedOffice.addUser(user);
            });

            ControllerHelper.responseHandler(response, promise, "result", () => {
                return true;
            });
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and returns the user's orders
        // from all time.
        this._app.post("/user/getAllOrders", (request, response) => {
            this.basicUserRequestHandler("/user/getAllOrders", request, response, "orders");
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and returns the user's orders
        // for the current day.
        this._app.post("/user/getTodayOrders", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);
            let todayUserOrders, office;

            const promise = ControllerHelper.authenticateUserAndOffice(params["userToken"], params["addressCompanyId"], params["addressKey"], params["testUserId"])
            .then(authenticated => {
                const user = authenticated["user"];

                office = authenticated["office"];

                return Restaurant.getTodayUserOrders(user);
            })
            .then(userOrders => {
                todayUserOrders = userOrders;

                return Restaurant.getTodayOfficeOrders(office);
            })
            .then(officeOrders => {
                // Adding the group order sums to the user's orders.
                for (let i = 0; i < todayUserOrders.length; i++) {
                    const userOrder = todayUserOrders[i];

                    for (let j = 0; j < officeOrders.length; j++) {
                        const officeOrder = officeOrders[j];

                        if (userOrder["restaurantId"] == officeOrder["restaurantId"]) {
                            userOrder["groupOrderSum"] = officeOrder["groupOrderSum"];
                        }
                    }

                    delete userOrder["user"];
                }

                return todayUserOrders;
            });

            ControllerHelper.responseHandler(response, promise, "result");
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and returns the user's paid
        // order for the current day.
        this._app.post("/user/getTodayPaidOrder", (request, response) => {
            this.basicUserRequestHandler("/user/getTodayPaidOrder", request, response, "result");
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and resets the user's data
        // by removing all notifications and orders the user has made.
        this._app.post("/user/resetUser", (request, response) => {
            this.basicUserRequestHandler("/user/resetUser", request, response, "result", () => {
                return true;
            });
        });

        // This request receives userToken, testUserId (optional) and fcmId and update's the user's fcmId in Groupeat's database
        // so we know where we should send the notifications to.
        this._app.post("/user/updateFCM", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);

            const promise = ControllerHelper.authenticateUser(params["userToken"], params["testUserId"])
            .then(authenticatedUser => {
                return authenticatedUser.updateFCM(params["fcmId"]);
            });

            ControllerHelper.responseHandler(response, promise, "result");
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and cancel's the user's
        // unpaid orders for the current day.
        this._app.post("/user/cancelTodayUnpaidOrders", (request, response) => {
            this.basicUserRequestHandler("/user/cancelTodayUnpaidOrders", request, response, "result", () => {
                return true;
            });
        });

        // This request receives userToken, testUserId (optional), addressCompanyId, addressKey and step and returns the user's
        // notifications according to the given step.
        this._app.post("/user/getNotifications", (request, response) => {
            this.basicUserRequestHandler("/user/getNotifications", request, response, "result");
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and returns the user's unread
        // notifications.
        this._app.post("/user/getUnreadNotifications", (request, response) => {
            this.basicUserRequestHandler("/user/getUnreadNotifications", request, response, "result");
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and marks the user's
        // notifications as read.
        this._app.post("/user/markNotificationsAsRead", (request, response) => {
            this.basicUserRequestHandler("/user/markNotificationsAsRead", request, response, "result", () => {
                return true;
            });
        });

        // This request receives userToken, testUserId (optional), addressCompanyId, addressKey and dateAdded and removes
        // a user's notification according to the dateAdded parameter.
        this._app.post("/user/removeNotification", (request, response) => {
            this.basicUserRequestHandler("/user/removeNotification", request, response, "result", () => {
                return true;
            });
        });

        // This request receives userToken, testUserId (optional), addressCompanyId and addressKey and returns whether the user
        // can make a new order or not.
        this._app.post("/user/canMakeNewOrder", (request, response) => {
            this.basicUserRequestHandler("/user/canMakeNewOrder", request, response, "result");
        });

        // This requests receives a userToken and updates when was the last time the user was seen in the database.
        this._app.post("/user/pingUpdate", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);

            const promise = ControllerHelper.authenticateUser(params["userToken"], params["testUserId"])
            .then(authenticatedUser => {
                return authenticatedUser.updatePingTime();
            });

            ControllerHelper.responseHandler(response, promise, "result");
        });
    }

    /**
     * This method handles the above user requests according to their requestPath.
     * 
     * @param {string} requestPath 
     * @param {object} request 
     * @param {object} response 
     * @param {string} resultField 
     * @param {function} preProcessValueFunc 
     */
    basicUserRequestHandler(requestPath, request, response, resultField, preProcessValueFunc) {
        if (!ControllerHelper.requestValidation(request, response)) {
            return;
        }
        
        const params = ControllerHelper.getKnownRequestParameters(request);

        let step = parseInt(params["step"]);

        if (isNaN(step) || step < 0) {
            step = 0;
        }

        const promise = ControllerHelper.authenticateUserAndOffice(params["userToken"], params["addressCompanyId"], params["addressKey"], params["testUserId"])
        .then(authenticated => {
            const user = authenticated["user"];
            const office = authenticated["office"];

            switch(requestPath) {
                case "/user/getAllOrders":
                    return Restaurant.getAllUserOrders(user, office, UserController.ORDERS_PER_REQUEST_LIMIT, step * UserController.ORDERS_PER_REQUEST_LIMIT);
                case "/user/getTodayPaidOrder":
                    return Restaurant.getTodayUserPaidOrder(user);
                case "/user/cancelTodayUnpaidOrders":
                    return Restaurant.cancelTodayUnpaidOrders(user);
                case "/user/getNotifications":
                    return user.getNotifications(UserController.NOTIFICATIONS_PER_REQUEST_LIMIT, step * UserController.NOTIFICATIONS_PER_REQUEST_LIMIT);
                case "/user/getUnreadNotifications":
                    return user.getUnreadNotifications();
                case "/user/markNotificationsAsRead":
                    return user.markNotificationsAsRead();
                case "/user/removeNotification":
                    return user.removeNotification(params["dateAdded"]);
                case "/user/canMakeNewOrder":
                    return Restaurant.canUserMakeNewOrder(user);
                case "/user/resetUser":
                    return Restaurant.removeAllUserOrders(user)
                    .then(() => {
                        return user.removeAllNotifications();
                    });
            }
        });

        ControllerHelper.responseHandler(response, promise, resultField, preProcessValueFunc);
    }
}

UserController.NOTIFICATIONS_PER_REQUEST_LIMIT = 10;
UserController.ORDERS_PER_REQUEST_LIMIT = 20;

module.exports = UserController;
