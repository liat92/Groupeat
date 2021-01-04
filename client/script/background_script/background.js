/**
 * Class MainBackground - handles scripts that should constantly run in the background.
 */
class MainBackground {
    /**
     * This method receives a callback function and returns the current active tab to the callback.
     * 
     * @param {function} callback 
     */
    static getActiveTab(callback) {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
            const tab = tabs[0];
            
            if (tab) {
                callback(tab);
            } 
            else {
                chrome.tabs.get(MainBackground.activeTabId, function (tab) {
                    if (tab) {
                        callback(tab);
                    }
                });
            }
        });
    }

    /**
     * This method sends a message to the active tab and background scripts that the current page was changed. 
     */
    static notifyScriptsOfPageChange() {
        MainBackground.getActiveTab(tab => {
            chrome.tabs.sendMessage(MainBackground.activeTabId, {"message": "pageChanged", "url": tab.url});
            chrome.runtime.sendMessage({"message": "pageChanged", "url": tab.url});
        });
    }

    /**
     * This method initializes the main background scripts.
     */
    static init() {
        MainBackground.initShowAddonHandler();
        MainBackground.initPageChangeHandler();
        MainBackground.initFirebase();
        MainBackground.initTimeToOrder();
    }

    /**
     * This method enables displaying the addon's popup window when clicking on the extension's icon.
     * The method allows the popup to be displayed only when entering 10bis' website.
     */
    static initShowAddonHandler() {
        chrome.runtime.onInstalled.addListener(function() {
            chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
                chrome.declarativeContent.onPageChanged.addRules([{
                    conditions: [
                            new chrome.declarativeContent.PageStateMatcher({
                            pageUrl: {
                              hostEquals: "www.10bis.co.il"
                            }
                        }),
                            new chrome.declarativeContent.PageStateMatcher({
                            pageUrl: {
                              hostEquals: "10bis.co.il"
                            }
                        })
                    ],
                    actions: [
                      new chrome.declarativeContent.ShowPageAction()
                    ]
                }]);
            });
        });
    }

    /**
     * This method initializes the action to be taken when the page was changed.
     */
    static initPageChangeHandler() {
        // Saving the current active tab.
        chrome.tabs.onActivated.addListener(function(activeInfo) {
            MainBackground.activeTabId = activeInfo.tabId;
        });

        // When the page was changed, we want to notify Groupeat's scripts of the change.
        chrome.webNavigation.onHistoryStateUpdated.addListener(function() {
            MainBackground.notifyScriptsOfPageChange();
        });
    }

    /**
     * This method initializes Firebase.
     */
    static initFirebase() {
        FCM.getInstance();
    }

    /**
     * This method initializes the time to order notification time.
     * When installing the extension for the first time, we want it to be set to 10:45 AM by default.
     */
    static initTimeToOrder() {
        Helper.setStorageValue(MainBackground.TIME_TO_ORDER_STORAGE_KEY, MainBackground.TIME_TO_ORDER_DEFAULT_TIME);
    }
}

// Constants
MainBackground.TIME_TO_ORDER_STORAGE_KEY = "timeToOrder";
MainBackground.TIME_TO_ORDER_DEFAULT_TIME = 1045;

MainBackground.init();
