const NotExistsError = require("./NotExistsError.js");

class OfficeNotExistsError extends NotExistsError {
    constructor(message, details) {
        super(message, details);
        this.name = "OfficeNotExistsError";
    }
}

module.exports = OfficeNotExistsError;
