class AlreadyExistsError extends Error {
    constructor(message) {
        super(message);
        this.name = "AlreadyExistsError";
        this.errorID = AlreadyExistsError.ERROR_ID;
    }

    getErrorID() {
        return AlreadyExistsError.ERROR_ID;
    }
}

// Constants
AlreadyExistsError.ERROR_ID = 1;