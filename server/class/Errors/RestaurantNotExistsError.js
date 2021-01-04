const NotExistsError = require("./NotExistsError.js");

class RestaurantNotExistsError extends NotExistsError {
    constructor(message, details) {
        super(message, details);
        this.name = "RestaurantNotExistsError";
    }
}

module.exports = RestaurantNotExistsError;
