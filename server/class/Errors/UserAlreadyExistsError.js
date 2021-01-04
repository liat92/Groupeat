const AlreadyExistsError = require("./AlreadyExistsError.js");

class UserAlreadyExistsError extends AlreadyExistsError {
    constructor(message, details) {
        super(message, details);
        this.name = "UserAlreadyExistsError";
    }
}

module.exports = UserAlreadyExistsError;
