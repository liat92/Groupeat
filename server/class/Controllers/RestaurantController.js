const ControllerHelper = require("./ControllerHelper.js");
const Helper = require("./../General/Helper.js");
const Restaurant = require("./../Restaurant.js");

/**
 * Class RestaurantController - Handles restaurant related requests.
 */
class RestaurantController {
    constructor(app, express) {
        this._app = app;
        this._express = express;
    }

    /**
     * This method initializes the restaurant related requests handlers.
     */
    start() {
        // This request receives userToken, addressCompanyId, addressKey and restaurantId and returns the user's order
        // in the relevant restaurant if the order exists.
        this._app.post("/restaurant/getUserOrder", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const promise = this.getTodayUserOrder(request);

            ControllerHelper.responseHandler(response, promise, "order", todayUserOrder => {
                if (!Helper.isEmpty(todayUserOrder)) {
                    return todayUserOrder[0];
                }
                else {
                    return null;
                }
            });
        });

        // This request receives userToken, addressCompanyId, addressKey and restaurantId and returns whether the
        // user has an order in the relevant restaurant.
        this._app.post("/restaurant/userOrderExists", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const promise = this.getTodayUserOrder(request);

            ControllerHelper.responseHandler(response, promise, "result", order => {
                return !Helper.isEmpty(order);
            });
        });

        // This request receives metadata of the restaurants in 10bis (such as pooledSum, restaurantName, etc...) and
        // updates Groupeat's database accordingly.
        this._app.post("/restaurant/updateRestaurantsMetadata", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);

            const promise = ControllerHelper.authenticateUserAndOffice(params["userToken"], params["addressCompanyId"], params["addressKey"], params["testUserId"])
            .then(authenticated => {
                const office = authenticated["office"];

                return Restaurant.updateRestaurantsMetadata(office, params["restaurants"]);
            });

            ControllerHelper.responseHandler(response, promise, "result", () => {
                return true;
            });
        });

        // This request receives userToken, addressCompanyId, addressKey and restaurantId and returns main details
        // about the relevant restaurant.
        this._app.post("/restaurant/getRestaurantDetails", (request, response) => {
            if (!ControllerHelper.requestValidation(request, response)) {
                return;
            }

            const params = ControllerHelper.getKnownRequestParameters(request);
            const restaurant = new Restaurant();

            const promise = ControllerHelper.authenticateUserAndOffice(params["userToken"], params["addressCompanyId"], params["addressKey"], params["testUserId"])
            .then(authenticated => {
                const office = authenticated["office"];

                return restaurant.initInstance(office, params["restaurantId"], false);
            })
            .then(() => {
                return restaurant.getBasicRestaurantDataObject();
            });

            ControllerHelper.responseHandler(response, promise, "result");
        });
    }

    /**
     * This method receives a request object which has userToken, testUserId (optional), addressCompanyId, addressKey
     * and restaurantId and returns the current user's order for the given restaurantId.
     * 
     * @param {object} request
     * @returns {Promise<Array>}
     */
    async getTodayUserOrder(request) {
        const params = ControllerHelper.getKnownRequestParameters(request);
        const authenticated = await ControllerHelper.authenticateUserAndOffice(params["userToken"], params["addressCompanyId"], params["addressKey"], params["testUserId"]);
        const restaurant = new Restaurant();

        await restaurant.initInstance(authenticated["office"], params["restaurantId"]);

        return await restaurant.getTodayUserOrder(authenticated["user"]);
    }
}

module.exports = RestaurantController;
