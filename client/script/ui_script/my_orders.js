/**
 * Class MyOrdersPage - related to the my_orders.html page.
 * Contains user's orders related methods.
 */
class MyOrdersPage {
    /**
     * This method displays the unread notifications count.
     * 
     * @returns {Promise<void>}
     */
    static async displayUnreadNotificationsCount() {
        const requestData = await Request.getBasicRequestDataObject();
        const items = await Request.sendGroupeatRequest("user/getUnreadNotifications", requestData);
        const numOfUnreadNotifications = items["result"].length;
        const $notificationsAlertDiv = jQuery(".notificationsAlertDiv");

        if (numOfUnreadNotifications != 0) {
            const $notificationsIcon = jQuery("#notificationsIcon");

            $notificationsAlertDiv.html(numOfUnreadNotifications);
            $notificationsAlertDiv.show();
            $notificationsIcon.css("color", "#fff");
        }
    }
    
    /**
     * This method initializes the table of the user's orders for the current day (MyOfficeOrderTable).
     * 
     * @returns {Promise<void>}
     */
    static async initializeMyOfficeOrderTable() {
        const requestData = await Request.getBasicRequestDataObject();
        const items = await Request.sendGroupeatRequest("user/getTodayOrders", requestData);

        jQuery(".loading").hide();

        const $myOfficeOrderTable = jQuery("#myOfficeOrderTable");
        const $tbodyOfMyOfficeOrderTable = $myOfficeOrderTable.find("tbody");
        const orders = items["result"];
        const totalNumOfOrders = orders.length;

        $tbodyOfMyOfficeOrderTable.html("");

        // Loop for building my office order table dynamically
        for (let i = 0; i < totalNumOfOrders; i++) {
            orders[i].isPreviousOrder = false;
            MyOrdersPage.addOrderRowToTbody(orders[i], $tbodyOfMyOfficeOrderTable);
            MyOrdersPage.todayOrdersDates[orders[i]["dateAdded"]] = 1;
            MyOrdersPage.todayOrdersDictionary[orders[i]["restaurantId"]] = 1;
        }

        if (totalNumOfOrders == this.MAX_TOTAL_NUMBER_OF_ORDERS) {
            const $orRow = MyOrdersPage.getOrRow();

            // Adding or row after each order row except from the last one.
            $tbodyOfMyOfficeOrderTable.find(".orderDetailsRow").not(":last").after($orRow);
        }

        MyOrdersPage.displayOrHideTableContent($myOfficeOrderTable);
    }
    
    /**
     * This method receives an array of orders and an orders table and removes orders that 
     * don't exist in the array from the orders table.
     * 
     * @param {Array<object>} orders
     * @param {object} $table
     */
    static removeDeletedOrdersFromTable(orders, $table) {
        const $ordersRows = $table.find(".orderRow");

        for (let i = 0; i < $ordersRows.length; i++) {
            const $currentRow = jQuery($ordersRows[i]);
            const restaurantId = $currentRow.data("restaurantid");
            let orderFound = false;

            // Checking if the current row exists in the orders array.
            for (let j = 0; j < orders.length; j++) {
                if (orders[j]["restaurantId"] == restaurantId) {
                    orderFound = true;
                }
            }

            // If the order doesn't exist, we should remove the row from the table.
            if (!orderFound) {
                $currentRow.remove();
            }
        }

        if ($table.find(".orRow") && $table.find(".orderRow").length < MyOrdersPage.MAX_TOTAL_NUMBER_OF_ORDERS) {
            jQuery(".orRow").remove();
        }

        MyOrdersPage.displayOrHideTableContent($table);
    }

    /**
     * This method updates the orders in "myOfficeOrderTable".
     * 
     * @returns {Promise<void>}
     */
    static async updateMyOfficeOrderTable() {
        const requestData = await Request.getBasicRequestDataObject();
        const items = await Request.sendGroupeatRequest("user/getTodayOrders", requestData);
        const orders = items["result"];
        const $tbodyOfMyOfficeOrderTable = jQuery("#myOfficeOrderTable").find("tbody");

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const $existingRow = $tbodyOfMyOfficeOrderTable.find("[data-restaurantid='" + order["restaurantId"] + "']");

            if (!$existingRow.length) {
                MyOrdersPage.addOrderRowToTbody(order, $tbodyOfMyOfficeOrderTable);
            }
            else {
                const rowProperties = MyOrdersPage.getOrderRowProperties(order, $existingRow);

                for (let prop in rowProperties) {
                    $existingRow.find("." + prop).html(rowProperties[prop]);
                }
            }
        }

