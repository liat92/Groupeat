const DB = require("./../Database/DB.js");
const GroupeatDate = require("./../General/GroupeatDate.js");

// Constants
const COLLECTION_NAME = "logs";

/**
 * Class Logger - Handles logging information in the database.
 */
class Logger {
    /**
     * This method logs new information in the database.
     * 
     * @param {string} name The title of the information that will be logged in the database.
     * @param {object} details The information to be logged, for example errors and etc...
     * @returns {Promise<void>}
     */
    static async log(name, details) {
        const insertData = {
            "name": name,
            "details": details,
            "time": new Date(new GroupeatDate().toISOString())
        };

        await DB.insertData(insertData, ["name", "details", "time"], COLLECTION_NAME);
    }
}

module.exports = Logger;
