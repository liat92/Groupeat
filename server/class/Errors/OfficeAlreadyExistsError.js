const AlreadyExistsError = require("./AlreadyExistsError.js");

class OfficeAlreadyExistsError extends AlreadyExistsError {
    constructor(message, details) {
        super(message, details);
        this.name = "OfficeAlreadyExistsError";
    }
}

module.exports = OfficeAlreadyExistsError;