        MyOrdersPage.removeDeletedOrdersFromTable(orders, jQuery("#myOfficeOrderTable"));
    }
    
    /**
     * This method initializes the table that displays the user's previous orders.
     * 
     * @returns {Promise<void>}
     */
    static async initializePreviousOrderTable() {
        const $previousOrderTable = jQuery("#previousOrdersTable");

        await MyOrdersPage.addOrdersToPreviousOrderTable(0);
        $previousOrderTable.hide();
    }

    /**
     * This method add orders to the previous order table.
     * To fetch the following orders, we send with the request a parameter called step
     * which will increase by 1 each time the user presses the Load More Orders button.
     * We bring a limited number of orders from the server to reduce server load and so 
     * that this request does not take too long.
     *
     * @param {Integer} step
     * @returns {Promise<Boolean>}
     */
    static async addOrdersToPreviousOrderTable(step) {
        const $previousOrderTableTbody = jQuery("#previousOrdersTable").find("#previousOrdersTableTbody");
        const requestData = await Request.getBasicRequestDataObject();

        requestData["step"] = step;

        const items = await Request.sendGroupeatRequest("user/getAllOrders", requestData);
        const orders = items["orders"];

        // Loop for building previous order table dynamically
        for (let i = 0; i < orders.length; i++) {
            if (Helper.isEmpty(MyOrdersPage.todayOrdersDates[orders[i]["dateAdded"]])) {
                orders[i].isPreviousOrder = true;
                MyOrdersPage.addOrderRowToTbody(orders[i], $previousOrderTableTbody);
            }
        }

        jQuery(".loading").hide();

        //Just in the first time (step 0) we append load more row to table
        if (step == 0) {
            const $loadMore = MyOrdersPage.getLoadMoreOrderRow();

            $previousOrderTableTbody.append($loadMore);
        }

        return MyOrdersPage.displayOrHideLoadMoreRow(orders.length, $previousOrderTableTbody);
    }
        
    
    /**
     * This method receives numOfOrders and $tbodyOfTable and appends LoadMoreRow to $tbodyOfTable. 
     * The LoadMoreRow is displayed only if there are more previous orders.
     *
     * @param {Integer} numOfOrders
     * @param {object} $tbodyOfTable
     * @returns {Boolean}
     */
    static displayOrHideLoadMoreRow(numOfOrders, $tbodyOfTable) {
        const $loadMore = jQuery(".loadMoreRow");
        const hasMorePreviousOrder = numOfOrders == this.MAX_PREVIOUS_ORDERS_TO_DISPLAY;

        $tbodyOfTable.append($loadMore); //In order to add load more row at the end of tbody

        if (hasMorePreviousOrder) {
            $loadMore.show();
        }
        else {
            $loadMore.hide();
        }

        return hasMorePreviousOrder;
    }

    /**
     * This method receives $ordersTableTbody and displays the orders exist at $ordersTableTbody.
     * If there are no orders, then a message that no orders exist is displayed.
     * 
     * @param {object} $ordersTableTbody
     */
    static displayOrHideTableContent($ordersTableTbody) {
        const $thead = $ordersTableTbody.find("thead");
        const $tbody = $ordersTableTbody.find("tbody");
        const $tfoot = $ordersTableTbody.find(".noOrdersMessage");

        // Check if the tbody contains any order
        if ($tbody.children(".orderRow").length != 0) {
            $thead.show();
            $tbody.show();
            $tfoot.hide();
        }
        else {
            $thead.hide();
            $tbody.hide();
            $tfoot.show();
        }

        $ordersTableTbody.show();
    }

    /**
     * This method receives an order and $row (where the order will be located).
     * The method returns the order row properties object.
     *
     * @param {object} order
     * @param {object} $row
     * @returns {object}
     */
    static getOrderRowProperties(order, $row) {
        // Calculate left amount and total Amount
        let leftAmount = MyOrdersPage.getLeftAmount(order);
        let totalAmount = order["totalAmount"];
        
        totalAmount.toPrecision(2);
        leftAmount = leftAmount + " ₪";

        if (order.isPaid) {
            if (order.isPreviousOrder) {
                $row.css("background-color", "rgb(244, 255, 241)");
            }
            else {
                leftAmount = "שולם";
                $row.css("color", "rgb(40, 195, 1)");
            }
        }
        
        const rowProperties = {
            restaurantName: order["restaurantName"],
            totalAmount: totalAmount + " ₪",
            leftAmount: leftAmount
        };
        
        return rowProperties;
    }
    
    /**
     * This method receives an order and returns the left amount of the order.
     *
     * @param {object} order
     * @returns {Number}
     */
    static getLeftAmount(order) {
        const minimumPriceForOrder = order["minimumPriceForOrder"];
        const groupOrderSum = order["groupOrderSum"];
        const pooledOrderSum = order["pooledOrderSum"];
        const leftAmount = Restaurant.calculateLeftAmountToPassMinimum(minimumPriceForOrder, pooledOrderSum, groupOrderSum);

        return leftAmount;
    }

    /**
     * This method receives an order and $ordersTableTbody (where the order need to be added).
     * The method builds an order row and adds it to $ordersTableTbody.
     *
     * @param {object} order
     * @param {object} $ordersTableTbody
     */
    static addOrderRowToTbody(order, $ordersTableTbody) {
        const $newRow = jQuery("<tr/>", {"class": "orderRow", "data-restaurantid": order["restaurantId"]});
        const $deleteTd = MyOrdersPage.getDeleteTd(order);
        const $moreInfoTd = MyOrdersPage.getMoreInfoTD();

        $newRow.append($moreInfoTd);

        // If the order is a previous order, then "add order" td should be added to the order row.
        if (order.isPreviousOrder) {
            const $addOrderTD = MyOrdersPage.getAddOrderTD(order);

            $newRow.prepend($addOrderTD);
        }

        const rowProperties = MyOrdersPage.getOrderRowProperties(order, $newRow);

        for (let prop in rowProperties) {
            const $td = jQuery("<td/>", {"class": prop});

            $td.html(rowProperties[prop]);
            $newRow.append($td);
        }

        $newRow.append($deleteTd);
        $ordersTableTbody.append($newRow);

        MyOrdersPage.addMainOrderDetailsRowToTbody(order, $ordersTableTbody);
    }
    
    /**
     * This method receives an order and adds the order to the user's office order table.
     *
     * @param {object} order
     * @returns {Promise<void>}
     */
    static async addOrderToGroupeat(order) {
        const requestData = await Request.getBasicRequestDataObject();

        requestData["restaurantId"] = order["restaurantId"];
        requestData["order"] = order["order"];
        requestData["totalAmount"] = order["totalAmount"];
        requestData["shoppingCartGuid"] = order["shoppingCartGuid"];

        await Request.sendGroupeatRequest("order/addOrder", requestData);
    
        location.reload();
    }

    /**
     * This method receives an order and $ordersTableTbody (where the order need to be added).
     * The method builds a order details row and adds it to $ordersTableTbody.
     *
     * @param {object} order
     * @param {object} $ordersTableTbody
     */
    static addMainOrderDetailsRowToTbody(order, $ordersTableTbody) {
        const $newRow = jQuery("<tr/>", { "class": "orderDetailsRow" });
        const $tableTD = jQuery("<td/>", { "class": "tableContainer", "colspan": "6" });
        const $orderDetailsContainer = jQuery("<div/>", {"class": "orderDetailsContainer"});
        const $orderDetailsTable = MyOrdersPage.getDetailsTableOfOrder(order);
      
        $newRow.hide();
        $orderDetailsContainer.append($orderDetailsTable);
        $tableTD.append($orderDetailsContainer);
        $newRow.append($tableTD);
        $ordersTableTbody.append($newRow);
    }
    
     /**
     * This method receives an order and returns a table with details about the order.
     *
     * @param {object} order
     * @returns {object}
     */
    static getDetailsTableOfOrder(order) {
        const $orderDetailsTable = jQuery("<table/>", { "class": "orderDetailsTable" });
        const $tfoot = jQuery("<tfoot/>");
        const $tbody = jQuery("<tbody/>");

        // Loop for building details order table dynamically
        for (let i = 0; i < order["order"].length; i++) {
            const $detailRow = MyOrdersPage.getOrderDetailRow(order["order"][i]);

            $tbody.append($detailRow);
        }

        MyOrdersPage.addOrderExtraDetailsToTbody(order["billingLines"], $tbody);

        if (order.isPreviousOrder) {
            const $paidInfoRowAboutPreviousOrder = MyOrdersPage.getRowWithBeyondMinimumStatus(order);

            $tbody.append($paidInfoRowAboutPreviousOrder);
        }

        //Button Move To Restaurant Row:
        const $goToRestaurantRow = jQuery("<tr/>", { "class": "orderDetails" });
        const $goToRestaurantTD = jQuery("<td/>", { "class": "goToRestaurant", "colspan": "5" });
        const $goToRestaurantButton = jQuery("<button/>");

        $goToRestaurantButton.html("מעבר למסעדה");
        $goToRestaurantButton.on("click", function () {
            const restaurantUrl = Restaurant.getRestaurantUrl(order["restaurantId"]);

            window.open(restaurantUrl, "_blank");
        });

        //Appending to the table:
        $goToRestaurantTD.append($goToRestaurantButton);
        $goToRestaurantRow.append($goToRestaurantTD);
        $tfoot.append($goToRestaurantRow);
        $orderDetailsTable.append($tbody);
        $orderDetailsTable.append($tfoot);

        return $orderDetailsTable;
    }
    
    /**
     * This method receives an orderDetail object and returns a row with details about the order.
     *
     * @param {object} orderDetail
     * @returns {object}
     */
    static getOrderDetailRow(orderDetail) {
        const $newRow = jQuery("<tr/>", { "class": "orderDetails" });
        const $firstTD = jQuery("<td/>");
        const $lastTD = jQuery("<td/>");
        const $beforeLastTD = jQuery("<td/>");

        $newRow.append($firstTD);

        const item = {
            itemName: orderDetail["itemName"],
            totalAmount: orderDetail["price"] + " " + "₪"
        };

        for (let prop in item) {
            const $td = jQuery("<td/>");

            $td.html(item[prop]);
            $newRow.append($td);
        }

        $newRow.append($lastTD);
        $newRow.append($beforeLastTD);

        return $newRow;
    }
    
    /**
     * This method receives orderExtraDetails and $tbody (where the extra details will be located).
     * The method adds to the given tbody extra details about the order 
     * (details such as delivery charge, discount coupon). 
     *
     * @param {object} orderExtraDetails
     * @param {object} $tbody
     */
    static addOrderExtraDetailsToTbody(orderExtraDetails, $tbody) {
        if (!orderExtraDetails) {
            return;
        }

        for (let i = 0; i < orderExtraDetails.length; i++) {
            const detailsObj = orderExtraDetails[i];

            if (detailsObj["type"] == "DiscountCoupon" || detailsObj["type"] =="DeliveryCharge") {
                const orderDetail = {
                    itemName: detailsObj["type"] == "DeliveryCharge" ? "דמי משלוח" : "הנחה",
                    price: Math.abs(detailsObj["amount"])
                };
                const $detailRow = MyOrdersPage.getOrderDetailRow(orderDetail);

                $tbody.append($detailRow);
            }
        }
    }

    /**
     * This method receives an order and returns a row with the date the order
     * pass or did not pass the minimum in the past.
     *
     * @param {object} order
     * @returns {object}
     */
    static getRowWithBeyondMinimumStatus(order) {
        const $newRow = jQuery("<tr/>", { "class": "orderDetails" });
        const $tdWithInformation = jQuery("<td/>", { "class": "paidAndDateDetails", "colspan": "5" });

        const orderDate = (new Date(order["dateAdded"])).toLocaleDateString();
        let beyondMinimumStatus;

        if (order.isPaid) {
            beyondMinimumStatus = "ההזמנה עברה ";
            $tdWithInformation.css("color", "rgb(40, 195, 1)");
        }
        else {
            beyondMinimumStatus = "ההזמנה לא עברה ";
        }

        $tdWithInformation.html(beyondMinimumStatus + "את מינימום ההזמנה בתאריך " + orderDate);
        $newRow.append($tdWithInformation);

        return $newRow;
    }

    /**
     * This method receives an order and returns a column with addOrderIcon icon button that 
     * when clicking on it, it adds the given order to MyOfficeOrderTable
     * (provided that there is no paid order and that the number of orders has not exceeded the maximum).
     *
     * @param {object} order
     * @returns {object}
     */
    static getAddOrderTD(order) {
        const $addOrderTd = jQuery("<td/>", { "title": "הוסף הזמנה לטבלת ההזמנה המשרדית שלי" });
        const $addOrderIcon = jQuery("<i/>", { "class": MyOrdersPage.ADD_ORDER_ICON_CLASS_NAME});
        
        const $tbodyOfMyOfficeOrderTable = jQuery("#myOfficeOrderTable").find("tbody");
        const existPaidOrderAtMyOfficeOrderTable = MyOrdersPage.isExistPaidOrderAtTbody($tbodyOfMyOfficeOrderTable);
        const totalNumOfOrders = $tbodyOfMyOfficeOrderTable.children(".orderRow").length;

        // Disable Or Enable adding Of Orders
        if (totalNumOfOrders >= this.MAX_TOTAL_NUMBER_OF_ORDERS || existPaidOrderAtMyOfficeOrderTable) {
            $addOrderIcon.toggleClass("disabled");
        } 

        $addOrderIcon.on("click", function () {
           MyOrdersPage.addOrderEventHandler(jQuery(this),order);
        });

        $addOrderTd.append($addOrderIcon);

        return $addOrderTd;
    }
    
    /**
    * This method receives $tbodyOfTable and returns whether there is a paid order at the given tbody.
    *
    * @param {object} $tbodyOfTable
    * @returns {Boolean}
    */
    static isExistPaidOrderAtTbody($tbodyOfTable) {
        const $arrayOfLeftAmountTd = $tbodyOfTable.children(".orderRow").children(".leftAmount");

        for (let i = 0; i < $arrayOfLeftAmountTd.length; i++) {
            if ($arrayOfLeftAmountTd[i].innerText === "שולם" || $arrayOfLeftAmountTd[i].innerText === "0") {
                return true;
            }
        }

        return false;
    }
    
    /**
     * This method receives a clickedIcon (the icon that the user click on) and an order.
     * The method asks from the user to approve adding the order to the table and 
     * informs it positively if the order goes beyond the minimum.
     * The method also check if the given order already exist in MyOfficeOrderTable 
     * by using a dictionary that stores all the orders found at MyOfficeOrderTable.
     *  
     * @param {object} clickedIcon
     * @param {object} order
     */
    static addOrderEventHandler(clickedIcon, order) {        
        if (clickedIcon.hasClass("disabled")) {
            return;
        }

        const confirmed = confirm(" בעת לחיצה על כפתור זה ההזמנה תתווסף לכלל ההזמנות ב- Groupeat ממסעדה זו למשרדך. במידה וסך ההזמנות יעבור את מינימום ההזמנה הנדרש, תחויב/י עבור הזמנה זו באופן אוטומטי.");

        if (confirmed) {
            const restaurantId = order["restaurantId"];
            const isOrderAlreadyExists = !(Helper.isEmpty(MyOrdersPage.todayOrdersDictionary[restaurantId]));

            if (isOrderAlreadyExists) {
                const replaceExistOrder = confirm("קיימת לך הזמנה משרדית ממסעדת " + order["restaurantName"] + ", האם אתה מעוניין להחליף אותה בהזמנה זו?");

                if (!replaceExistOrder) {
                    return;
                }

                MyOrdersPage.cancelOrderByRestaurantId(restaurantId).catch(console.log); 
            }

            MyOrdersPage.addOrderToGroupeat(order);
        }
    }
 
    /**
     * This method returns a row which separates between components by dividing line with the word 'או".
     *
     * @returns {object}
     */
     static getOrRow() {
        const $orRow = jQuery("<tr/>", { "class": "orRow" });
        const $td = jQuery("<td/>", { "colspan": "5" });
        const $span = jQuery("<span/>");

        $span.html("או");
        $td.append($span);
        $orRow.append($td);

        return $orRow;
    }

    /**
     * This method returns a column with moreInfoIcon icon button that 
     * when clicking on it, it opens a row that includes more information
     * about the order.
     *
     * @returns {object}
     */
    static getMoreInfoTD() {
        const $moreInfoTd = jQuery("<td/>", { "title": "פירוט" });
        const $moreInfoIcon = jQuery("<i/>", { "class": MyOrdersPage.MORE_INFO_ARROW_DOWN_ICON_CLASS_NAME, "data-isopened": "0" });

        $moreInfoIcon.on("click", function () {
            const $this = jQuery(this);

            MyOrdersPage.displayOrderInfo($this);
        });

        $moreInfoTd.append($moreInfoIcon);

        return $moreInfoTd;
    }

    /**
     * This method recives $clickedArrow and displays/hides the information
     * about the order that the clickedArrow belongs to. 
     *
     * @param {object} $clickedArrow
     */
    static displayOrderInfo($clickedArrow) {
        const $orderDetailRow = $clickedArrow.parent().parent().next();
        const isOpened = parseInt($clickedArrow.attr("data-isopened")) == 1;

        if (isOpened) {
            $orderDetailRow.hide();
            $clickedArrow.toggleClass(MyOrdersPage.UP_ICON_CLASS_NAME + " " + MyOrdersPage.DOWN_ICON_CLASS_NAME);
        }
        else {
            $orderDetailRow.show();
            $clickedArrow.toggleClass(MyOrdersPage.DOWN_ICON_CLASS_NAME + " " + MyOrdersPage.UP_ICON_CLASS_NAME);
        }

        $clickedArrow.attr("data-isopened", +!isOpened);
    }

    /**
     * This method receives an order and returns a column with a trashCanIcon icon button that 
     * when clicking on it, it removes the given order.
     *
     * @param {object} order
     * @returns {object}
     */
    static getDeleteTd(order) {
        const restaurantId = order["restaurantId"];
        const $deleteTd = jQuery("<td/>", { "title": "מחק הזמנה" });
        const $deleteIcon = jQuery("<i/>", { "class": MyOrdersPage.TRASH_CAN_ICON_CLASS_NAME });

        $deleteIcon.on("click", function () {
            const $this = jQuery(this);

            $this.parent().parent().next().remove(); // Removing the order's details row.
            $this.parent().parent().remove(); // Removing the order's row.

            if (order.isPreviousOrder) {
                MyOrdersPage.deleteOrderByRestaurantIdAndDateAdded(restaurantId, order["dateAdded"]).catch(console.log);
                MyOrdersPage.displayOrHideTableContent(jQuery("#previousOrdersTable"));
            }
            else {
                MyOrdersPage.cancelOrderByRestaurantId(restaurantId).catch(console.log);
                MyOrdersPage.displayOrHideTableContent(jQuery("#myOfficeOrderTable"));
            }
        });

        $deleteTd.append($deleteIcon);

        return $deleteTd;
    }

     /**
     * This method receives a restaurantId and cancels the order 
     * (the order will be deleted from MyOfficeOrderTable).
     *
     * @param {integer} restaurantId
     * @returns {Promise<void>}
     */
    static async cancelOrderByRestaurantId(restaurantId) {
        const requestData = await Request.getBasicRequestDataObject();

        requestData["restaurantId"] = restaurantId;
        await Request.sendGroupeatRequest("order/cancelOrder", requestData);

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                "type": "groupeatOrderCanceled",
                "restaurantId": restaurantId
            });
        });

        location.reload();
    }

    /**
     * This method receives restaurantId and dateAdded and deletes the order.
     * (the order will be deleted from PreviousOrderTable).
     *
     * @param {Integer} restaurantId
     * @param {Date} dateAdded
     * @returns {Promise<void>}
     */
    static async deleteOrderByRestaurantIdAndDateAdded(restaurantId, dateAdded) {
        const requestData = await Request.getBasicRequestDataObject();

        requestData["restaurantId"] = restaurantId;
        requestData["dateAdded"] = dateAdded;
        await Request.sendGroupeatRequest("order/removeOrder", requestData);
    }

     /**
     * This method returns a row that contains a button that when clicking on it
     * loads more previous orders that will be added to PreviousOrderTable.
     *
     * @returns {object}
     */
    static getLoadMoreOrderRow() {
        const $loadMoreRow = jQuery("<tr/>", { "class": "loadMoreRow" });
        const $loadMoreCell = jQuery("<td/>", { "colspan": "6" });
        const $divLoadMore = jQuery("<div/>", {"class": "loadingButtonDiv"});
        const $loadMoreButton = jQuery("<button/>", { "id": "loadPreviousOrdersBtn" });
        const $loadMoreIcon = jQuery("<i/>", { "class": MyOrdersPage.LOAD_MORE_ICON_CLASS_NAME });
        const $loadingImgDiv = jQuery("<div/>", {"class": "loading"});
        const $loadingImg = jQuery("<img/>", { "src": "images/loading.gif" });

        $loadMoreButton.html("טען הזמנות נוספות");
        $loadingImgDiv.append($loadingImg);
        $loadMoreButton.append($loadMoreIcon);
        $divLoadMore.append($loadMoreButton);
        $loadMoreCell.append($divLoadMore);
        $loadMoreCell.append($loadingImgDiv);
        $loadMoreRow.append($loadMoreCell);

        $loadMoreButton.on("click", async function () {
            const $previousOrdersTable = jQuery("#previousOrdersTable");

            jQuery(".loadMoreRow").find(".loadingButtonDiv").hide();
            jQuery(".loadMoreRow").find(".loading").show();

            const step = parseInt($previousOrdersTable.attr("data-step"));
            const hasMorePreviousOrder = await MyOrdersPage.addOrdersToPreviousOrderTable(step);

            jQuery(".loadMoreRow").find(".loading").hide();
            $previousOrdersTable.attr("data-step", (step + 1).toString());

            if (hasMorePreviousOrder) {
               jQuery(".loadMoreRow").find(".loadingButtonDiv").show();
            }
        });

        return $loadMoreRow;
    }

    /**
     * This method initializes the previous orders button's functionality.
     */
    static initPreviousOrdersButton() {
        jQuery("#previousOrdersBtn").on("click", async function() {
            const $previousOrderTable = jQuery("#previousOrdersTable");
            const $this = jQuery(this);
            const isOpened = parseInt($this.attr("data-isopened")) == 1;

            $this.attr("data-isopened", +!isOpened);

            if (isOpened) {
                $previousOrderTable.hide();
            }
            else {
                jQuery(".previousOrders").find(".loading").show();
                await MyOrdersPage.initializePreviousOrderTable();
                MyOrdersPage.displayOrHideTableContent($previousOrderTable);
                $previousOrderTable.attr("data-step", 1);
            }
            
            jQuery(".previousOrders").find(".loading").hide();
            $this.toggleClass("active");
        });
    }

    /**
     * This method initializes the page's functionality.
     */
    static init() {
        MyOrdersPage.displayUnreadNotificationsCount();
        MyOrdersPage.initializeMyOfficeOrderTable();
        MyOrdersPage.initPreviousOrdersButton();

        setInterval(MyOrdersPage.updateMyOfficeOrderTable, MyOrdersPage.TABLE_UPDATE_INTERVAL);
    }
}

