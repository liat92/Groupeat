const DB = require("./Database/DB.js");
const Helper = require("./General/Helper.js");
const Notification = require("./General/Notification.js");
const GroupeatDate = require("./General/GroupeatDate.js");
const User = require("./User.js");

const PaidOrderExistsError = require("./Errors/PaidOrderExistsError.js");
const AlreadyExistsError = require("./Errors/AlreadyExistsError.js");
const InvalidInputError = require("./Errors/InvalidInputError.js");
const RestaurantNotExistsError = require("./Errors/RestaurantNotExistsError.js");

// Constants
const COLLECTION_NAME = "restaurants";
const ALLOW_PAID_ORDERS_UPDATE = true; // When set to true, the user is allowed to update and delete paid orders.
const ORDERS_PER_DAY_THRESHOLD = 2;
const USERS_SEEN_RECENTLY_MAXIMUM_TIME_TO_ANSWER = 20 * 1000; // 20 seconds
const USERS_SEEN_RECENTLY_CHECK_INTERVAL = 1 * 1000; // 1 second
const USER_ORDERS_SELECT_FIELDS = {
    "_id": 0,
    "restaurantId": 1,
    "restaurantName": 1,
    "groupOrderSum": 1,
    "minimumPriceForOrder": 1,
    "pooledOrderSum": 1,
    "restaurantAddress": 1,
    "restaurantCityName": 1,
    "restaurantHeaderImageUrl": 1,
    "restaurantLogoUrl": 1,
    "restaurantPhone": 1,
    "dateAdded": "$orders.dateAdded",
    "totalAmount": "$orders.totalAmount",
    "shoppingCartGuid": "$orders.shoppingCartGuid",
    "order": "$orders.order",
    "billingLines": "$orders.billingLines",
    "price": "$orders.price",
    "isCanceled": "$orders.isCanceled",
    "isRemoved": "$orders.isRemoved",
    "isPaid": "$orders.isPaid",
    "user": "$orders.user"
};

/**
 * Class Restaurant - Contains restaurants related methods.
 */
class Restaurant {
    /**
     * This method receives an office and a restaurantId and initiates the office's restaurant instance.
     * 
     * @param {Office} office 
     * @param {Integer} restaurantId 
     * @param {Boolean} createIfNotExists If set to true and the restaurant doesn't exist in the database, the restaurant will be automatically created.
     * @returns {Promise<void>}
     */
    async initInstance(office, restaurantId, createIfNotExists) {
        if (typeof office !== "object" || !office.exists) {
            throw new InvalidInputError("Invalid office received.", {
                "office": office,
                "restaurantId": restaurantId,
                "createIfNotExists": createIfNotExists
            });
        }

        if (!Restaurant.isRestaurantIdValid(restaurantId)) {
            throw new InvalidInputError("The restaurantId: " + restaurantId + " is invalid.", {
                "office": office,
                "restaurantId": restaurantId,
                "createIfNotExists": createIfNotExists
            });
        }

        const where = {
            "office_id": office._id,
            "restaurantId": restaurantId
        };

        const selectFields = {
            "_id": 1,
            "office_id": 1,
            "restaurantId": 1,
            "hasMetaData": 1,
            "minimumPriceForOrder": 1,
            "pooledOrderSum": 1,
            "restaurantName": 1,
            "groupOrderSum": 1,
            "restaurantLogoUrl": 1
        };

        await DB.initInstanceByID(this, COLLECTION_NAME, where, selectFields);

        if (createIfNotExists && !this.exists) {
            await Restaurant.createRestaurant(office, restaurantId);
        }
    }

    /**
     * This method returns a basic data object that represents the restaurant's instance.
     * 
     * @returns {object}
     */
    getBasicRestaurantDataObject() {
        if (!this.exists) {
            throw new RestaurantNotExistsError("The restaurant with the restaurantId: " + this.restaurantId + " does not exist.", {
                "restaurantId": this.restaurantId
            });
        }

        return {
            "restaurantId": this.restaurantId,
            "hasMetaData": this.hasMetaData,
            "minimumPriceForOrder": this.minimumPriceForOrder,
            "pooledOrderSum": this.pooledOrderSum,
            "restaurantName": this.restaurantName,
            "groupOrderSum": this.groupOrderSum,
            "restaurantLogoUrl": this.restaurantLogoUrl
        };
    }

    /**
     * This method receives an office and a restaurantId and returns whether there is such a restaurant
     * in the database or not.
     * 
     * @param {Office} office 
     * @param {restaurantId} restaurantId 
     * @returns {Promise<Boolean>}
     */
    static async restaurantExists(office, restaurantId) {
        if (typeof office !== "object" || !office.exists) {
            throw new InvalidInputError("Invalid office received.", {
                "office": office,
                "restaurantId": restaurantId
            });
        }

        const where = {
            "office_id": office._id,
            "restaurantId": restaurantId
        };

        const selectFields = {
            "_id": 1
        };

        const data = await DB.getData(COLLECTION_NAME, where, selectFields);

        return !Helper.isEmpty(data);
    }

    /**
     * This method creates a new restaurant with a given restaurantId for the given office.
     * 
     * @param {Office} office 
     * @param {restaurantId} restaurantId 
     * @returns {Promise<void>}
     */
    static async createRestaurant(office, restaurantId) {
        if (typeof office !== "object" || !office.exists) {
            throw new InvalidInputError("Invalid office received.", {
                "office": office,
                "restaurantId": restaurantId
            });
        }

        if (!Restaurant.isRestaurantIdValid(restaurantId)) {
            throw new InvalidInputError("The restaurantId: " + restaurantId + " is invalid.", {
                "office": office,
                "restaurantId": restaurantId
            });
        }

        if (await Restaurant.restaurantExists(office, restaurantId)){
            throw new RestaurantAlreadyExistsError("The restaurant with the addressCompanyId: " + office.addressCompanyId + " and addressKey: " + office.addressKey + " and restaurantId: " + restaurantId + " already exists.", {
                "office": office,
                "restaurantId": restaurantId
            });
        }

        const insertFields = ["office_id", "restaurantId", "orders", "hasMetaData"];
        const insertData = {
            "office_id": office._id,
            "restaurantId": restaurantId,
            "orders": [],
            "hasMetaData": false,
            "creationDate": new Date(new GroupeatDate().toISOString())
        };

        await DB.insertData(insertData, insertFields, COLLECTION_NAME);
    }

