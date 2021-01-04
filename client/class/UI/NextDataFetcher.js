let __NEXT_DATA__ = null; // Initializing the __NEXT_DATA__ variable to avoid errors.

/**
 * Class NextDataFetcher - Handles fetching the '__NEXT_DATA__' object from 10bis into the UI part of the extension.
 */
class NextDataFetcher {
    /**
     * Constructor - initializes the object.
     */
    constructor() {
        this._nextDataFetched = false;
        this._interval = null;
        this._callbacked = false;
    }

    /**
     * This method fetches the __NEXT_DATA__ object from 10bis and calls a callback function when the job is done.
     * 
     * @param {function} callback 
     */
    getNextData(callback) {
        this._interval = setInterval(() => {
            this.getNextDataHelper(callback);
        }, 50);
    }

    /**
     * This method helps the getNextData method by trying to fetch the __NEXT_DATA__ object from 10bis.
     * 
     * @param {function} callback 
     */
    getNextDataHelper(callback) {
        const self = this;

        // If we already fetched the data, we should discontinue and clear the interval.
        if (self._nextDataFetched) {
            clearInterval(self._interval);
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];

            // Validating that we are actually in 10bis and we're not attempting to run the addon on another website.
            if (!self._callbacked && currentTab["url"].indexOf("10bis.co.il") === -1) {
                self._callbacked = true;
                self._nextDataFetched = true;

                if (typeof callback === "function") {
                    callback(null);
                }
                
                return;
            }

            // Sending a message to the active tab that we want the next data from.
            // There is a script in the main.js file that is injected to 10bis and listens to this message.
            chrome.tabs.sendMessage(currentTab.id, {"message": "getNextData"}, function(response) {
                if (typeof response === "undefined" || typeof response.data === "undefined" || response.data == null) {
                    return;
                }
    
                __NEXT_DATA__ = response.data;
                self._nextDataFetched = true; // Setting up a flag that we fetched the nextData and we shouldn't try to fetch it any longer.

                // If we didn't call the callback function yet, we should call it and pass it the __NEXT_DATA__ object that we received from 10bis.
                if (!self._callbacked) {
                    self._callbacked = true;

                    if (typeof callback === "function") {
                        callback(__NEXT_DATA__);
                    }
                }
            });
        });
    }
}
