/**
 * Class ContentModifier - Handles injecting and handling content change in the website we modify.
 */
class ContentModifier {
	/**
	 * This method receives a DOM node and a function to run.
	 * The functionToRun will be called back with the observer object (which can be disconnected)
	 * every time the node is changed.
	 * 
	 * @param {object} node 
	 * @param {function} functionToRun 
	 */
	static addNodeChangedEvent(node, functionToRun) {
		if (typeof node === "undefined" || typeof functionToRun !== "function") {
			return;
		}
		
		const config = {
			"attributes": true, 
			"childList": true, 
			"subtree": true, 
			"characterData": true
		};

		const callback = function(mutationsList, observer) {
			for(var mutation of mutationsList) {
				if (mutation.type == "childList" || mutation.type == "subtree" || mutation.type == "characterData") {
					functionToRun(observer);
				}
			}
		};
		
		const observer = new EladsMutationObserver(callback);

		observer.observe(node, config);
	}

	/**
	 * This method handles script injection request that comes as a message.
	 * Upon receiving such request, the requested script will be injected.
	 * 
	 * @param {Integer} scriptHandlerID The handler identifier.
	 */
	static injectScriptHandler(scriptHandlerID) {
		if (Helper.isEmpty(scriptHandlerID)) {
			scriptHandlerID = 1;
		}

		chrome.runtime.onMessage.addListener(
			function(request, sender, sendResponse) {
				if (request.message == "injectScript" + scriptHandlerID) {
					jQuery(document).ready(function() {
						const $script = jQuery("<script/>");

						$script.html(request.script);
						jQuery(document.body).append($script);
					});
				}
			}
		);
	}

	/**
	 * This method sends a script injection message request to inject a specific script into the website.
	 * The identifier lets us manage multiple scripts injections.
	 * Using the same identifier may cause unexpected behavior.
	 * 
	 * @param {string} script 
	 * @param {Integer} scriptHandlerID 
	 */
	static injectScript(script, scriptHandlerID) {
		if (Helper.isEmpty(scriptHandlerID)) {
			scriptHandlerID = 1;
		}

		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {"message": "injectScript" + scriptHandlerID, "script": script});
		});
	}

	/**
	 * This methods waits for an element to exist in the page and calls the callback function when it does.
	 * 
	 * @param {string} selector 
	 * @returns {Promise<void>}
	 */
	static async waitForElement(selector) {
		if (typeof jQuery === "undefined") {
			return;
		}

		if (jQuery(selector).length) {
			return;
		}

		return await new Promise((resolve, reject) => {
			const inter = setInterval(() => {
				if (jQuery(selector).length) {
					clearInterval(inter);
					resolve();
				}
			}, 100);
		});
	}
}
