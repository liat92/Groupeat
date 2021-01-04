const UserController = require("./UserController.js");
const OfficeController = require("./OfficeController.js");
const OrderController = require("./OrderController.js");
const RestaurantController = require("./RestaurantController.js");

/**
 * Class Controller - Handles requests.
 */
class Controller {
    constructor(app, express) {
        this._controllers = [];

        this._controllers.push(new UserController(app, express));
        this._controllers.push(new OfficeController(app, express));
        this._controllers.push(new OrderController(app, express));
        this._controllers.push(new RestaurantController(app, express));
    }

    /**
     * This method initializes the sub controllers.
     */
    start() {
        for (let contr in this._controllers) {
            this._controllers[contr].start();
        }
    }
}

module.exports = Controller;