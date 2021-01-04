/**
 * Class MainTable - handles the creation of the main orders table in the main page of 10bis.
 */
class MainTable {
    /**
     * This method checks whether there is a need to add the main table to 10bis website
     * and in case there is, the methods that create the table are called, add the table to the website
     * and update the data in the table every ten seconds.
     * 
     * @returns {Promise<void>}
     */
    static async initMainTable() {
        // We need to wait for the active address to load before we can continue.
        await Office.waitForActiveAddressToLoad();

        // If the user doesn't have an active office address, then there's no point in adding the table.
        if (!Office.isActiveAddressAnOffice()) {
            return;
        }

        // If the table was already added to the website, then it shouldn't be added again.
        if (jQuery(".groupeatDiv").length) {
            return;
        }
        
        const currentTime = new Date().getHours();
        const isDisplayTime = currentTime >= MainTable.CURRENT_DAY_START_HOUR && currentTime <= MainTable.CURRENT_DAY_END_HOUR;

        //In production the table should be displayed only at relevant hours.
        if (!MainTable.IGNORE_CURRENT_DAY_TIME && !isDisplayTime) {
            return;
        }

        await MainTable.createAndAddTableToWebsite(); // Creating the main table and adding it to 10bis website.
        await MainTable.updateMainTableData(); // Adding office's orders data to the table. 
        setInterval(MainTable.updateMainTableData, MainTable.UPDATE_TABLE_INTERVAL); // Updating the data in the main table every ten seconds.
    }

    /**
     * This method creates the main table and adds the main table to the right place in 10bis website.
     * 
     * @returns {Promise<void>}
     */
    static async createAndAddTableToWebsite() {
        // Waiting for the right menu in 10bis to load.
        const rightMenuSelector = "div[class^='styled__FiltersContainer']";

        await ContentModifier.waitForElement(rightMenuSelector);
        
        // If the table was already added to the website, then it shouldn't be added again.
        if (jQuery(".groupeatDiv").length) {
            return;
        }

        const $rightMenu = jQuery(rightMenuSelector);
        const $firstMenuItem = $rightMenu.children().first();
        const $firstMenuItemContent = jQuery($firstMenuItem.children()[0]).children()[0];
        const $mainTableDiv = jQuery("<div/>", {"class": $firstMenuItem[0].className + " groupeatDiv"});
        const $titleDiv = jQuery("<div/>", {"class": $firstMenuItemContent.className + " groupeatMainTableTitleDiv"});
        const $mainTitle = jQuery("<div/>", {"class": "mainTitle"});
        const $groupeatTitle = jQuery("<div/>", {"class": "groupeatTitle"});
        const $tableDiv = jQuery("<div/>", {"class": "groupeatMainTableDiv"});
        const $table = jQuery("<table/>", {"id": "groupeatMainTable"});
        const $tableHead = jQuery("<thead/>", {"class": "fixedHeader"});

        $mainTitle.html("הזמנות משרדיות");
        $groupeatTitle.html("Groupeat");

        const $headingRow = jQuery("<tr/>");
        const $loadingImgRow = jQuery("<tr/>", {"class": "groupeatTableLoadingRow"});
        const $loadingImgTd = jQuery("<td/>", {"class": "loadingImageCell"});
        const $loadingImg = jQuery("<img/>", {"src": chrome.extension.getURL("images/loading.gif")})

        const $leftAmount = jQuery("<th/>");
        const $ordersAmount = jQuery("<th/>");
        const $restaurant = jQuery("<th/>");
        const $logo = jQuery("<th/>");

        const $tableBody = jQuery("<tbody/>", {"class": "tableContent"});
        
        $loadingImgTd.append($loadingImg);
        $loadingImgRow.append($loadingImgTd);
        $tableBody.append($loadingImgRow);

        $leftAmount.html("חסר למינימום");
        $ordersAmount.html("מספר מזמינים");
        $restaurant.html("מסעדה");

        $titleDiv.append($mainTitle);
        $titleDiv.append($groupeatTitle);
        $tableDiv.append($table);
        $mainTableDiv.append($titleDiv);
        $mainTableDiv.append($tableDiv);

        $headingRow.append($leftAmount);
        $headingRow.append($ordersAmount);
        $headingRow.append($restaurant);
        $headingRow.append($logo);
        
        $tableHead.append($headingRow);
        $table.append($tableHead);
        $table.append($tableBody);
        $rightMenu.prepend($mainTableDiv);

        // Changing the order of the menu items in the right menu in 10bis.
        $mainTableDiv.siblings(":last").prev().css({"order": 2});
        $mainTableDiv.siblings(":last").prev().prev().css({"order": 3});
    }

