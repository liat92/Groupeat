/**
 * Class AddUpdateRestaurantOrder - handles adding, updating and deleting orders in the restaurant page.
 */
class AddUpdateRestaurantOrder {
    /**
     * This method returns whether the 'add order' button exists in the page or not.
     * 
     * @returns {Boolean}
     */
    static addOrderButtonExists() {
        return !Helper.isEmpty(jQuery(".groupeatAddOrder").length);
    }

    /**
     * This method returns whether the 'update order' and 'delete order' buttons exist in the page or not.
     * 
     * @returns {Boolean}
     */
    static updateButtonsExist() {
        return !Helper.isEmpty(jQuery(".groupeatUpdateOrder").length);
    }

    /**
     * This method handles a situation where the user has an order but he decided to clear his shopping cart.
     * In this case, we should cancel his order in Groupeat.
     */
    static handleCompleteOrderDeletion() {
        const $shoppingCartContainer = jQuery("div[class^='ShoppingCartViewstyled__Root']");
    
        ContentModifier.addNodeChangedEvent($shoppingCartContainer[0], observer => {
            const $emptyOrderDiv = jQuery("p[class^='ShoppingCartViewstyled__EmptyCartText']");
            const $updateButtons = jQuery(".groupeatUpdateOrder");
    
            // Checking if the update buttons exist but also the user removed everything from the shopping cart.
            if ($updateButtons.length && $emptyOrderDiv.length && !observer.disconnected) {
                observer.disconnect();
                AddUpdateRestaurantOrder.cancelOrder();
            }
        });
    }

    /**
     * This method adds metadata to an order's items.
     * The metadata that is added is the item's name and the item's price.
     * 
     * @param {object} order 
     */
    static addItemsMetaData(order) {
        const $items = jQuery("div[class^='ShoppingCartDishesstyled__DishWrapper']");
    
        for (let i = 0; i < $items.length; i++) {
            const $item = jQuery($items[i]);
            const $itemNameContainer = $item.find("div[class*='ShoppingCartDishesstyled__DishName']");
            const $priceContainer = $item.find("div[class^='PriceLabel__Root']").find("div");

            // Getting the item's name and price.
            const itemName = $itemNameContainer.html();
            let price = parseFloat($priceContainer.html().substr(9));

            // There are a 2 ways of how the price is displayed, so if the first condition was not a number
            // we should try the second one.
            if (isNaN(price)) {
                price = parseFloat($priceContainer.html().substr(1));
            }
    
            // Adding the item's name and price to the order.
            order[i]["itemName"] = itemName;
            order[i]["price"] = price;
        }
    }
    
    /**
     * This method receives a billingLines array for a given order and returns the total amount that will
     * be charged from the user.
     * 
     * @param {Array<object>} billingLines 
     * @returns {Float}
     */
    static getTotalAmountFromBillingLines(billingLines) {
        for (let i = 0; i < billingLines.length; i++) {
            if (billingLines[i]["type"] == "TotalToCharge") {
                return billingLines[i]["amount"];
            }
        }
    }

    /**
     * This method returns the current user's shopping cart in 10bis.
     * 
     * @returns {object}
     */
    static getShoppingCart() {
        const $interceptedData = jQuery("#__interceptedData_SetDishListInShoppingCart");
        let shoppingCart;
    
        // Checking whether the data was received as intercepted data or the data was received from the page load.
        if ($interceptedData.length) {
            const interceptedData = JSON.parse($interceptedData.html());
    
            shoppingCart = interceptedData["Data"]["shoppingCart"];
            shoppingCart["dishes"] = shoppingCart["dishToSubmitList"];
        }
        else {
            shoppingCart = __NEXT_DATA__["props"]["initialProps"]["initialState"]["shoppingCart"];
        }

        return shoppingCart;
    }
    
    /**
     * This method receives a boolean value indicating whether we should send an update order or an order creation
     * request and sends the corresponding request (order/updateOrder or order/addOrder) to Groupeat.
     * 
     * @param {Boolean} isUpdate 
     * @returns {Promise<object>}
     */
    static async sendOrderRequest(isUpdate) {
        const restaurantId = AddUpdateRestaurantOrder.getCurrentRestaurantId();
        const shoppingCart = AddUpdateRestaurantOrder.getShoppingCart();
        const dishList = shoppingCart["dishes"]; // Getting the order's items from the shopping cart.
        const billingLines = shoppingCart["billingLines"]; // This includes discounts and additional shipping costs.
    
        // Adding the items' names and prices.
        AddUpdateRestaurantOrder.addItemsMetaData(dishList);
    
        const totalAmount = AddUpdateRestaurantOrder.getTotalAmountFromBillingLines(shoppingCart["billingLines"]);
        const requestPath = isUpdate ? "order/updateOrder" : "order/addOrder";
        const requestData = await Request.getBasicRequestDataObject();

        requestData["restaurantId"] = restaurantId;
        requestData["order"] = dishList;
        requestData["billingLines"] = billingLines;
        requestData["totalAmount"] = totalAmount;
        requestData["shoppingCartGuid"] = Restaurant.getShoppingCartGuid();
    
        return await Request.sendGroupeatRequest(requestPath, requestData);
    }
    
