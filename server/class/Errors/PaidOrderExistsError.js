const GroupeatError = require("./GroupeatError.js");

// Constants
const ERROR_ID = 5;

class PaidOrderExistsError extends GroupeatError {
    constructor(message, details) {
        super(message, "PaidOrderExistsError", details);
        this.errorID = ERROR_ID;
    }
}

module.exports = PaidOrderExistsError;