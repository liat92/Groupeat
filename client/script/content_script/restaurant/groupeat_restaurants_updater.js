/**
 * Class GroupeatRestaurantsUpdater - handles sending information about the restaurants to Groupeat
 */
class GroupeatRestaurantsUpdater {
    /**
     * This method fetches information about the restaurants from 10bis and sends the information to Groupeat.
     * This information includes important stuff like the pooledOrderSum, the restaurantName, restaurant's logo URL, etc...
     * 
     * @returns {Promise<object>}
     */
    static async sendRestaurantsToGroupeat() {
        const tenbisData = await Restaurant.getRestaurantsStatusFrom10bis();
    
        if (Helper.isEmpty(tenbisData)) {
            return;
        }
    
        const restaurants = tenbisData["Data"]["restaurantsList"];
        const requestData = await Request.getBasicRequestDataObject();

        requestData["restaurants"] = restaurants;
    
        return await Request.sendGroupeatRequest("restaurant/updateRestaurantsMetadata", requestData);
    }
}

GroupeatRestaurantsUpdater.RESTAURANTS_UPDATE_INTERVAL = 10 * 1000; // 10 seconds.

setInterval(GroupeatRestaurantsUpdater.sendRestaurantsToGroupeat, GroupeatRestaurantsUpdater.RESTAURANTS_UPDATE_INTERVAL);