    /**
     * This method adds a new order in Groupeat according to the current shopping cart.
     * 
     * @returns {Promise<Boolean>}
     */
    static async addOrder() {
        return await AddUpdateRestaurantOrder.sendOrderRequest(false);
    }
    
    /**
     * This method updates the current order in Groupeat according to the current shopping cart.
     * 
     * @returns {Promise<Boolean>}
     */
    static async updateOrder() {
        return await AddUpdateRestaurantOrder.sendOrderRequest(true);
    }
    
    /**
     * This method cancels the order in Groupeat.
     * 
     * @returns {Promise<Boolean}
     */
    static async cancelOrder() {
        const restaurantId = AddUpdateRestaurantOrder.getCurrentRestaurantId();
        const requestData = await Request.getBasicRequestDataObject();

        requestData["restaurantId"] = restaurantId;
    
        return await Request.sendGroupeatRequest("order/cancelOrder", requestData);
    }

    /**
     * This method returns the current restaurant's restaurantId according to the restaurant page's url.
     * 
     * @returns {Integer}
     */
    static getCurrentRestaurantId() {
        return Restaurant.getRestaurantIdFromRestaurantUrl(window.location.href);
    }
    
    /**
     * This method sends the existing order that we have in Groupeat to 10bis.
     * If the cart is not empty, the order will not be sent. 
     * 
     * @returns {Promise<void>}
     */
    static async setExistingOrderInShoppingCart() {
        const $emptyOrderDiv = jQuery("p[class^='ShoppingCartViewstyled__EmptyCartText']");
    
        if (!$emptyOrderDiv.length) {
            return;
        }

        const restaurantId = AddUpdateRestaurantOrder.getCurrentRestaurantId();

        await Restaurant.setExistingOrderInShoppingCart(restaurantId);
        window.location.reload();
    }

