const Logger = require("./../General/Logger.js");

class GroupeatError extends Error {
    constructor(message, name, details) {
        super(message);
        this._details = details;
        this.name = name;
    }

    logError() {
        Logger.log(this.name, {
            "message": this.message,
            "details": this._details
        });
    }

    getErrorID() {
        return this.errorID;
    }
}

module.exports = GroupeatError;