// Constants
MyOrdersPage.MAX_PREVIOUS_ORDERS_TO_DISPLAY = 20;
MyOrdersPage.MAX_TOTAL_NUMBER_OF_ORDERS = 2;
MyOrdersPage.TABLE_UPDATE_INTERVAL = 10 * 1000; // 10 seconds.
MyOrdersPage.MORE_INFO_ARROW_DOWN_ICON_CLASS_NAME = "fas fa-chevron-down moreInfoIcon"; 
MyOrdersPage.MORE_INFO_ARROW_UP_ICON_CLASS_NAME = "fas fa-chevron-up moreInfoIcon";
MyOrdersPage.DOWN_ICON_CLASS_NAME = "fa-chevron-down"; 
MyOrdersPage.UP_ICON_CLASS_NAME = "fa-chevron-up";
MyOrdersPage.TRASH_CAN_ICON_CLASS_NAME = "fas fa-trash-alt trashIcon";
MyOrdersPage.ADD_ORDER_ICON_CLASS_NAME = "fas fa-plus addOrderIcon ";
MyOrdersPage.LOAD_MORE_ICON_CLASS_NAME = "fas fa-chevron-circle-down";

MyOrdersPage.todayOrdersDates = {};
MyOrdersPage.todayOrdersDictionary = {};

// Fetching the __NEXT_DATA__ object from 10bis.
new NextDataFetcher().getNextData(() => {
    jQuery(document).ready(() => {
        MyOrdersPage.init();
    });
});