    /**
     * This method checks if the order in the shopping cart passes the required minimum with the current group order
     * in 10bis and adds a notice that the shopping cart passed the minimum or displays how much money is left to pass
     * the minimum with the given shopping cart.
     * 
     * @returns {Promise<void>}
     */
    static async addShoppingCartPassedMinimumNotice() {
        // If the restaurant already passed the minimum or the add / update buttons are not present, we
        // should not display any notice.
        if ((!AddUpdateRestaurantOrder.addOrderButtonExists() && !AddUpdateRestaurantOrder.updateButtonsExist()) || jQuery(".groupeatAlreadyPassedMinimumText").length) {
            return;
        }

        // Getting the restaurant's details as they are in Groupeat.
        // We need this for the pooledOrderSum and groupOrderSum.
        const restaurantDetails = await AddUpdateRestaurantOrder.getRestaurantDetailsFromGroupeat();

        // This generally should never happen but just in case...
        if (Helper.isEmpty(restaurantDetails)) {
            return;
        }

        // Getting the info we need in order to display the correct message to the user.
        const shoppingCart = AddUpdateRestaurantOrder.getShoppingCart();
        const totalAmount = AddUpdateRestaurantOrder.getTotalAmountFromBillingLines(shoppingCart["billingLines"]);
        const minimumPriceForOrder = restaurantDetails["minimumPriceForOrder"];
        const pooledOrderSum = restaurantDetails["pooledOrderSum"];
        const groupOrderSum = restaurantDetails["groupOrderSum"];

        const $addOrder = jQuery(".groupeatAddOrder");
        const $updateOrder = jQuery(".groupeatUpdateOrder");
        const $passedMinimumNotice = jQuery("<div/>", {"class": "groupeatWillPassMinimumNotice"});
        const $leftAmountNotice = jQuery("<div/>", {"class": "groupeatLeftAmountNotice"});

        // The calculation and text are different for order update and order creation.
        if (AddUpdateRestaurantOrder.updateButtonsExist()) {
            const restaurantId = AddUpdateRestaurantOrder.getCurrentRestaurantId();
            const currentOrderInGroupeat = await Restaurant.getRestaurantOrderFromGroupeat(restaurantId);
            let currentOrderTotalAmount = 0;

            // There should always be an order in this case, but just in case something wrong happened...
            if (!Helper.isEmpty(currentOrderInGroupeat)) {
                currentOrderTotalAmount = currentOrderInGroupeat["totalAmount"];
            }

            // Calculating the new left amount to pass the minimum according to the shopping cart.
            const totalAmountDelta = totalAmount - currentOrderTotalAmount;
            const leftAmountWithShoppingCart = Restaurant.calculateLeftAmountToPassMinimum(minimumPriceForOrder, pooledOrderSum, groupOrderSum + totalAmountDelta);

            jQuery(".groupeatLeftAmountNotice").remove();

            if (leftAmountWithShoppingCart <= 0) {
                // If we didn't add this notice yet, we should add it.
                if (!jQuery(".groupeatWillPassMinimumNotice").length) {
                    $passedMinimumNotice.html("בעת עדכון הזמנה זו, ההזמנה המשרדית צפויה לעבור את מינימום ההזמנה הנדרש ותחויב באופן מיידי.");
                    $updateOrder.after($passedMinimumNotice);
                }
            }
            else {
                // Adding how much money is left to pass the minimum according to the shopping cart.
                jQuery(".groupeatWillPassMinimumNotice").remove();
                $leftAmountNotice.html("לאחר עדכון ההזמנה הסכום החסר למינימום צפוי להיות: " + leftAmountWithShoppingCart + " ₪");
                $updateOrder.after($leftAmountNotice);
            }
        }
        else {
            jQuery(".groupeatLeftAmountNotice").remove();

            const leftAmountWithShoppingCart = Restaurant.calculateLeftAmountToPassMinimum(minimumPriceForOrder, pooledOrderSum, groupOrderSum + totalAmount);

            if (leftAmountWithShoppingCart <= 0) {
                // If we didn't add this notice yet, we should add it.
                if (!jQuery(".groupeatWillPassMinimumNotice").length) {
                    $passedMinimumNotice.html("בעת הוספת הזמנה זו, ההזמנה המשרדית צפויה לעבור את מינימום ההזמנה הנדרש ותחויב באופן מיידי.");
                    $addOrder.after($passedMinimumNotice);
                }
            }
            else {
                // Adding how much money is left to pass the minimum according to the shopping cart.
                jQuery(".groupeatWillPassMinimumNotice").remove();
                $leftAmountNotice.html("לאחר הצטרפות הסכום החסר למינימום צפוי להיות: " + leftAmountWithShoppingCart + " ₪");
                $addOrder.after($leftAmountNotice);
            }
        }
    }

    /**
     * This method adds a handler that checks when the shopping cart is changed, and when the shopping cart is changed
     * it adds a notice of how close the shopping cart is to pass the required minimum.
     */
    static addShoppingCartPassedMinimumHandler() {
        // We're setting an interval until the groupeatInterceptedRequests div is created, because we need to
        // listen to the SetDishListInShoppingCart request, because we know the cart was changed when this request
        // was sent.
        const inter = setInterval(() => {
            const $interceptedRequests = jQuery(".groupeatInterceptedRequests");

            if (!$interceptedRequests.length || (!AddUpdateRestaurantOrder.addOrderButtonExists() && !AddUpdateRestaurantOrder.updateButtonsExist())) {
                return;
            }

            clearInterval(inter);

            AddUpdateRestaurantOrder.addShoppingCartPassedMinimumNotice();

            // Detecting when the menu was changed by according to the intercepted SetDishList requests that are sent to 10bis.
            ContentModifier.addNodeChangedEvent($interceptedRequests[0], async function() {
                if (!$interceptedRequests.find("#__interceptedData_SetDishListInShoppingCart")) {
                    return;
                }

                await AddUpdateRestaurantOrder.addShoppingCartPassedMinimumNotice();
            });
        }, 200);
    }

    /**
     * This method handles what happens when the user clicks on the 'update order' button.
     * 
     * @returns {Promise<void>}
     */
    static updateOrderButtonClickHandler() {
        // We should not let the user click this button twice, so if the user is in the middle of updating an order,
        // we should return.
        if (AddUpdateRestaurantOrder.isUpdatingOrder) {
            return;
        }

        AddUpdateRestaurantOrder.isUpdatingOrder = true;

        // Updating the order in Groupeat.
        return AddUpdateRestaurantOrder.updateOrder()
        .then(() => {
            alert("ההזמנה המשרדית עודכנה בהצלחה");
            AddUpdateRestaurantOrder.isUpdatingOrder = false;
        })
        .catch(() => {
            AddUpdateRestaurantOrder.isUpdatingOrder = false;
        });
    }