    /**
     * This method updates the main table according to updated data that is received from the server. 
     * 
     * @returns {Promise<void>}
     */
    static async updateMainTableData() {
        const requestData = await Request.getBasicRequestDataObject();
        const items = await Request.sendGroupeatRequest("office/getGroupOrders", requestData)
        const orders = items["result"];
    
        const $tableHead = jQuery("#groupeatMainTable").find("thead");
        const $tableBody = jQuery("#groupeatMainTable").find("tbody");
        const $loadingImgRow = jQuery("#groupeatMainTable").find(".groupeatTableLoadingRow");

        $loadingImgRow.hide();
        $tableBody.html(""); // Removing the previous items from the table.

        if (orders.length == 0) {
            $tableHead.hide();
            MainTable.addEmptyTableRow($tableBody);
            
            return;
        }        

        $tableHead.show();

        for (let i = 0; i < orders.length; i++) {
            orders[i]["leftAmount"] = MainTable.getLeftAmount(orders[i]);      
        }

        // Sorting the orders by the left amount.
        orders.sort(function(item1, item2) {
            return item1["leftAmount"] - item2["leftAmount"];
        });

        // Looping through each order and adding it to the table.
        for (let i = 0; i < orders.length; i++) {            
            MainTable.addRow(orders[i]);
        }
    }
    
    /**
     * This method receives the main table body, creates a div that contains a message that says there are no office orders,
     * and appends the div to the table body.
     * 
     * @param {object} $tableBody 
     */
    static addEmptyTableRow($tableBody) {
        const $emptyTableTd = jQuery("<td/>", {"class": "emptyTableCell"});
        const $emptyTableRow = jQuery("<tr/>", {"class": "emptyTableRow"});

        $emptyTableTd.html("לא נוספו הזמנות משרדיות");
        $emptyTableRow.append($emptyTableTd);
        $tableBody.append($emptyTableRow);
    }
    
    /**
     * This method receives an office order object and returns how much many is left to pass the minimumPriceForOrder.
     * The method returns 0 if the order passes the minimum.
     * 
     * @param {object} order
     * @returns {Float} 
     */
    static getLeftAmount(order) {
        const minimumPriceForOrder = order["minimumPriceForOrder"];
        const groupOrderSum = order["groupOrderSum"];
        const pooledOrderSum = order["pooledOrderSum"];

        return Restaurant.calculateLeftAmountToPassMinimum(minimumPriceForOrder, pooledOrderSum, groupOrderSum); 
    }
        
    /**
     * This method receives an order object, creates a row contains the order's relevant data
     * and appends it to the table.
     * 
     * @param {object} order 
     */
    static addRow(order) {
        const $mainTable = jQuery("#groupeatMainTable").find("tbody");
        const orderProps = ["leftAmount", "ordersAmount", "restaurantName", "logo"];
        const leftAmount = order["leftAmount"];
        const restaurantId = order["restaurantId"];
    
        order["leftAmount"] = leftAmount + " " + "₪";
        order["logo"] = jQuery("<img/>", {"src": order["restaurantLogoUrl"]});
        
        const $newRow = jQuery("<tr/>", {"class": "groupeatMainTableRow" + (leftAmount == 0  ? " passedTheMinimum" : "")});

        $newRow.attr("data-restaurantid", restaurantId);
        
        for (let i = 0; i < orderProps.length; i++) {
            const $td = jQuery("<td/>", {"class": "orderProp"});

            $td.html(order[orderProps[i]]);
            $newRow.append($td);
        }
    
        $newRow.on("click", function() {
            const $this = jQuery(this);
            const restaurantId = $this.data("restaurantid");
            const $restaurantLinkIn10bis = jQuery("a[href^='/next/Restaurants/Menu/Delivery/" + restaurantId + "/']");

            // This is done for performance improvements, it will not work if the restaurant link was not dynamically loaded by
            // 10bis yet.
            if ($restaurantLinkIn10bis.length) {
                $restaurantLinkIn10bis.children().click();
            }
            else {
                window.location.href = Restaurant.getRestaurantUrl(restaurantId);
            }
        }); 
        
        $mainTable.append($newRow);
    }
}

MainTable.CURRENT_DAY_START_HOUR = 7;
MainTable.CURRENT_DAY_END_HOUR = 11;
MainTable.IGNORE_CURRENT_DAY_TIME = true; // When set to false, the day starts and ends according to the CURRENT_DAY_START_HOUR and CURRENT_DAY_END_HOUR constants.
MainTable.UPDATE_TABLE_INTERVAL = 10 * 1000; // 10 seconds.

jQuery(document).ready(() => {
    MainTable.initMainTable().catch(console.log);
});

// If the page was changed, we need to init the main table again (if we're in the main 10bis page).
// This is because 10bis loads the pages dynamically.
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.message == "pageChanged") {
            jQuery(document).ready(function() {
                MainTable.initMainTable().catch(console.log);
            });
        }
    }
);
