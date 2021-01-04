const NotExistsError = require("./NotExistsError.js");

class UserNotExistsError extends NotExistsError {
    constructor(message, details) {
        super(message, details);
        this.name = "UserNotExistsError";
    }
}

module.exports = UserNotExistsError;