    /**
     * This method handles what happens when the user clicks on the 'delete order' button.
     * 
     * @returns {Promise<void>}
     */
    static deleteOrderButtonClickHandler() {
        // We should not let the user click this button twice, so if the user is in the middle of canceling an order,
        // we should return.
        if (AddUpdateRestaurantOrder.isCancelingOrder) {
            return;
        }

        AddUpdateRestaurantOrder.isCancelingOrder = true;

        // Canceling the order in Groupeat.
        return AddUpdateRestaurantOrder.cancelOrder()
        .then(() => {
            AddUpdateRestaurantOrder.removeUpdateButtons();
            AddUpdateRestaurantOrder.addButtonsIfNotExist(false);
            AddUpdateRestaurantOrder.addShoppingCartPassedMinimumNotice();
            AddUpdateRestaurantOrder.isCancelingOrder = false;
        })
        .catch(() => {
            AddUpdateRestaurantOrder.isCancelingOrder = false;
        });
    }

    /**
     * This method handles what happens when the user clicks on the 'add order' button.
     * 
     * @returns {Promise<void>}
     */
    static addOrderButtonClickHandler() {
        if (AddUpdateRestaurantOrder.isAddingOrder) {
            return;
        }

        AddUpdateRestaurantOrder.isAddingOrder = true;

        return Notification.requestPermission().then(permission => {
            if (permission != "granted") {
                alert("אנא אשר קבלת התראות על מנת שתוכל להשתמש בתוסף באופן תקין.");
                throw new Error();
            }

            return AddUpdateRestaurantOrder.addOrder();
        })
        .then(() => {
            AddUpdateRestaurantOrder.removeAddOrderButton();
            AddUpdateRestaurantOrder.handleCompleteOrderDeletion();
            AddUpdateRestaurantOrder.addButtonsIfNotExist(true);
            AddUpdateRestaurantOrder.addShoppingCartPassedMinimumNotice();
            AddUpdateRestaurantOrder.isAddingOrder = false;
        })
        .catch(err => {
            if (typeof err === "object" && typeof err["error"] !== "undefined") {
                switch (err["error"]) {
                    case AlreadyExistsError.ERROR_ID:
                        alert("קיימות 2 הזמנות במערכת. אנא מחק אחת מהן ונסה שנית.");

                        break;
                    case PaidOrderExistsError.ERROR_ID:
                        alert("קיימת הזמנה ששולמה ולכן לא ניתן להצטרף להזמנה חדשה.");
                        
                        break;
                }
            }

            AddUpdateRestaurantOrder.isAddingOrder = false;
        });
    }

