const GroupeatError = require("./GroupeatError.js");

// Constants
const ERROR_ID = 2;

class InvalidInputError extends GroupeatError {
    constructor(message, details) {
        super(message, "InvalidInputError", details);
        this.errorID = ERROR_ID;

        this.logError();
    }

    static getErrorID() {
        return ERROR_ID;
    }
}

module.exports = InvalidInputError;
