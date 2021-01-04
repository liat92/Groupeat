const ControllerHelper = require("./ControllerHelper.js");
const Restaurant = require("./../Restaurant.js");

/**
 * Class OrderController - Handles orders related requests.
 */
class OrderController {
    constructor(app, express) {
        this._app = app;
        this._express = express;
    }

    /**
     * This method initializes the orders related requests handlers.
     */
    start() {
        // This request receives userToken, addressCompanyId, addressKey, order, totalAmount (the order's total amount),
        // restaurantId and shoppingCartGuid and adds a new order in Groupeat for the user to the given restaurant.
        this._app.post("/order/addOrder", (request, response) => {
            this.handleOrderRequest("/order/addOrder", request, response);
        });

        // This request receives userToken, addressCompanyId, addressKey, order, totalAmount (the order's total amount),
        // restaurantId and shoppingCartGuid and updates an existing order in Groupeat for the user to the given restaurant.
        this._app.post("/order/updateOrder", (request, response) => {
            this.handleOrderRequest("/order/updateOrder", request, response);
        });

        // This request receives userToken, addressCompanyId, addressKey and restaurantId and dateAdded, and cancels 
        // an existing order in Groupeat for the user in the given restaurant.
        this._app.post("/order/cancelOrder", (request, response) => {
            this.handleOrderRequest("/order/cancelOrder", request, response);
        });

        // This request is similar to cancelOrder, but also completely removes it from the orders that are displayed to the user.
        // This request also requires the dateAdded parameter so it knows which order it should delete.
        this._app.post("/order/removeOrder", (request, response) => {
            this.handleOrderRequest("/order/removeOrder", request, response);
        });

        // This request receives userToken, addressCompanyId, addressKey and restaurantId and marks an existing order
        // in Groupeat for the user in the given restaurant as paid.
        this._app.post("/order/payOrder", (request, response) => {
            this.handleOrderRequest("/order/payOrder", request, response);
        });
    }

    /**
     * This method handles the above orders requests according to their requestPath.
     * 
     * @param {string} requestPath 
     * @param {object} request 
     * @param {object} response 
     */
    handleOrderRequest(requestPath, request, response) {
        if (!ControllerHelper.requestValidation(request, response)) {
            return;
        }

        const params = ControllerHelper.getKnownRequestParameters(request);
        let user, office;
        const restaurant = new Restaurant();

        const promise = ControllerHelper.authenticateUserAndOffice(params["userToken"], params["addressCompanyId"], params["addressKey"], params["testUserId"])
        .then(authenticated => {
            user = authenticated["user"];
            office = authenticated["office"];

            return restaurant.initInstance(office, params["restaurantId"]);
        })
        .then(() => {
            switch (requestPath) {
                case "/order/addOrder":
                    return restaurant.addOrder(user, office, params["order"], params["totalAmount"], params["shoppingCartGuid"], params["billingLines"]);
                case "/order/updateOrder":
                    return restaurant.updateOrder(user, office, params["order"], params["totalAmount"], params["shoppingCartGuid"], params["billingLines"]);
                case "/order/cancelOrder":
                    return restaurant.cancelOrder(user, false);
                case "/order/removeOrder":
                    return restaurant.removeOrder(user, params["dateAdded"]);
                case "/order/payOrder":
                    return restaurant.payOrder(user);
            }
        });

        ControllerHelper.responseHandler(response, promise, "result", () => {
            return true;
        });
    }
}

module.exports = OrderController;