    /**
     * This method creates the update buttons and adds them to the shopping cart.
     * 
     * @returns {Promise<void>}
     */
    static async createUpdateButtons() {
        const $proceedToPaymentDivs = jQuery("div[class^='ShoppingCartDishesstyled__PaymentContainer']");
        const $proceedToPaymentButtons = $proceedToPaymentDivs.find("button");
    
        // If we already added the update buttons or the proceed to payment area is not present, we should not continue.
        if (!$proceedToPaymentDivs.length || AddUpdateRestaurantOrder.addOrderButtonExists() || AddUpdateRestaurantOrder.updateButtonsExist()) {
            return;
        }
    
        // Creating the update and delete buttons.
        const $updateDiv = jQuery("<div/>", {"class": $proceedToPaymentDivs[0].className + " groupeatUpdateOrder"});
        const $updateOrderButton = jQuery("<button/>", {"class": $proceedToPaymentButtons[0].className + " groupeatUpdateOrderButton"});
        const $deleteOrderButton = jQuery("<button/>", {"class": $proceedToPaymentButtons[0].className + " groupeatDeleteOrderButton"});
        const $updateOrderButtonText = jQuery("<span/>", {"class": "groupeatButtonText"});
        const $deleteOrderButtonText = jQuery("<span/>", {"class": "groupeatButtonText"});
    
        $updateOrderButton.on("click", function() {
            AddUpdateRestaurantOrder.updateOrderButtonClickHandler();
        });
    
        $deleteOrderButton.on("click", function() {
            AddUpdateRestaurantOrder.deleteOrderButtonClickHandler();
        });
    
        // Adding text to the buttons and helpful tooltips.
        $updateOrderButtonText.html("עדכון הזמנה משרדית");
        $deleteOrderButtonText.html("מחיקת הזמנה משרדית");
        UIHelper.addTooltip($updateOrderButton, "בעת לחיצה על כפתור זה הזמנתך ב- Groupeat תתעדכן.<br/><span style='font-weight: bold;'>אם לאחר העדכון סך ההזמנות ממסעדה זו למשרדך יעבור את מינימום ההזמנה הנדרש, תחויב/י עבור הזמנה זו באופן אוטומטי.</span>", false, 200, "font-weight: 100;");
        UIHelper.addTooltip($deleteOrderButton, "בעת לחיצה על כפתור זה הזמנתך תבוטל ולא תחויב/י באופן אוטומטי עבורה.", false, 200);

        $updateOrderButton.append($updateOrderButtonText);
        $deleteOrderButton.append($deleteOrderButtonText);
        $updateDiv.append($updateOrderButton);
        $updateDiv.append($deleteOrderButton);
    
        // Adding the buttons to the shopping cart.
        $proceedToPaymentDivs.after($updateDiv);

        const restaurantId = AddUpdateRestaurantOrder.getCurrentRestaurantId();
        const existingOrder = await Restaurant.getRestaurantOrderFromGroupeat(restaurantId);

        // Checking if the time to order has passed / didn't arrive yet, and if so we don't allow the user to update
        // his order.
        if (!AddUpdateRestaurantOrder.ALLOW_PAID_ORDER_UPDATE && !Helper.isEmpty(existingOrder) && !Helper.isEmpty(existingOrder["isPaid"])) {
            jQuery(".groupeatUpdateOrderButton").attr("disabled", "disabled");
            jQuery(".groupeatDeleteOrderButton").attr("disabled", "disabled");
        }
    }

    /**
     * This method checks if the restaurant already passed the minimum and if so, displays a notice to the user.
     * 
     * @returns {Promise<Boolean>} Returns true if the notice was added and false otherwise.
     */
    static async addRestaurantAlreadyPassedMinimumNotice() {
        const $proceedToPaymentDivs = jQuery("div[class^='ShoppingCartDishesstyled__PaymentContainer']");

        if (await AddUpdateRestaurantOrder.isRestaurantPassedMinimumOrder()) {
            // Checking that we didn't add this notice yet.
            if (!jQuery(".groupeatAlreadyPassedMinimumText").length) {
                const $alreadyPassedMinimumDiv = jQuery("<div/>", {"class": "groupeatAlreadyPassedMinimumText"});

                $alreadyPassedMinimumDiv.html("המסעדה עברה את המינימום הנדרש.");
                $proceedToPaymentDivs.after($alreadyPassedMinimumDiv);
                jQuery(".groupeatWillPassMinimumNotice,.groupeatLeftAmountNotice").remove();
            }
            
            return true;
        }

        return false;
    }

    /**
     * This method checks if the user can't make a new order, and if so displays a notice to the user. 
     * 
     * @returns {Promise<Boolean>} Returns true if the notice was added and false otherwise.
     */
    static async addUserCannotMakeNewOrderNotice() {
        const canUserMakeNewOrder = await AddUpdateRestaurantOrder.canUserMakeNewOrder();
        const $proceedToPaymentDivs = jQuery("div[class^='ShoppingCartDishesstyled__PaymentContainer']");

        if (!canUserMakeNewOrder["result"]) {
            // Checking that we didn't add this notice yet.
            if (!jQuery(".groupeatCannotMakeNewOrder").length) {
                const $cannotMakeOrderDiv = jQuery("<div/>", {"class": "groupeatCannotMakeNewOrder"});

                $cannotMakeOrderDiv.html(canUserMakeNewOrder["reason"]);
                $proceedToPaymentDivs.after($cannotMakeOrderDiv);
            }
            
            return true;
        }

        return false;
    }

