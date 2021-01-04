const Helper = require("./../General/Helper.js");
const MongoClient = require("mongodb").MongoClient;

// Constants
const DB_NAME = "groupeat";
const DB_URL = "mongodb://localhost:27017/";

class DB {
    /**
     * This method connects to the database.
     */
    async connect() {
        const client = await MongoClient.connect(DB_URL, { useNewUrlParser: true });

        this._db = client.db(DB_NAME);
    }

    /**
     * This method returns a collection according to its name.
     * 
     * @param {string} collectionName
     * @returns {Collection<>}
     */
    getCollection(collectionName) {
        return this._db.collection(collectionName);
    }

    get db() {
        return this._db;
    }

    /**
     * This method receives a selection query parameters and returns its result.
     * 
     * @param {string} collectionName 
     * @param {object} where 
     * @param {object} selectFields 
     * @param {object} sortBy 
     * @returns {Promise<Array>}
     */
    async getData(collectionName, where, selectFields, sortBy) {
        if (Helper.isEmpty(collectionName)){
            return [];
        }

        if (Helper.isEmpty(where) || typeof where !== "object"){
            where = {};
        }

        if (Helper.isEmpty(sortBy) || typeof sortBy !== "object"){
            sortBy = {};
        }

        if (Helper.isEmpty(selectFields)) {
            selectFields = {};
        }

        const data = [];
        const cursor = this._db.collection(collectionName).find(where).project(selectFields).sort(sortBy);

        while (await cursor.hasNext()) {
            const doc = await cursor.next();

            data.push(doc);
        }

        return data;
    }

    /**
     * This method receives a MongoDB aggregation query and returns its result.
     * 
     * @param {string} collectionName 
     * @param  {...object|Array} aggregations 
     * @returns {Promise<Array>}
     */
    async aggregate(collectionName, ...aggregations) {
        if (!aggregations.length) {
            return [];
        }

        // If we get an array for the aggregations parameter, then we should use its first value.
        if (Array.isArray(aggregations[0])) {
            aggregations = aggregations[0];
        }

        if (!aggregations.length) {
            return [];
        }
        
        const data = [];
        const cursor = this._db.collection(collectionName).aggregate(aggregations);

        while (await cursor.hasNext()) {
            const doc = await cursor.next();

            data.push(doc);
        }

        return data;
    }

    /**
     * This method receives data, insertFields and collectionName and inserts data into collectionName,
     * but only items that are given in insertFields.
     * 
     * @param {object} data 
     * @param {Array<string>} insertFields 
     * @param {string} collectionName 
     * @returns {Promise<Boolean|object} Returns true if everything is okay, error object otherwise.
     */
    async insertData(data, insertFields, collectionName){
        if (typeof data !== "object" || !Helper.objectLength(data)) {
            return false;
        }

        const insert = {};

        for (let i = 0; i < insertFields.length; i++) {
            if (!data.hasOwnProperty(insertFields[i])) {
                continue;
            }

            insert[insertFields[i]] = data[insertFields[i]];
        }

        if (Helper.isEmpty(insert)) {
            return false;
        }

        return await new Promise((resolve, reject) => {
            this._db.collection(collectionName).insertOne(insert, function(err, result){
                if (Helper.isEmpty(err)) {
                    resolve(true);
                }
                else {
                    reject(err);
                    console.log(err);
                }
            });
        });
    }

    /**
     * This method works like updateData but limits the update only to one object - the given id parameter.
     * 
     * @param {string} collectionName 
     * @param {object} data 
     * @param {Array<string>} updateFields 
     * @param {ObjectID} id 
     * @returns {Promise<Boolean|object} Returns true if everything is okay, error object otherwise.
     */
    async updateOne(collectionName, data, updateFields, id){
        if (Helper.isEmpty(id)) {
            return false;
        }

        return await this.updateData(collectionName, data, updateFields, {"_id": id});
    };

    /**
     * This method receives data, updateFields, collectionName and where and updates the data in collectionName,
     * but only items that are given in updateFields according to the where parameter.
     * 
     * @param {string} collectionName 
     * @param {object} data 
     * @param {Array<string>} updateFields 
     * @param {object} where 
     * @returns {Promise<Boolean|object} Returns true if everything is okay, error object otherwise.
     */
    async updateData(collectionName, data, updateFields, where) {
        const updateData = {};

        for (let i = 0; i < updateFields.length; i++) {
            if (!data.hasOwnProperty(updateFields[i]) || Helper.isEmpty(updateFields[i])) {
                continue;
            }

            updateData[updateFields[i]] = data[updateFields[i]];
        }

        if (Helper.isEmpty(updateData)) {
            return false;
        }

        return await new Promise((resolve, reject) => {
            this._db.collection(collectionName).updateMany(where, {$set: updateData}, (err, res) => {
                if (Helper.isEmpty(err)){
                    resolve(res);
                }
                else{
                    reject(err);
                    console.log(err);
                }
            });
        });
    }

