/**
 * Class SettingsPage - handles the settings page's activity.
 */
class SettingsPage {
    /**
     * This method initializes the reset button's functionality.
     */
    static initResetButton() {
        const $resetButton = jQuery("#resetButton");
    
        $resetButton.on("click", function() {
            const response = confirm("האם אתה בטוח שברצונך לאפס את הגדרות התוסף? לא ניתן לשחזר פעולה זו.");
    
            if (response) {
                // Resetting the time to order value.
                Helper.setStorageValue(SettingsPage.TIME_TO_ORDER_STORAGE_KEY, SettingsPage.DEFAULT_TIME_TO_ORDER_VALUE);
                Request.getBasicRequestDataObject()
                .then(requestData => {
                    return Request.sendGroupeatRequest("user/resetUser", requestData);
                })
                .then(() => {
                    alert("המידע שלך נמחק בהצלחה.");

                    // Notifying the active tab that the extention was resetted.
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            "type": "groupeatAddonReset"
                        });
                    });

                    window.location.reload();
                })
                .catch(() => {
                    alert("אירעה בעיה בעת ניסיון מחיקת המידע. אנא נסה שוב או צור עמנו קשר.");
                });
            }
        });
    }

    /**
     * This method initializes the time to order checkbox's functionality.
     */
    static async initTimeToOrderCheckbox() {
        const timeInStorage = await Helper.getStorageValue(SettingsPage.TIME_TO_ORDER_STORAGE_KEY);
    
        // If the time to order is null, then the time to order notification is disabled.
        // Otherwise, the time to order notification is enabled.
        if (timeInStorage == null) {
            SettingsPage.$timeToOrderSelect.prop("disabled", true);
        }
        else {
            SettingsPage.$timeToOrderCheckbox.prop("checked", true);
        }
        
        SettingsPage.$timeToOrderCheckbox.on("change", function() {
            const $this = jQuery(this);
            const isChecked = $this.prop("checked");
    
            if (isChecked) {
                SettingsPage.$timeToOrderSelect.removeAttr("disabled");
                Helper.setStorageValue(SettingsPage.TIME_TO_ORDER_STORAGE_KEY, SettingsPage.$timeToOrderSelect.val());
            }
            else {
                SettingsPage.$timeToOrderSelect.prop("disabled", true);
                Helper.setStorageValue(SettingsPage.TIME_TO_ORDER_STORAGE_KEY, null);
            }
        });
    }

    /**
     * This method receives an integer that represents hour and minutes and converts it to H:MM or HH:MM format.
     * For example, 1045 will become "10:45".
     * 
     * @param {Integer} value 
     * @returns {string}
     */
    static timeValueToTimeString(value) {
        const valueStr = value.toString();
        const length = valueStr.length;
    
        if (length == 3) {
            return valueStr[0] + ":" + valueStr[1] + valueStr[2];
        }
        else if (length == 4) {
            return valueStr[0] + valueStr[1] + ":" + valueStr[2] + valueStr[3];
        }
    
        return "";
    }

    /**
     * This method receives a value that represents hour and minutes and returns whether the time ends with "55" or not.
     * 
     * @param {integer} timeValue
     * @returns {Boolean}
     */
    static isEndOfHour(timeValue) {
        const valueStr = timeValue.toString();
        const length = valueStr.length;
    
        if (length == 3) {
            return valueStr[1] + valueStr[2] == "55";
        }
        else if (length == 4) {
            return valueStr[2] + valueStr[3] == "55";
        }
    
        return false;
    }

    /**
     * This method populates the time to order selection input box.
     */
    static async populateTimeToOrderSelection() {
        const timeInStorage = await Helper.getStorageValue(SettingsPage.TIME_TO_ORDER_STORAGE_KEY);
        let currentTime;
    
        const initialTime = 800; // 8:00 AM
        const defaultTime = 1045; // 10:45 AM
        const maxTime = 1055; // 10:55 AM
    
        if (timeInStorage == null) {
            currentTime = defaultTime;
            SettingsPage.$timeToOrderSelect.prop("disabled", true);
        }
        else {
            currentTime = timeInStorage;
            SettingsPage.$timeToOrderSelect.removeAttr("disabled");
        }
        
        // Populating the selection input.
        // If we reached the end of an hour, then the hour ends with "55", so we need to add 45 in order
        // to get to the next hour.
        // The time options are skipped in 5 minutes periods.
        for (let i = initialTime; i <= maxTime; i = SettingsPage.isEndOfHour(i) ? i + 45: i + 5) {
            const $option = jQuery("<option/>", {"value": i});
    
            if (i == currentTime) {
                $option.prop("selected", true);
            }
    
            $option.html(SettingsPage.timeValueToTimeString(i));
            SettingsPage.$timeToOrderSelect.append($option);
        }
    }

    /**
     * This method initializes the time to order selection handler.
     */
    static async timeToOrderSelectionHandler() {
        await SettingsPage.populateTimeToOrderSelection();
    
        SettingsPage.$timeToOrderSelect.on("change", function() {
            const $this = jQuery(this);
            const value = parseInt($this.val());
    
            Helper.setStorageValue(SettingsPage.TIME_TO_ORDER_STORAGE_KEY, value);
        });
    }
}

// Constants
SettingsPage.TIME_TO_ORDER_STORAGE_KEY = "timeToOrder";
SettingsPage.DEFAULT_TIME_TO_ORDER_VALUE = 1045;

// Fetching the __NEXT_DATA__ object from 10bis.
new NextDataFetcher().getNextData(() => {
    jQuery(document).ready(() => {
        SettingsPage.$timeToOrderCheckbox = jQuery("#timeToOrderCheckbox");
        SettingsPage.$timeToOrderSelect = jQuery("#timeToOrderSelect");

        // Initializing the time to order checkbox and selection.
        SettingsPage.initTimeToOrderCheckbox().then(() => {
            return SettingsPage.timeToOrderSelectionHandler();
        }).catch(console.log);
    
        SettingsPage.initResetButton();
    });    
});
