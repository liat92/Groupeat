/**
 * Class GroupeatMain - contains general methods that should run when the page is loaded.
 */
class GroupeatMain {
	/**
	 * This method handles receiving the message "fcmIdChanged" from the FCM class.
	 * If the fcm id is changed, it then sends a request to Groupeat's server with the update fcmId.
	 */
	static updateUserFCMIfChanged() {
		chrome.runtime.onMessage.addListener(
			function(request, sender, sendResponse) {
				if (request.message == "fcmIdChanged") {
					FCM.updateUserFCMInGroupeat();
				}
			}
		);
	}

	/**
	 * This method handles what happens when the user has just logged in.
	 */
	static userLoggingInHandler() {
		const listenedNodes = [
			document.querySelectorAll("[class*='styled__UserStatusWrapper']"),
			document.querySelectorAll("[class*='styled__HomeHeaderRoot")
		];
	
		for (let i = 0; i < listenedNodes.length; i++) {
			const listenedNode = listenedNodes[i];
	
			// If we detect a change in any of the above elements, it means the user has just logged into his
			// 10bis account and in order to have updated data, we need to refresh the page.
			if (listenedNode.length) {
				ContentModifier.addNodeChangedEvent(listenedNode[0], () => {
					window.location.reload();
				});
			}
		}
	}

	/**
	 * This method handles what happens when the user switches account.
	 * When the user switches account, we need to cancel his orders for the current day and reload the page.
	 */
	static async userSwitchHandler() {
		const currentUserToken = await Helper.getStorageValue("currentUserToken");
		const currentAddressKey = await Helper.getStorageValue("currentAddressKey");
		const currentAddressCompanyId = await Helper.getStorageValue("currentAddressCompanyId");

		// If the user is already logged out, there's nothing to do.
		if (Helper.isEmpty(currentUserToken) || Helper.isEmpty(currentAddressKey) || Helper.isEmpty(currentAddressCompanyId)) {
			return;
		}

		const requestData = {
			"userToken": currentUserToken,
			"addressCompanyId": currentAddressCompanyId,
			"addressKey": currentAddressKey,
			"testUserId": await User.fetchTestUserId()
		};

		await Request.sendGroupeatRequest("user/cancelTodayUnpaidOrders", requestData);
		await Helper.setStorageValue("currentUserToken", null);
		await Helper.setStorageValue("currentAddressKey", null);
		await Helper.setStorageValue("currentAddressCompanyId", null);
		window.location.reload();
	}

	/**
	 * This method handles what happens when the user switches the active address in 10bis.
	 */
	static officeChangeHandler() {
		jQuery(document).ready(() => {
			const listenedNode = document.querySelectorAll("div[class^='styled__AddressButtonText']");

			if (listenedNode.length) {
				ContentModifier.addNodeChangedEvent(listenedNode[0], () => {
					// If the user switched address, we need to reload the page in order to have updated data.
					setTimeout(() => {
						window.location.reload();
					}, 1000);
				});
			}
		});
	}

	/**
	 * This method handles what happens when the user has just logged off.
	 */
	static loggingOffHandler() {
		chrome.runtime.onMessage.addListener(
			function(request, sender, sendResponse) {
				if (request.message == "pageChanged") {
					jQuery(document).ready(() => {
						const loginButtonSelectors = [
							"div[data-test^='homeHeader-openLogin']",
							"div[class='UserStatus__SimpleLoginRoot']"
						];

						// Checking if there's any login button, if so, it means the user is logged off.
						for (let i = 0; i < loginButtonSelectors.length; i++) {
							if (jQuery(loginButtonSelectors[i]).length) {
								GroupeatMain.userSwitchHandler();
								break;
							}
						}
					});
				}
			}
		);
	}

	/**
	 * This method handles what happens when the user resets the extension.
	 */
	static addonResetHandler() {
		chrome.runtime.onMessage.addListener(
			function(request, sender, sendResponse) {
				if (request.type == "groupeatAddonReset") {
					window.location.reload();
				}
			}
		);
	}
}

/**
 * This method handles fetching the __NEXT_DATA__ global variable from 10bis as it is crucial for working with
 * 10bis' data, such as the user's userToken, address details, restaurants, etc...
 * 
 * @param {function} callback 
 */
async function getNextData(callback) {
	if (typeof __NEXT_DATA__ === "undefined" || __NEXT_DATA__ == null || typeof __NEXT_DATA__ !== "object") {
		return;
	}

	__NEXT_DATA__ = JSON.parse(__NEXT_DATA__.innerHTML);

	Office.waitForActiveAddressToLoad()
	.then(() => {
		const $activeAddressWrapper = document.querySelectorAll('[class^="styled__ActiveAddressWrapper"]')[0];

		if (typeof $activeAddressWrapper !== "undefined") {
			__NEXT_DATA__["activeAddress"] = $activeAddressWrapper.textContent;
		}
	});
	
	if (typeof callback === "function") {
		callback();
	}
}

/**
 * This method handles sending the __NEXT_DATA__ to the UI part of the extension when receiving a
 * message from the UI which asks for the __NEXT_DATA__.
 */
function sendNextDataToUI() {
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.message == "getNextData") {
				sendResponse({"data": __NEXT_DATA__});
			}
		}
	);
}

getNextData(sendNextDataToUI);
GroupeatMain.updateUserFCMIfChanged();
GroupeatMain.userLoggingInHandler();
GroupeatMain.loggingOffHandler();
GroupeatMain.officeChangeHandler();
GroupeatMain.addonResetHandler();
ContentModifier.injectScriptHandler();
