const GroupeatError = require("./GroupeatError.js");

// Constants
const ERROR_ID = 1;

class AlreadyExistsError extends GroupeatError {
    constructor(message, details) {
        super(message, "AlreadyExistsError", details);
        this.errorID = ERROR_ID;

        this.logError();
    }

    static getErrorID() {
        return ERROR_ID;
    }
}

module.exports = AlreadyExistsError;