    /**
     * This methods pushes given data to an array which is a part of an object in a given collectionName and that
     * follows the 'where' conditions.
     * 
     * @param {string} collectionName 
     * @param {string} arrayName 
     * @param {object} dataToPush 
     * @param {ObjectID} id 
     * @param {object} where 
     * @param {Integer|null} position The position that the data should be pushed to.
     * @returns {Promise<Boolean|object} Returns true if everything is okay, error object otherwise.
     */
    async pushDataToArray(collectionName, arrayName, dataToPush, id, where, position) {
        if (Helper.isEmpty(id) && Helper.isEmpty(where)) {
            if (Helper.isEmpty(where)) {
                return false;
            }
        }

        if (Helper.isEmpty(collectionName) || Helper.isEmpty(arrayName)) {
            return false;
        }

        if (Helper.isEmpty(where)) {
            where = {
                "_id": id
            };
        }
        else if (typeof where !== "object") {
            return false;
        }
        else if (!Helper.isEmpty(id)) {
            where["_id"] = id;
        }

        const updateData = {
            "$push": {}
        };

        updateData["$push"][arrayName] = dataToPush;
        
        if (!isNaN(parseInt(position))) {
            updateData["$push"][arrayName] = {};
            updateData["$push"][arrayName]["$each"] = [dataToPush];
            updateData["$push"][arrayName]["$position"] = parseInt(position);
        }

        return await new Promise((resolve, reject) => {
            this._db.collection(collectionName).updateMany(where, updateData, (err, res) => {
                if (Helper.isEmpty(err)) {
                    resolve(res);
                }
                else {
                    reject(err);
                    console.log(err);
                }
            });
        });
    }

    /**
     * This method removes an array item from a specific object (according to its id) in a collectionName
     * that meet specific criteria (that is specified in a where object).
     * 
     * @param {string} collectionName 
     * @param {string} arrayName 
     * @param {object} where 
     * @param {ObjectID} id
     * @returns {Promise<Boolean|object} Returns true if everything is okay, error object otherwise.
     */
    async removeArrayItem(collectionName, arrayName, where, id) {
        if (Helper.isEmpty(id)) {
            return false;
        }

        if (Helper.isEmpty(collectionName) || Helper.isEmpty(arrayName)) {
            return false;
        }

        const updateData = {};

        updateData["$pull"][arrayName] = where;

        return await new Promise((resolve, reject) => {
            this._db.collection(collectionName).updateOne({"_id": id}, updateData, (err, res) => {
                if (Helper.isEmpty(err)) {
                    resolve(res);
                }
                else{
                    reject(err);
                    console.log(err);
                }
            });
        });
    }

    /**
     * This method updates array items in collectionName that meet the specific conditions.
     * The objects that are chosen for the update are specified in the where object.
     * 
     * @param {string} collectionName 
     * @param {string} arrayName 
     * @param {object} where 
     * @param {object} updateData 
     * @param {object} conditions 
     * @returns {Promise<void>}
     */
    async updateArrayItems(collectionName, arrayName, where, updateData, conditions) {
        if (Helper.isEmpty(collectionName) || Helper.isEmpty(arrayName) || Helper.isEmpty(where) || Helper.isEmpty(updateData)) {
            return false;
        }

        if (Helper.isEmpty(conditions) || typeof conditions !== "object") {
            conditions = {};
        }

        const selectFields = {};

        selectFields[arrayName] = 1;

        const objectsToUpdate = await this.getData(collectionName, where, selectFields);

        for (let i = 0; i < objectsToUpdate.length; i++) {
            const itemsToUpdate = objectsToUpdate[i][arrayName]; // This is the array items that we want to update.

            // Updating the where to include the _id so we don't accidently update other objects.
            where["_id"] = objectsToUpdate[i]["_id"];

            for (let j = 0; j < itemsToUpdate.length; j++) {
                // Making sure that the array item that we're about to update is not empty.
                if (Helper.isEmpty(itemsToUpdate[j])) {
                    continue;
                }

                let shouldContinue = false;

                // Validating that the current array item meets the required conditions.
                for (let condition in conditions) {
                    if (typeof itemsToUpdate[j] === "undefined" || itemsToUpdate[j][condition].toString() != conditions[condition].toString()) {
                        shouldContinue = true;
                        break;
                    }
                }

                if (shouldContinue) {
                    continue;
                }

                const newUpdateData = {};
                const keysToUpdate = [];

                // Building the data object that we want to update and the object's keys.
                for (let key in updateData) {
                    const keyToUpdate = arrayName + "." + j + "." + key;

                    newUpdateData[keyToUpdate] = updateData[key];
                    keysToUpdate.push(keyToUpdate);
                }

                await this.updateData(collectionName, newUpdateData, keysToUpdate, where);
            }
        }
    }

    /**
     * Finds an object in the database according to the where parameter and initiates its class instance.
     * 
     * @param {object} inst 
     * @param {string} collectionName 
     * @param {object} where 
     * @param {object} selectFields 
     * @returns {Promise<object>} The instance that was initiated.
     */
    async initInstanceByID(inst, collectionName, where, selectFields) {
        const data = await this.getData(collectionName, where, selectFields);

        if (!Helper.isEmpty(data)) {
            Helper.initInstanceWithDoc(inst, data[0]);
        }

        return inst;
    }
}

module.exports = new DB();