    /**
     * This method creates the 'add order' button and adds it to the shopping cart.
     * 
     * @returns {Promise<void>}
     */
    static async createAddOrderButton() {
        const $proceedToPaymentDivs = jQuery("div[class^='ShoppingCartDishesstyled__PaymentContainer']");
    
        // Checking if the payment div exists.
        if (AddUpdateRestaurantOrder.isAddingAddOrderButton || !$proceedToPaymentDivs.length || AddUpdateRestaurantOrder.addOrderButtonExists() || AddUpdateRestaurantOrder.updateButtonsExist()) {
            return;
        }

        // Marking that we're already in the process of adding the button to make sure we don't accidently
        // add the button multiple times.
        AddUpdateRestaurantOrder.isAddingAddOrderButton = true;

        // Checking if we should add notices instead of adding the order itself.
        if (await AddUpdateRestaurantOrder.addRestaurantAlreadyPassedMinimumNotice()) {
            AddUpdateRestaurantOrder.isAddingAddOrderButton = false;
            return;
        }
        else if (await AddUpdateRestaurantOrder.addUserCannotMakeNewOrderNotice()) {
            AddUpdateRestaurantOrder.isAddingAddOrderButton = false;
            return;
        }

        // Removing any notices we put before as they are irrelevant now.
        jQuery(".groupeatAlreadyPassedMinimumText,.groupeatCannotMakeNewOrder").remove();
    
        // Creating the button.
        const $proceedToPaymentButtons = $proceedToPaymentDivs.find("button");
        const $addOrderDiv = jQuery("<div/>", {"class": $proceedToPaymentDivs[0].className + " groupeatAddOrder"});
        const $addOrderButton = jQuery("<button/>", {"class": $proceedToPaymentButtons[0].className + " groupeatAddOrderButton"});
        const $addOrderButtonText = jQuery("<span/>", {"class": "groupeatButtonText"});
    
        $addOrderButton.on("click", function() {
            AddUpdateRestaurantOrder.addOrderButtonClickHandler();
        });
    
        // Adding text to the button and a helpful tooltip.
        $addOrderButtonText.html("הצטרף להזמנה משרדית");
        UIHelper.addTooltip($addOrderButton, "בעת לחיצה על כפתור זה ההזמנה תתווסף לכלל ההזמנות ב- Groupeat ממסעדה זו למשרדך.<br/><span style='font-weight: bold;'>במידה וסך ההזמנות הנ\"ל יעבור את מינימום ההזמנה הנדרש, תחויב/י עבור הזמנה זו באופן אוטומטי.</span>", false, 250, "font-weight: 100;");
        
        // Adding the button to the shopping cart.
        $addOrderButton.append($addOrderButtonText);
        $addOrderDiv.append($addOrderButton);
        $proceedToPaymentDivs.after($addOrderDiv);

        AddUpdateRestaurantOrder.isAddingAddOrderButton = false;
    }

    /**
     * This method adds the add order button or the updates buttons according to the updateButtons parameter
     * and returns whether the buttons were added by the method or not.
     * 
     * @param {Boolean} updateButtons
     * @returns {Boolean}
     */
    static addButtonsIfNotExist(updateButtons) {
        const $emptyOrderDiv = jQuery("p[class^='ShoppingCartViewstyled__EmptyCartText']");
        const $groupeatAddButton = jQuery(".groupeatAddOrder");
        const $groupeatUpdateButton = jQuery(".groupeatUpdateOrder");

        // If the cart is not empty it means we have already added the buttons.
        if (!$emptyOrderDiv.length && !$groupeatAddButton.length && !$groupeatUpdateButton.length) {
            if (updateButtons) {
                AddUpdateRestaurantOrder.createUpdateButtons();
            }
            else {
                AddUpdateRestaurantOrder.createAddOrderButton();
            }

            return true;
        }

        return false;
    }

    /**
     * This method handles what happens when the user clicks on 10bis' payment button in the restaurant page.
     */
    static initPaymentButton() {
        const $paymentButton = jQuery("button[class*='ShoppingCartDishesstyled__PaymentActionButton']").not("[class*='groupeat']");

        // Checking if we already initialized the button click.
        if (!Helper.isEmpty($paymentButton.data("groupeat-initialized"))) {
            return;
        }

        $paymentButton.data("groupeat-initialized", 1); // Marking the button as initialized.
        $paymentButton.on("click", () => {
            const result = confirm("האם אתה בטוח שברצונך להמשיך? במידה ותמשיך ההזמנות המשרדיות שהצטרפת אליהן יבוטלו.");

            if (!Helper.isEmpty(result)) {
                User.cancelTodayUnpaidOrders();
            }
            else {
                window.location.reload();
            }
        });
    }