    /**
     * This method receives a user and returns the user's order for the instance's restaurant for today.
     * 
     * @param {User} user 
     * @returns {Promise<Array<object>>} An array containing 1 or 0 objects inside.
     */
    async getTodayUserOrder(user) {
        if (!this.exists) {
            throw new RestaurantNotExistsError("The restaurant with the restaurantId: " + this.restaurantId + " does not exist.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        const todayUserOrder = await DB.aggregate(COLLECTION_NAME,
            { "$match": {
                "_id": this._id
            } },
            { "$unwind": "$orders" },
            { "$match": {
                "orders.user": user._id,
                "orders.isCanceled": 0,
                "orders.isRemoved": 0,
                "orders.dateAdded": {
                    "$gte": new Date(GroupeatDate.getTodayDate().toISOString()),
                    "$lte": new Date(GroupeatDate.getTomorrowDate().toISOString())
                }
            } },
            { "$lookup": { // INNER JOIN users
                "from": "users",
                "localField": "orders.user",
                "foreignField": "_id",
                "as": "joinedUsers"
            } },
            { "$sort": {
                "orders.dateAdded": -1
            } },
            { "$project": USER_ORDERS_SELECT_FIELDS}
        );

        return todayUserOrder;
    }

    /**
     * This method receives a user and returns the user's orders for the current day from all the restaurants
     * the user created orders from.
     * 
     * @param {User} user 
     * @returns {Promise<Array<object>>}
     */
    static async getTodayUserOrders(user) {
        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        const todayUserOrders = await DB.aggregate(COLLECTION_NAME,
            { "$unwind": "$orders" },
            { "$match": {
                "orders.user": user._id,
                "orders.isCanceled": 0,
                "orders.isRemoved": 0,
                "orders.dateAdded": {
                    "$gte": new Date(GroupeatDate.getTodayDate().toISOString()),
                    "$lte": new Date(GroupeatDate.getTomorrowDate().toISOString())
                }
            } },
            { "$lookup": { // INNER JOIN users
                "from": "users",
                "localField": "orders.user",
                "foreignField": "_id",
                "as": "joinedUsers"
            } },
            { "$sort": {
                "orders.dateAdded": -1
            } },
            { "$project": USER_ORDERS_SELECT_FIELDS}
        );

        return todayUserOrders;
    }

    /**
     * This method receives a user and returns the paid order the user has for the current day (if he has any).
     * 
     * @param {User} user 
     * @returns {Promise<object|null>}
     */
    static async getTodayUserPaidOrder(user) {
        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        const todayUserOrders = await Restaurant.getTodayUserOrders(user);

        // Looking for the paid order.
        for (let i = 0; i < todayUserOrders.length; i++) {
            if (!Helper.isEmpty(todayUserOrders[i]["isPaid"])) {
                return todayUserOrders[i];
            }
        }

        return null;
    }

    /**
     * This method receives a user and returns whether the user can create a new order or not, and if the user
     * can't create a new order, the method also returns a text that describes the reson.
     * 
     * @param {User} user 
     * @returns {Promise<object>}
     */
    static async canUserMakeNewOrder(user) {
        if (!GroupeatDate.isOrderTime()) {
            return {
                "result": false,
                "reason": "שעת ההזמנה עברה ולכן לא ניתן להצטרף להזמנות משרדיות."
            }
        }

        const userOrders = await Restaurant.getTodayUserOrders(user);

        if (userOrders.length >= ORDERS_PER_DAY_THRESHOLD) {
            return {
                "result": false,
                "reason": "אינך יכול להצטרף ליותר מ2 הזמנות משרדיות."
            };
        }

        for (let i = 0; i < userOrders.length; i++) {
            if (!Helper.isEmpty(userOrders[i]["isPaid"])) {
                return {
                    "result": false,
                    "reason": "קיימת הזמנה ששולמה ולכן אינך יכול להצטרף להזמנה משרדית."
                };
            }
        }

        return {
            "result": true
        };
    }

    /**
     * This method receives a user and returns the amount of orders the users have for the current day.
     * 
     * @param {User} user 
     * @returns {Promise<Integer>}
     */
    static async getTodayUserOrdersAmount(user) {
        const todayUserOrders = await Restaurant.getTodayUserOrders(user);

        return todayUserOrders.length;
    }

    /**
     * This method receives a user and an office the user belongs to and returns all the orders the user has made
     * from restaurants using Groupeat.
     * 
     * @param {User} user 
     * @param {Office} office 
     * @param {Integer|null} limit 
     * @param {Integer|null} skip 
     * @returns {Promise<Array<object>>}
     */
    static async getAllUserOrders(user, office, limit, skip) {
        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "office": office,
                "limit": limit,
                "skip": skip,
                "restaurantId": this.restaurantId
            });
        }

        if (typeof office !== "object" || !office.exists) {
            throw new InvalidInputError("Invalid office received.", {
                "user": user,
                "office": office,
                "limit": limit,
                "skip": skip,
                "restaurantId": this.restaurantId
            });
        }

        const aggr = [
            { "$match": {
                "office_id": office._id
            } },
            { "$unwind": "$orders" },
            { "$match": {
                "orders.user": user._id,
                "orders.isRemoved": 0
            } },
            { "$lookup": { // INNER JOIN users
                "from": "users",
                "localField": "orders.user",
                "foreignField": "_id",
                "as": "joinedUsers"
            } },
            { "$sort": {
                "orders.dateAdded": -1
            } },
            { "$project": USER_ORDERS_SELECT_FIELDS },
        ];

        if (Helper.isTrueInteger(skip) && skip > 0) {
            skip = parseInt(skip);
        }
        else {
            skip = 0;
        }

        if (Helper.isTrueInteger(limit) && limit > 0) {
            limit = parseInt(limit);
            aggr.push({ "$limit": skip + limit });
        }

        if (skip > 0) {
            aggr.push({ "$skip": skip });
        }

        const userOrders = await DB.aggregate(COLLECTION_NAME, aggr);

        return userOrders;
    }

    /**
     * This method receives an office and returns all the orders that users that belong to this office have made
     * for the current day.
     * 
     * @param {Office} office
     * @returns {Promise<Array<object>>} 
     */
    static async getTodayOfficeOrders(office) {
        if (typeof office !== "object" || !office.exists) {
            throw new InvalidInputError("Invalid office received.", {
                "office": office,
                "restaurantId": this.restaurantId
            });
        }

        const selectFields = {
            "_id": 0,
            "restaurantId": 1,
            "restaurantName": 1,
            "groupOrderSum": 1,
            "minimumPriceForOrder": 1,
            "pooledOrderSum": 1,
            "restaurantAddress": 1,
            "restaurantCityName": 1,
            "restaurantHeaderImageUrl": 1,
            "restaurantLogoUrl": 1,
            "restaurantPhone": 1,
            "orders": 1
        };

        const todayOrders = await DB.aggregate(COLLECTION_NAME,
            { "$match": {"office_id": office._id} },
            { "$unwind": "$orders" },
            { "$match": {
                "orders.dateAdded": {
                    "$gte": new Date(GroupeatDate.getTodayDate().toISOString()),
                    "$lte": new Date(GroupeatDate.getTomorrowDate().toISOString())
                },
                "orders.isCanceled": 0,
                "orders.isRemoved": 0
            } },
            { "$sort": {
                "orders.dateAdded": -1
            } },
            { "$project": selectFields }
        );

        return Restaurant.groupRestaurantsOrders(todayOrders);
    }

    /**
     * This method returns the orders that the users made from the restaurant for the current day.
     * 
     * @returns {Promise<Array<object>>}
     */
    async getTodayGroupOrder() {
        if (!this.exists) {
            throw new InvalidInputError("The restaurant doesn't exist.", {
                "restaurantId": this.restaurantId
            });
        }

        const selectFields = {
            "_id": 0,
            "minimumPriceForOrder": 1,
            "pooledOrderSum": 1,
            "restaurantAddress": 1,
            "restaurantCityName": 1,
            "restaurantHeaderImageUrl": 1,
            "restaurantLogoUrl": 1,
            "restaurantPhone": 1,
            "users": "$joinedUsers",
            "totalAmount": "$orders.totalAmount",
            "shoppingCartGuid": "$orders.shoppingCartGuid",
            "dateAdded": "$orders.dateAdded",
            "dateCanceled": "$orders.dateCanceled",
            "datePaid": "$orders.datePaid",
            "isCanceled": "$orders.isCanceled",
            "isRemoved": "$orders.isRemoved",
            "isPaid": "$orders.isPaid",
            "notificationSent": "$orders.notificationSent"
        };

        const orders = await DB.aggregate(COLLECTION_NAME,
            { "$match": {
                "_id": this._id
            } },
            { "$unwind": "$orders" },
            { "$match": {
                "orders.dateAdded": {
                    "$gte": new Date(GroupeatDate.getTodayDate().toISOString()),
                    "$lte": new Date(GroupeatDate.getTomorrowDate().toISOString())
                },
                "orders.isRemoved": 0,
                "orders.isCanceled": 0
            } },
            { "$lookup": { // INNER JOIN users
                "from": "users",
                "localField": "orders.user",
                "foreignField": "_id",
                "as": "joinedUsers"
            } },
            { "$sort": {
                "orders.dateAdded": -1
            } },
            { "$project": selectFields }
        );

        for (let i = 0; i < orders.length; i++) {
            orders[i]["user"] = orders[i]["users"][0];

            delete orders[i]["users"];
        }

        return orders;
    }

    /**
     * This method calculates the sum of the orders of the restaurant's today's group order.
     * 
     * @returns {Promise<Float>}
     */
    async calculateGroupOrderSum() {
        if (!this.exists) {
            throw new InvalidInputError("The restaurant doesn't exist.", {
                "restaurantId": this.restaurantId
            });
        }

        const todayOrders = await this.getTodayGroupOrder();

        if (Helper.isEmpty(todayOrders)) {
            return 0;
        }

        let totalSum = 0;

        for (let i = 0; i < todayOrders.length; i++) {
            if (Restaurant.isOrderInGroupOrder(todayOrders[i])) {
                totalSum += todayOrders[i]["totalAmount"];
            }
        }

        return totalSum;
    }

    /**
     * This method returns whether the restaurant's group order for the current day has passed the required
     * minimum order or not.
     * 
     * @returns {Boolean}
     */
    isGroupOrderPassedMinimum() {
        if (!this.exists) {
            throw new InvalidInputError("The restaurant doesn't exist.", {
                "restaurantId": this.restaurantId
            });
        }

        if (this.minimumPriceForOrder === undefined || Helper.isEmpty(this.groupOrderSum)) {
            return false;
        }
        else if (this.minimumPriceForOrder == 0) {
            return true;
        }

        // Checking if we passed the minimum price for order using the group order and the pooled order.
        return this.pooledOrderSum + this.groupOrderSum >= this.minimumPriceForOrder;
    }

    /**
     * This method receives a restaurant order and returns whether it belongs to a restaurant's group order or not.
     * 
     * @param {object} order 
     * @returns {Boolean}
     */
    static isOrderInGroupOrder(order) {
        return Helper.isEmpty(order["isCanceled"]) && Helper.isEmpty(order["isRemoved"]) && (ALLOW_PAID_ORDERS_UPDATE || Helper.isEmpty(order["isPaid"]));
    }

    /**
     * This method receives an array of users and marks them as in the middle of automatic payment process.
     * 
     * @param {Array<User>} users 
     */
    static markUsersInAutomaticPaymentProcess(users) {
        for (let i = 0; i < users.length; i++) {
            const currentUser = users[i];

            Restaurant.usersInAutomaticPaymentProcess[currentUser._id.toString()] = 1;
        }
    }

    /**
     * This method receives an array of users and unmarks them from being in the middle of automatic payment process.
     * 
     * @param {Array<User>} users 
     */
    static unmarkUsersFromAutomaticPaymentProcess(users) {
        for (let i = 0; i < users.length; i++) {
            const currentUser = users[i];

            delete Restaurant.usersInAutomaticPaymentProcess[currentUser._id.toString()];
        }
    }

    /**
     * This method receives an array of orders and returns an initialized users array where each user contains its order.
     * 
     * @param {Array<object>} todayOrders 
     * @returns {Promise<Array<User>>}
     */
    async createUsersArrayFromOrders(todayOrders) {
        const users = [];

        for (let i = 0; i < todayOrders.length; i++) {
            const user = new User();
            const currentOrder = todayOrders[i];
            const currentUser = currentOrder["user"];

            if (Helper.isEmpty(currentUser)) {
                continue;
            }

            // Checking if we should initialize the user according to its testUserId (if exists) or according
            // to its userToken.
            if (!Helper.isEmpty(currentUser["testUserId"])) {
                await user.initInstanceByTestUserId(currentUser["testUserId"]);
            }
            else {
                await user.initInstanceByUserToken(currentUser["userToken"]);
            }

            // If there's at least one user who's in automatic payment in another restaurant, we should discontinue with
            // this process and try again in the next restaurant update that happens periodically.
            if (!Helper.isEmpty(Restaurant.usersInAutomaticPaymentProcess[user._id.toString()])) {
                return [];
            }

            user.orderData = currentOrder;
            users.push(user);
        }

        return users;
    }

    /**
     * This method lets the users know we need them to ping us back so we know they are connected to 10bis and Groupeat.
     * 
     * @param {Array<User>} users 
     */
    requestUsersPingUpdate(users) {
        for (let i = 0; i < users.length; i++) {
            const currentUser = users[i];
            const currentOrder = currentUser.orderData;

            // If the user already received an automatic payment noitifcation for this order, it means that the user
            // already paid. This can only happen in testing environment when deletion of "paid" orders is possible.
            if (!Helper.isEmpty(currentOrder["notificationSent"])) {
                continue;
            }

            const title = "מוודא אפשרות חיוב עבור " + this.restaurantName;
            const message = "המסעדה " + this.restaurantName + " עברה את מינימום ההזמנה הנדרש. Groupeat מוודא כי הנך מחובר לחשבון התן ביס לצורך ביצוע חיוב.";

            currentUser.requestPingUpdate(title, message);
        }
    }

    /**
     * This method receives an array of users and updates each user whether he was seen recently or not.
     * A user was seen recently if the time difference between the last time the user pinged the server and the current time
     * is less than USERS_SEEN_RECENTLY_TIME_TO_ANSWER.
     * 
     * @param {Array<User>} users 
     * @returns {Promise<Boolean>} Returns true if all users were seen recently.
     */
    async updateAndCheckIfUsersWereSeenRecently(users) {
        let allUsersSeenRecently = true;

        for (let i = 0; i < users.length; i++) {
            const currentTime = new Date(new GroupeatDate().toISOString());
            const currentUser = users[i];

            if (Helper.isEmpty(currentUser.lastPingTime) || (currentTime - new Date(currentUser.lastPingTime) > USERS_SEEN_RECENTLY_MAXIMUM_TIME_TO_ANSWER)) {
                allUsersSeenRecently = false;
                await currentUser.reinitInstance(); // Reinitializing the user so we can update the user's lastPingTime property.
            }
            else {
                currentUser.seenRecently = 1;
            }
        }

        return allUsersSeenRecently;
    }

    /**
     * This method updates the users' seenRecently parameter for a maximum time of USERS_SEEN_RECENTLY_MAXIMUM_TIME_TO_ANSWER.
     * If all users were seen recently, then the wait will finish before the maximum time to answer arrives.
     * 
     * @param {Array<User>} users 
     * @returns {Promise<Boolean>} Returns whether all users were seen recently or not.
     */
    waitForUsersSeenUpdate(users) {
        const self = this;

        return new Promise((resolve, reject) => {
            let currentInterval = 0;

            const inter = setInterval(async function() {
                const allUsersSeen = await self.updateAndCheckIfUsersWereSeenRecently(users);

                currentInterval += USERS_SEEN_RECENTLY_CHECK_INTERVAL;

                if (allUsersSeen || currentInterval >= USERS_SEEN_RECENTLY_MAXIMUM_TIME_TO_ANSWER) {
                    clearInterval(inter);
                    resolve(allUsersSeen);
                }
            }, USERS_SEEN_RECENTLY_CHECK_INTERVAL);
        });
    }

    /**
     * This method receives an array of users and returns whether the users that are marked as seenRecently
     * have passed the minimum order or not.
     * 
     * @param {Array<User>} users 
     * @returns {Boolean}
     */
    seenUsersPassedMinimum(users) {
        let ordersSum = 0;

        for (let i = 0; i < users.length; i++) {
            const currentOrder = users[i].orderData;

            if (!Restaurant.isOrderInGroupOrder(currentOrder)) {
                continue;
            }

            // We should also calculate paid orders (we need to that in testing environment where paid orders can be modified).
            if (!Helper.isEmpty(users[i].seenRecently) || !Helper.isEmpty(currentOrder["isPaid"])) {
                ordersSum += currentOrder["totalAmount"];
            }
        }

        return this.pooledOrderSum + ordersSum >= this.minimumPriceForOrder;
    }

    /**
     * This method receives a user and notifies the user that his user was canceled because he wasn't online
     * when an automatic payment process began.
     * 
     * @param {User} user 
     * @returns {Promise<void>}
     */
    async sendUnseenUserOrderCancelationNotification(user) {
        const notification = Notification.getInstance();
        const userToken = user.userToken;
        const testUserId = user.testUserId;
        const fcmId = user.fcmId;
        const message = {
            "title": "ביטול הזמנה - " + this.restaurantName,
            "message": "המסעדה " + this.restaurantName + " עברה את המינימום בשעה בה לא היית מחובר לחשבון התן ביס ולכן הזמנתך בוטלה.",
            "restaurantId": this.restaurantId.toString(),
            "restaurantName": this.restaurantName.toString(),
            "userToken": userToken.toString(),
            "testUserId": testUserId.toString(),
            "type": Notification.GROUP_ORDER_FAILED_TYPE
        };

        await notification.sendMessage(fcmId, message);
        await user.addNotification(message); // Adding the notification to the user's notifications log.
    }

    /**
     * This method receives an array of users and cancels the orders for all the users that were not seen recently.
     * 
     * @param {Array<User>} users 
     * @returns {Promise<void>}
     */
    async cancelUnseenUsersOrders(users) {
        for (let i = 0; i < users.length; i++) {
            const currentUser = users[i];
            const currentOrder = currentUser.orderData;

            if (!Helper.isEmpty(currentOrder["notificationSent"]) || !Helper.isEmpty(currentUser.seenRecently)) {
                continue;
            }

            await this.cancelOrder(currentUser, true);
            await this.sendUnseenUserOrderCancelationNotification(currentUser);
        }
    }

    /**
     * This method receives a user and a user's order and marks in the database 
     * that a payment notification was sent to the user for the relevant order.
     * 
     * @param {User} user 
     * @param {object} order 
     * @returns {Promise<void>}
     */
    async updateOrderPaymentNotificationSent(user, order) {
        const updateData = {
            "orders.$.notificationSent": 1,
            "orders.$.notificationSentDate": new Date(new GroupeatDate().toISOString())
        };

        const where = {
            "_id": this._id,
            "orders": {
                "$elemMatch": {
                    "user": user._id,
                    "dateAdded": order["dateAdded"]
                }
            }
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["orders.$.notificationSent", "orders.$.notificationSentDate"], where);
    }

    /**
     * This method receives an office and a user and sends an automatic payment notification to the user.
     * 
     * @param {Office} office 
     * @param {User} user 
     * @returns {Promise<void>}
     */
    async sendAutomaticPaymentNotification(office, user) {
        const notification = Notification.getInstance();
        const currentOrder = user.orderData;
        const fcmId = user.fcmId;
        const userToken = user.userToken;
        const shoppingCartGuid = currentOrder["shoppingCartGuid"];
        const totalAmount = currentOrder["totalAmount"];
        const notificationSent = currentOrder["notificationSent"];

        let testUserId = user.testUserId;

        // If we already sent the notification, we shouldn't send it again.
        // This shouldn't normally happen, it can only happen in testing environment where updating "paid" orders is possible.
        if (!Helper.isEmpty(notificationSent)) {
            return;
        }

        if (!testUserId) {
            testUserId = "";
        }

        if (!Helper.isEmpty(user.seenRecently) && Restaurant.isOrderInGroupOrder(currentOrder) && !Helper.isEmpty(fcmId)) {
            const message = {
                "title": "חיוב עבור הזמנה - " + this.restaurantName,
                "message": 'סכום ההזמנות המשרדיות מ' + this.restaurantName + ' עבר את המינימום הנדרש.\nההזמנה שהוספת מהמסעדה נשלחה לתן ביס והתבצע חיוב בסך ' + totalAmount + ' ש"ח.',
                "restaurantId": this.restaurantId.toString(),
                "restaurantName": this.restaurantName.toString(),
                "addressCompanyId": office.addressCompanyId.toString(),
                "addressKey": office.addressKey.toString(),
                "userToken": userToken.toString(),
                "testUserId": testUserId.toString(),
                "shoppingCartGuid": shoppingCartGuid.toString(),
                "type": Notification.ORDER_CONFIRMATION_TYPE
            };
    
            await notification.sendMessage(fcmId, message);
            await user.addNotification(message); // Adding the notification to the user's notifications log.
            await this.updateOrderPaymentNotificationSent(user, currentOrder);
        }
    }

    /**
     * This method receives an array of users and sends the users a notification that their order couldn't pass
     * the required minimum because one or more of the workers are not connected.
     * 
     * @param {Array<User>} users 
     * @returns {Promise<void>}
     */
    async sendCouldntPassMinimumNotification(users) {
        const notification = Notification.getInstance();

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const currentOrder = user.orderData;
            const userToken = user.userToken;
            const testUserId = user.testUserId;
            const fcmId = user.fcmId;

            if (Helper.isEmpty(testUserId)) {
                testUserId = "";
            }

            if (!Helper.isEmpty(currentOrder["notificationSent"]) || !Restaurant.isOrderInGroupOrder(currentOrder) || Helper.isEmpty(fcmId)) {
                continue;
            }

            const message = {
                "title": "כישלון הזמנה - " + this.restaurantName,
                "message": "אחד או יותר מהמשתמשים שהצטרפו להזמנה המשרדית מ" + this.restaurantName + " אינו מחובר לתן ביס, ולכן החיוב האוטומטי נכשל.",
                "restaurantId": this.restaurantId.toString(),
                "restaurantName": this.restaurantName.toString(),
                "userToken": userToken.toString(),
                "testUserId": testUserId.toString(),
                "type": Notification.GROUP_ORDER_FAILED_TYPE
            };

            await notification.sendMessage(fcmId, message);
            await user.addNotification(message); // Adding the notification to the user's notifications log.
        }
    }

    /**
     * This method receives an office, a user that belongs to the office and whether all the users
     * were seen recently or not, and sends the automatic payment notification to the seen users
     * if and only if they have passed the required minimum amount.
     * 
     * @param {Office} office 
     * @param {Array<Users>} users 
     * @param {Promise<Boolean>} allUsersSeen 
     */
    async sendAutomaticPaymentNotificationsIfSeenUsersPassedMinimum(office, users, allUsersSeen) {
        if (!allUsersSeen) {
            this.cancelUnseenUsersOrders(users);
            
            if (!this.seenUsersPassedMinimum(users)) {
                this.sendCouldntPassMinimumNotification(users);
                return;
            }
        }

        // If we're here, it means the seen users have passed the required minimum order amount.
        for (let i = 0; i < users.length; i++) {
            const currentUser = users[i];

            if (!Helper.isEmpty(currentUser.seenRecently)) {
                await this.sendAutomaticPaymentNotification(office, currentUser);
            }
        }
    }

    /**
     * This method receives an office instance that belongs to the current restaurant and sends the automatic payment
     * notifications to the users that are participating in the restaurant's group order for the current day.
     * The notifications are sent if and only if enough users that were seen recently have passed the minimum order.
     * 
     * @param {Office} office 
     * @returns {Promise<void>}
     */
    async sendAutomaticPaymentNotifications(office) {
        if (!this.exists) {
            throw new RestaurantNotExistsError("The restaurant with the restaurantId: " + this.restaurantId + " does not exist.", {
                "office": office,
                "restaurantId": this.restaurantId
            });
        }

        if (Helper.isEmpty(office) || office._id.toString() != this.office_id.toString()) {
            throw new InvalidInputError("The office instance that was received doesn't match the office that belongs to this restaurant instance.", {
                "office": office,
                "restaurantId": this.restaurantId
            });
        }

        // Checking if this restaurant is already in automatic payment process.
        if (!Helper.isEmpty(Restaurant.restaurantsInAutomaticPaymentProcess[this._id.toString()])) {
            return;
        }

        // Marking that this restaurant is in an automatic payment process.
        Restaurant.restaurantsInAutomaticPaymentProcess[this._id.toString()] = 1;

        const todayOrders = await this.getTodayGroupOrder();
        const users = await this.createUsersArrayFromOrders(todayOrders);

        // Marking the users so other restaurants that pass the minimum at the same time will not collide with the current process.
        Restaurant.markUsersInAutomaticPaymentProcess(users);

        // Asking the users to ping us so we know they are connected to 10bis and Groupeat.
        this.requestUsersPingUpdate(users);

        // Waiting for the users' responses (or non responses) before we continue.
        const allUsersSeen = await this.waitForUsersSeenUpdate(users);
        
        // Sending the automatic payment notifications to the seen recently users (if possible).
        await this.sendAutomaticPaymentNotificationsIfSeenUsersPassedMinimum(office, users, allUsersSeen);
        Restaurant.restaurantsInAutomaticPaymentProcess[this._id.toString()] = 0; // Unmarking the restaurant from being in an automatic payment process.
        Restaurant.unmarkUsersFromAutomaticPaymentProcess(users);
    }

    /**
     * This method receives an office instance that belongs to the current restaurant and sends the automatic
     * payment notifications to the users if the restaurant's group order has passed the minimum amount.
     * 
     * @param {Office} office 
     * @returns {Promise<void>}
     */
    async sendAutomaticPaymentNotificationsIfPassedMinimum(office) {
        if (this.isGroupOrderPassedMinimum()) {
            this.sendAutomaticPaymentNotifications(office);
        }
    }

    /**
     * This method receives order data and checks that the data is valid.
     * If the data is not valid, the method will throw an error.
     * 
     * @param {User} user 
     * @param {Office} office 
     * @param {Array<object>} order 
     * @param {Float} totalAmount 
     * @param {string} shoppingCartGuid 
     */
    validateOrderData(user, office, order, totalAmount, shoppingCartGuid) {
        if (!this.exists) {
            throw new RestaurantNotExistsError("The restaurant with the restaurantId: " + this.restaurantId + " does not exist.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid,
                "restaurantId": this.restaurantId
            });
        }

        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid
            });
        }

        if (!Restaurant.isOrderValid(order)) {
            throw new InvalidInputError("The order format that was received is invalid.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid
            });
        }

        if (isNaN(parseFloat(totalAmount))) {
            throw new InvalidInputError("The order's totalAmount that was received is invalid.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid
            });
        }

        if (Helper.isEmpty(shoppingCartGuid)) {
            throw new InvalidInputError("The shoppingCartGuid is missing.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid
            });
        }
    }

    /**
     * This method receives order data and adds a new to the restaurant for the user.
     * 
     * @param {User} user 
     * @param {Office} office 
     * @param {Array<object>} order 
     * @param {Float} totalAmount 
     * @param {string} shoppingCartGuid 
     * @param {Array<object>} billingLines 
     * @returns {Promise<void>}
     */
    async addOrder(user, office, order, totalAmount, shoppingCartGuid, billingLines) {
        this.validateOrderData(user, office, order, totalAmount, shoppingCartGuid);

        const todayPaidOrder = await Restaurant.getTodayUserPaidOrder(user);

        if (!Helper.isEmpty(todayPaidOrder)) {
            throw new PaidOrderExistsError("The user already has a paid order.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid,
                "billingLines": billingLines
            });
        }

        const currentUserOrder = await this.getTodayUserOrder(user);

        if (!Helper.isEmpty(currentUserOrder)) {
            throw new AlreadyExistsError("The user already has an order for this restaurant.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid,
                "billingLines": billingLines
            });
        }

        const todayUserOrdersAmount = await Restaurant.getTodayUserOrdersAmount(user);

        if (todayUserOrdersAmount >= ORDERS_PER_DAY_THRESHOLD) {
            throw new AlreadyExistsError("The user already has " + ORDERS_PER_DAY_THRESHOLD + " or more orders and cannot create another one", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid,
                "billingLines": billingLines
            });
        }

        const pushData = {
            "user": user._id,
            "order": order,
            "billingLines": billingLines,
            "totalAmount": totalAmount,
            "shoppingCartGuid": shoppingCartGuid,
            "dateAdded": new GroupeatDate(),
            "dateUpdated": null,
            "dateCanceled": null,
            "dateRemoved": null,
            "datePaid": null,
            "isCanceled": 0,
            "isRemoved": 0,
            "isPaid": 0
        };

        await DB.pushDataToArray(COLLECTION_NAME, "orders", pushData, this._id);
        await this.updateGroupOrderSum(); // Updating the group order sum in the database.

        // Sending a notification to the user if enough orders were made.
        this.sendAutomaticPaymentNotificationsIfPassedMinimum(office);
    }

    /**
     * This method receives order data and updates an existing order the user has from the restaurant.
     * 
     * @param {User} user 
     * @param {Office} office 
     * @param {Array<object>} order 
     * @param {Float} totalAmount 
     * @param {string} shoppingCartGuid 
     * @param {Array<object>} billingLines 
     * @returns {Promise<void>}
     */
    async updateOrder(user, office, order, totalAmount, shoppingCartGuid, billingLines) {
        this.validateOrderData(user, office, order, totalAmount, shoppingCartGuid);

        let todayOrder = await this.getTodayUserOrder(user);

        if (Helper.isEmpty(todayOrder)) {
            throw new InvalidInputError("The user with userToken: " + user.userToken + " does not have an active order.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid,
                "restaurantId": this.restaurantId,
                "billingLines": billingLines
            });
        }

        todayOrder = todayOrder[0];

        // We do not allow updating paid orders unless we're in testing environment.
        if (!ALLOW_PAID_ORDERS_UPDATE && !Helper.isEmpty(todayOrder["isPaid"])) {
            throw new InvalidInputError("The user with userToken: " + user.userToken + " tried to update a paid or confirmed order.", {
                "user": user,
                "office": office,
                "order": order,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid,
                "restaurantId": this.restaurantId,
                "billingLines": billingLines
            });
        }

        if (!Helper.isEmpty(Restaurant.usersInAutomaticPaymentProcess[user._id.toString()])) {
            throw new InvalidInputError("The user is in automatic payment progress.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        const updateData = {
            "orders.$": {
                "user": todayOrder["user"],
                "order": order,
                "billingLines": billingLines,
                "totalAmount": totalAmount,
                "shoppingCartGuid": shoppingCartGuid,
                "dateAdded": todayOrder["dateAdded"],
                "dateUpdated": new Date(new GroupeatDate().toISOString()),
                "dateCanceled": null,
                "dateRemoved": null,
                "datePaid": null,
                "isCanceled": 0,
                "isRemoved": 0,
                "isPaid": 0
            }
        };

        const where = {
            "_id": this._id,
            "orders": {
                "$elemMatch": {
                    "user": user._id,
                    "dateAdded": todayOrder["dateAdded"]
                }
            }
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["orders.$"], where);
        await this.updateGroupOrderSum(); // Updating the group order sum in the database.

        // Sending a notification to the user if enough orders were made.
        this.sendAutomaticPaymentNotificationsIfPassedMinimum(office);
    }

    /**
     * This method receives a user and cancels the current day user's order from the restaurant.
     * If the user is in the middle of an automatic payment process and the isUnseenUser parameter
     * is set to false, then the method will fail to remove the user's order.
     * 
     * @param {User} user 
     * @param {Boolean} isUnseenUser Whether this is a non seen recently user or not
     * @returns {Promise<void>}
     */
    async cancelOrder(user, isUnseenUser) {
        if (!this.exists) {
            throw new RestaurantNotExistsError("The restaurant with the restaurantId: " + this.restaurantId + " does not exist.", {
                "user": user,
                "isUnseenUser": isUnseenUser,
                "restaurantId": this.restaurantId
            });
        }

        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "isUnseenUser": isUnseenUser,
                "restaurantId": this.restaurantId
            });
        }

        let todayOrder = await this.getTodayUserOrder(user);

        if (Helper.isEmpty(todayOrder)) {
            throw new InvalidInputError("The user with userToken: " + user.userToken + " does not have an active order.", {
                "user": user,
                "isUnseenUser": isUnseenUser,
                "restaurantId": this.restaurantId
            });
        }

        todayOrder = todayOrder[0];

        // We do not allow updating paid orders unless we're in testing environment.
        if (!ALLOW_PAID_ORDERS_UPDATE && !Helper.isEmpty(todayOrder["isPaid"])) {
            throw new InvalidInputError("The user with userToken: " + user.userToken + " tried to delete a paid or confirmed order.", {
                "user": user,
                "isUnseenUser": isUnseenUser,
                "restaurantId": this.restaurantId
            });
        }

        // If the user is in automatic payment progress, he should not be able to manually remove his order.
        if ((!ALLOW_PAID_ORDERS_UPDATE || Helper.isEmpty(todayOrder["isPaid"])) && Helper.isEmpty(isUnseenUser) && !Helper.isEmpty(Restaurant.usersInAutomaticPaymentProcess[user._id.toString()])) {
            throw new InvalidInputError("The user is in automatic payment progress.", {
                "user": user,
                "isUnseenUser": isUnseenUser,
                "restaurantId": this.restaurantId
            });
        }

        const updateData = {
            "orders.$.isCanceled": 1,
            "orders.$.dateCanceled": new Date(new GroupeatDate().toISOString())
        };

        const where = {
            "_id": this._id,
            "orders": {
                "$elemMatch": {
                    "user": user._id,
                    "dateAdded": todayOrder["dateAdded"]
                }
            }
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["orders.$.isCanceled", "orders.$.dateCanceled"], where);
        this.updateGroupOrderSum(); // Updating the group order sum in the database.
    }

    /**
     * This method receives a user and the exact date of an order in the current restaurant and
     * removes the current day user's order from the user's orders log.
     * If the user is in the middle of an automatic payment process and the isUnseenUser parameter
     * is set to false, then the method will fail to remove the user's order.
     * 
     * @param {User} user 
     * @param {Boolean} isUnseenUser Whether this is a non seen recently user or not
     * @returns {Promise<void>}
     */
    async removeOrder(user, dateAdded) {
        if (!this.exists) {
            throw new RestaurantNotExistsError("The restaurant with the restaurantId: " + this.restaurantId + " does not exist.", {
                "user": user,
                "dateAdded": dateAdded,
                "restaurantId": this.restaurantId
            });
        }

        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "dateAdded": dateAdded,
                "restaurantId": this.restaurantId
            });
        }

        if (Helper.isEmpty(dateAdded)) {
            throw new InvalidInputError("Invalid date received.", {
                "user": user,
                "dateAdded": dateAdded,
                "restaurantId": this.restaurantId
            });
        }

        dateAdded = new Date(dateAdded);

        if (dateAdded.toString() == "Invalid Date") {
            throw new InvalidInputError("Invalid date received.", {
                "user": user,
                "dateAdded": dateAdded,
                "restaurantId": this.restaurantId
            });
        }

        const updateData = {
            "orders.$.isRemoved": 1,
            "orders.$.dateRemoved": new Date(new GroupeatDate().toISOString())
        };

        const where = {
            "_id": this._id,
            "orders": {
                "$elemMatch": {
                    "user": user._id,
                    "dateAdded": new Date(dateAdded.toISOString())
                }
            }
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["orders.$.isRemoved", "orders.$.dateRemoved"], where);
        this.updateGroupOrderSum(); // Updating the group order sum in the database.
    }

    /**
     * This method receives a user and cancels the user's orders that were not paid in the current day.
     * 
     * @param {User} user 
     * @returns {Promise<void>}
     */
    static async cancelTodayUnpaidOrders(user) {
        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        const updateData = {
            "orders.$.isCanceled": 1,
            "orders.$.dateCanceled": new Date(new GroupeatDate().toISOString())
        };

        const where = {
            "orders": {
                "$elemMatch": {
                    "user": user._id,
                    "isPaid": 0,
                    "dateAdded": ""
                }
            }
        };

        const todayUserOrders = await Restaurant.getTodayUserOrders(user);

        for (let i = 0; i < todayUserOrders.length; i++) {
            if (!Helper.isEmpty(todayUserOrders[i]["isPaid"])) {
                continue;
            }
            
            // Setting the 'where' to match the current unpaid order.
            // The dateAdded acts like an id in this case.
            where["orders"]["$elemMatch"]["dateAdded"] = todayUserOrders[i]["dateAdded"];
            await DB.updateData(COLLECTION_NAME, updateData, ["orders.$.isCanceled", "orders.$.dateCanceled"], where);
        }
    }

    /**
     * This method receives a user and marks all of his orders as removed.
     * This method is usually called when the user is being resetted.
     * 
     * @param {User} user 
     * @returns {Promise<void>}
     */
    static async removeAllUserOrders(user) {
        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        const where = {
            "orders": {
                "$elemMatch": {
                    "user": user._id,
                    "isRemoved": 0
                }
            }
        };

        const updateData = {
            "isRemoved": 1,
            "dateRemoved": new Date(new GroupeatDate().toISOString())
        };

        const conditions = {
            "isRemoved": 0,
            "user": user._id
        };

        await DB.updateArrayItems(COLLECTION_NAME, "orders", where, updateData, conditions);
    }

    /**
     * This method receives a user and marks the user's order in the current restaurant as paid.
     * If the user doesn't have any order for this restaurant, the method will throw an error.
     * 
     * @param {User} user 
     * @returns {Promise<void>}
     */
    async payOrder(user) {
        if (!this.exists) {
            throw new RestaurantNotExistsError("The restaurant with the restaurantId: " + this.restaurantId + " does not exist.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        if (typeof user !== "object" || !user.exists) {
            throw new InvalidInputError("Invalid user received.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        let todayOrder = await this.getTodayUserOrder(user);

        if (Helper.isEmpty(todayOrder)) {
            throw new InvalidInputError("The user with userToken: " + user.userToken + " does not have an active order.", {
                "user": user,
                "restaurantId": this.restaurantId
            });
        }

        todayOrder = todayOrder[0];

        if (todayOrder["isPaid"] == 1) {
            throw new AlreadyExistsError("The order has already been paid. userToken = " + user.userToken, {
                "user": user,
                "restaurantId": this.restaurantId,
                "todayOrder": todayOrder
            });
        }

        const updateData = {
            "orders.$.isPaid": 1,
            "orders.$.datePaid": new Date(new GroupeatDate().toISOString())
        };

        const where = {
            "_id": this._id,
            "orders": {
                "$elemMatch": {
                    "user": user._id,
                    "dateAdded": todayOrder["dateAdded"]
                }
            }
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["orders.$.isPaid", "orders.$.datePaid"], where);
        await Restaurant.cancelTodayUnpaidOrders(user);
        this.updateGroupOrderSum(); // Updating the group order sum in the database.
    }

    /**
     * This method receives a restaurantId and checks that it's valid.
     * 
     * @param {*} restaurantId 
     * @returns {Boolean}
     */
    static isRestaurantIdValid(restaurantId) {
        if (Helper.isEmpty(restaurantId)) {
            return false;
        }

        if (!Helper.isTrueInteger(restaurantId)) {
            return false;
        }

        return true;
    }

    /**
     * This method receives an order (array of items) and checks that it is a valid order array.
     * 
     * @param {Array<object>} order 
     * @returns {Boolean}
     */
    static isOrderValid(order) {
        if (Helper.isEmpty(order) || typeof order !== "object") {
            return false;
        }

        // This object defines which keys are required and of what type they should be.
        const requiredKeys = {
            "assignedUserId": "int",
            "categoryId": "int",
            "choices": "object",
            "dishId": "int",
            "dishNotes": "any",
            "itemName": "string",
            "price": "number",
            "quantity": "int",
            "shoppingCartDishId": "int"
        };

        // Validating that each item in the order is valid.
        for (let i = 0; i < order.length; i++) {
            if (!Helper.isObjectValid(order[i], requiredKeys)) {
                return false;
            }
        }

        return true;
    }

    /**
     * This method calculates the group order sum and updates it in the database.
     * 
     * @returns {Promise<void>}
     */
    async updateGroupOrderSum() {
        const where = {
            "_id": this._id
        };

        const updateData = {
            "groupOrderSum": await this.calculateGroupOrderSum()
        };

        await DB.updateData(COLLECTION_NAME, updateData, ["groupOrderSum"], where);
        this.groupOrderSum = updateData["groupOrderSum"];
    }

    /**
     * This method receives metaData about the restaurant from 10bis and updates it in Groupeat's database.
     * 
     * @param {object} metaData 
     * @returns {Promise<void>}
     */
    async updateMetaData(metaData) {
        const where = {
            "_id": this._id
        };

        const updateFields = ["restaurantName", "restaurantAddress", "restaurantCityName", "restaurantLogoUrl",
                            "restaurantPhone", "restaurantCuisineKeysList", "distanceFromUser", "isActive",
                            "openTime", "closeTime", "deliveryTimeInMinutes", "estimatedArrivalTime", "longitude", "latitude",
                            "deliveryRemarks", "numOfReviews", "reviewsRank", "discountPercent", "discountAvailable",
                            "isKosher", "isVegan", "isGlutenFree", "kosherString", "deliveryFee", "deliveryFeeAmount",
                            "minimumPriceForOrder", "isPooledOrderRestaurant", "pooledOrderSum", "tags", "priorityInList",
                            "restaurantHeaderImageUrl", "isTerminalActive", "restaurantPopularityScore", "discountedDeliveryFee",
                            "minOrderTotalForDeliveryFeeDiscount", "tipEnabled", "futureOrderSupported", "metaDataUpdateDate",
                            "hasMetaData", "metaDataUpdateDate", "groupOrderSum"];
        updateFields.push("hasMetaData");
        metaData["hasMetaData"] = true;
        metaData["metaDataUpdateDate"] = new Date(new GroupeatDate().toISOString());
        metaData["groupOrderSum"] = await this.calculateGroupOrderSum();

        // Making sure we don't have any XSS attempts to the meta data, and if we do, we just filter them out.
        Helper.filterXSS(metaData, updateFields);

        await DB.updateData(COLLECTION_NAME, metaData, updateFields, where);

        this.pooledOrderSum = metaData["pooledOrderSum"];
        this.groupOrderSum = metaData["groupOrderSum"];
    }

    /**
     * This method receives an office and a list of restaurants with their metadata.
     * The method then updates the metadata for each restaurant.
     * 
     * @param {Office} office 
     * @param {Array<object>} restaurants 
     * @returns {Promise<void>}
     */
    static async updateRestaurantsMetadata(office, restaurants) {
        if (typeof restaurants === "undefined" || !restaurants.length) {
            throw new InvalidInputError("No restaurants received.", {
                "user": user,
                "office": office,
                "restaurants": restaurants
            });
        }

        if (typeof office !== "object" || !office.exists) {
            throw new InvalidInputError("Invalid office received.", {
                "user": user,
                "office": office,
                "restaurants": restaurants
            });
        }

        for (let i = 0; i < restaurants.length; i++) {
            const restaurant = new Restaurant();

            if (typeof restaurants[i]["restaurantId"] === "undefined") {
                throw new InvalidInputError("Invalid restaurant received.", {
                    "user": user,
                    "office": office,
                    "restaurants": restaurants
                });
            }

            await restaurant.initInstance(office, restaurants[i]["restaurantId"], true);
            await restaurant.updateMetaData(restaurants[i]);
            restaurant.sendAutomaticPaymentNotificationsIfPassedMinimum(office);
        }
    }

    /**
     * This method receives an array of orders and groups them according to their restaurantId.
     * 
     * @param {Array<object>} orders 
     * @returns {Array<object>}
     */
    static groupRestaurantsOrders(orders) {
        const restaurants = {};
        const restaurantsArray = [];

        for (let i = 0; i < orders.length; i++) {
            const restaurantId = orders[i]["restaurantId"];

            if (typeof restaurants[restaurantId] === "undefined") {
                restaurants[restaurantId] = orders[i];
                restaurants[restaurantId]["orders"] = [orders[i]["orders"]];
                restaurants[restaurantId]["ordersAmount"] = 1;
            }
            else{
                restaurants[restaurantId]["orders"].push(orders[i]["orders"]);
                restaurants[restaurantId]["ordersAmount"]++;
            }
        }

        for (let i in restaurants) {
            restaurantsArray.push(restaurants[i]);
        }

        return restaurantsArray;
    }

    get _id() {
        return this.__id;
    }

    set _id(_id) {
        this.__id = _id;
    }

    get exists() {
        return !Helper.isEmpty(this._id);
    }

    set restaurantId(restaurantId) {
        this._restaurantId = restaurantId;
    }

    get restaurantId() {
        return this._restaurantId;
    }

    set office_id(office_id) {
        this._office_id = office_id;
    }

    get office_id() {
        return this._office_id;
    }

    set hasMetaData(hasMetaData) {
        this._hasMetaData = hasMetaData;
    }

    get hasMetaData() {
        return this._hasMetaData;
    }

    get minimumPriceForOrder() {
        return this._minimumPriceForOrder;
    }

    set minimumPriceForOrder(minimumPriceForOrder) {
        this._minimumPriceForOrder = minimumPriceForOrder;
    }

    get pooledOrderSum() {
        return this._pooledOrderSum;
    }

    set pooledOrderSum(pooledOrderSum) {
        this._pooledOrderSum = pooledOrderSum;
    }

    get restaurantName() {
        return this._restaurantName;
    }

    set restaurantName(restaurantName) {
        this._restaurantName = restaurantName;
    }

    get restaurantLogoUrl() {
        return this._restaurantLogoUrl;
    }

    set restaurantLogoUrl(restaurantLogoUrl) {
        this._restaurantLogoUrl = restaurantLogoUrl;
    }

    get groupOrderSum() {
        return this._groupOrderSum;
    }

    set groupOrderSum(groupOrderSum) {
        this._groupOrderSum = groupOrderSum;
    }
}

// These objects are used to identify is users or restaurants are already in the middle of a process.
Restaurant.usersInAutomaticPaymentProcess = {};
Restaurant.restaurantsInAutomaticPaymentProcess = {};

module.exports = Restaurant;
