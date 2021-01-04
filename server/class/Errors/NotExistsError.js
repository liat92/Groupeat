const GroupeatError = require("./GroupeatError.js");

// Constants
const ERROR_ID = 3;

class NotExistsError extends GroupeatError {
    constructor(message, details) {
        super(message, "NotExistsError", details);
        this.errorID = ERROR_ID;

        this.logError();
    }

    static getErrorID() {
        return ERROR_ID;
    }
}

module.exports = NotExistsError;