    /**
     * This method handles adding the groupeat buttons to the shopping cart.
     * When the shopping cart is empty, the add order button will be automatically added when the user adds a dish
     * to the shopping cart.
     * 
     * @param {Boolean} updateButtons 
     */
    static addGroupeatButtons(updateButtons) {
        const added = AddUpdateRestaurantOrder.addButtonsIfNotExist(updateButtons);

        AddUpdateRestaurantOrder.initPaymentButton();

        // If we're adding the addOrder button, then we must listen to changes in the shopping cart.
        // Otherwise, if we're adding the update buttons but we couldn't add the update button yet, we need
        // to look for changes in the shopping cart until we can add them.
        if (!added || !updateButtons) {
            const inter = setInterval(() => {
                const $shoppingCartContainer = jQuery("div[class^='ShoppingCartViewstyled__Root']");
    
                if (!$shoppingCartContainer.length) {
                    return;
                }
    
                clearInterval(inter);
    
                // Detecting when the menu was changed so we know we need to add the "add order" button.
                ContentModifier.addNodeChangedEvent($shoppingCartContainer[0], observer => {
                    const added = AddUpdateRestaurantOrder.addButtonsIfNotExist(updateButtons);

                    AddUpdateRestaurantOrder.initPaymentButton();
    
                    // If this happens, it means we're in page load situation, and we don't need this observer anymore.
                    if (added && updateButtons) {
                        observer.disconnect();
                    }
                });
            }, 200);
        }
    }
    
    /**
     * This method adds the update buttons to the shopping cart (if possible).
     */
    static addUpdateButtons() {
        AddUpdateRestaurantOrder.addGroupeatButtons(true);
    }

    /**
     * This method adds the add order button to the shopping cart (if possible).
     */
    static addAddOrderButton() {
        AddUpdateRestaurantOrder.addGroupeatButtons(false);
    }

    /**
     * This method removes the add order button from the shopping cart.
     */
    static removeAddOrderButton() {
        jQuery(".groupeatAddOrder").remove();
    }
    
    /**
     * This method removes the update buttons from the shopping cart.
     */
    static removeUpdateButtons() {
        jQuery(".groupeatUpdateOrder").remove();
    }

    /**
     * This method returns basic restaurant details that are found in Groupeat, such as the restaurant's name,
     * the groupOrderSum, pooledOrderSum, etc...
     * 
     * @returns {Promise<object>}
     */
    static async getRestaurantDetailsFromGroupeat() {
        const restaurantId = AddUpdateRestaurantOrder.getCurrentRestaurantId();

        return await Restaurant.getRestaurantDetailsFromGroupeat(restaurantId);
    }

    /**
     * This method returns whether the restaurant already passed the minimum order or not.
     * 
     * @returns {Promise<Boolean>}
     */
    static async isRestaurantPassedMinimumOrder() {
        const restaurantDetails = await AddUpdateRestaurantOrder.getRestaurantDetailsFromGroupeat();
        const minimumPriceForOrder = restaurantDetails["minimumPriceForOrder"];
        const pooledOrderSum = restaurantDetails["pooledOrderSum"];
        const groupOrderSum = restaurantDetails["groupOrderSum"];

        return Restaurant.isPassMinimum(minimumPriceForOrder, pooledOrderSum, groupOrderSum);
    }

    /**
     * This method returns whether the user can join a group order or not.
     * 
     * @returns {Promise<Boolean>}
     */
    static async canUserMakeNewOrder() {
        const requestData = await Request.getBasicRequestDataObject();
        const result = await Request.sendGroupeatRequest("user/canMakeNewOrder", requestData);

        return result["result"];
    }

    /**
     * This method returns whether the current page is a restaurant page or not.
     * 
     * @returns {Boolean}
     */
    static isRestaurantPage() {
        const $proceedToPaymentDivs = jQuery("div[class^='ShoppingCartDishesstyled__PaymentContainer']");
        const $emptyOrderDiv = jQuery("p[class^='ShoppingCartViewstyled__EmptyCartText']");

        return $proceedToPaymentDivs.length > 0 || $emptyOrderDiv.length > 0;
    }

    /**
     * This method updates the buttons in the shopping cart according to whether there's an order in Groupeat or not.
     * 
     * @returns {Promise<void>}
     */
    static async updateGroupeatButtons() {
        // If this isn't a restaurant page, there's nothing to do here...
        if (!AddUpdateRestaurantOrder.isRestaurantPage()) {
            return;
        }

        const restaurantId = AddUpdateRestaurantOrder.getCurrentRestaurantId();
        const orderExists = await Restaurant.isOrderExistsInGroupeat(restaurantId);
    
        // If the order exists, we should add the update buttons and otherwise the 'add order' button.
        if (orderExists) {
            AddUpdateRestaurantOrder.removeAddOrderButton();
            AddUpdateRestaurantOrder.addUpdateButtons();
        }
        else {
            AddUpdateRestaurantOrder.removeUpdateButtons();
            AddUpdateRestaurantOrder.addAddOrderButton();
        }

        // Adding a notice that displays how close the order in the shopping cart is to passing the minimum.
        AddUpdateRestaurantOrder.addShoppingCartPassedMinimumNotice();
    }

