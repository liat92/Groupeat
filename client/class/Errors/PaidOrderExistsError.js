class PaidOrderExistsError extends Error {
    constructor(message, details) {
        super(message, "PaidOrderExistsError", details);
        this.errorID = PaidOrderExistsError.ERROR_ID;
    }

    getErrorID() {
        return AlreadyExistsError.ERROR_ID;
    }
}

// Constants
PaidOrderExistsError.ERROR_ID = 5;