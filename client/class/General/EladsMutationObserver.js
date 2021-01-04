/**
 * Class EladsMutationObserver - Extends the MutationObserver by adding a disconnect option.
 */
class EladsMutationObserver extends MutationObserver {
    constructor(callback) {
        super(callback);

        this._disconnected = false;
    }

    /**
     * This method will disconnect the observer and stop observing for new changes in the node.
     */
    disconnect() {
        super.disconnect();
        this._disconnected = true;
    }

    /**
     * This method will start observing the node according to the given config properties.
     * 
     * @param {object} node 
     * @param {object} config 
     */
    observe(node, config) {
        super.observe(node, config);
        this._disconnected = false;
    }

    get disconnected() {
        return this._disconnected;
    }
}