    /**
     * This method updates Groupeat's buttons and notices every 10 seconds (because changes that are caused by other users
     * may inflict what we need to display to the user).
     */
    static updateGroupeatButtonsPeriodically() {
        // Updating the buttons on the first run.
        AddUpdateRestaurantOrder.updateGroupeatButtons().catch();

        // If we're already updating the buttons periodically, we don't need to initialize it again.
        if (!Helper.isEmpty(AddUpdateRestaurantOrder.updateGroupeatButtonsInterval)) {
            return;
        }

        AddUpdateRestaurantOrder.updateGroupeatButtonsInterval = setInterval(() => {
            AddUpdateRestaurantOrder.updateGroupeatButtons().catch();
        }, AddUpdateRestaurantOrder.UPDATE_BUTTONS_INTERVAL);
    }
    
    /**
     * This method initializes Groupeat's functionality inside the restaurant page.
     * 
     * @returns {Promise<void>}
     */
    static async initRestaurantPage() {
        // We need to wait for the active address to load before we can continue.
        await Office.waitForActiveAddressToLoad();
        
        // If the user doesn't have an active office address, then there's no point in adding the buttons.
        if (!Office.isActiveAddressAnOffice()) {
            return;
        }

        // If this isn't a restaurant page, then we shouldn't add the buttons.
        if (!AddUpdateRestaurantOrder.isRestaurantPage()) {
            return;
        }

        // Initializing the functionality.
        AddUpdateRestaurantOrder.updateGroupeatButtonsPeriodically();
        AddUpdateRestaurantOrder.handleCompleteOrderDeletion();
        AddUpdateRestaurantOrder.orderCancelationHandler();
        AddUpdateRestaurantOrder.addShoppingCartPassedMinimumHandler();
    }

    /**
     * This method handles order cancelation which is not done through the page, for example using the "my orders" page.
     */
    static orderCancelationHandler() {
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                // Validating that the message is an order cancelation message.
                if (request.type != "groupeatOrderCanceled") {
                    return;
                }

                // If we're not in the restaurant page there's nothing we should do.
                if (!AddUpdateRestaurantOrder.isRestaurantPage()) {
                    return;
                }

                const restaurantId = request["restaurantId"];
                const currentRestaurantId = AddUpdateRestaurantOrder.getCurrentRestaurantId();

                // If the order that was canceled belongs to the same restaurant we're currently ordering from or we added
                // notices, we should update the buttons and notices.
                if (restaurantId == currentRestaurantId || jQuery(".groupeatAlreadyPassedMinimumText,.groupeatCannotMakeNewOrder").length) {
                    AddUpdateRestaurantOrder.updateGroupeatButtons();
                }
            }
        );
    }
}

// Constants
AddUpdateRestaurantOrder.ADD_ORDER_BUTTON_BG_COLOR = "green";
AddUpdateRestaurantOrder.UPDATE_ORDER_BUTTON_BG_COLOR = "green";
AddUpdateRestaurantOrder.DELETE_ORDER_BUTTON_BG_COLOR = "red";
AddUpdateRestaurantOrder.ALLOW_PAID_ORDER_UPDATE = true; // When set to true, the user can update and delete paid orders (if it's set in the server side as well).
AddUpdateRestaurantOrder.UPDATE_BUTTONS_INTERVAL = 10 * 1000; // 10 seconds.

// Initializing the script when the page is loaded.
jQuery(document).ready(function() {
    clearInterval(AddUpdateRestaurantOrder.updateGroupeatButtonsInterval);
    AddUpdateRestaurantOrder.updateGroupeatButtonsInterval = null;
    AddUpdateRestaurantOrder.initRestaurantPage();
});

// If the page was changed, we need to init the restaurant page again (if we're in the restaurant page).
// This is because 10bis loads the pages dynamically.
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.message == "pageChanged") {
            jQuery(document).ready(function() {
                clearInterval(AddUpdateRestaurantOrder.updateGroupeatButtonsInterval);
                AddUpdateRestaurantOrder.updateGroupeatButtonsInterval = null;
                AddUpdateRestaurantOrder.initRestaurantPage();
            });
        }
    }
);
