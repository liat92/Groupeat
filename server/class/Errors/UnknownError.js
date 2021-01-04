const GroupeatError = require("./GroupeatError.js");

// Constants
const ERROR_ID = 4;

class UnknownError extends GroupeatError {
    constructor(message, details) {
        super(message, "UnknownError", details);
        this.errorID = ERROR_ID;

        this.logError();
    }

    static getErrorID() {
        return ERROR_ID;
    }
}

module.exports = UnknownError;
