// Fetching the __NEXT_DATA__ object from 10bis.
new NextDataFetcher().getNextData(() => {
	Notification.requestPermission() // Requesting a permission to send notifications as it is crucial for the extension's use.
	.then(permission => {
		const $errorMessage = document.getElementById("errorMessage");
		const $loading = document.getElementById("loading");

		if (permission != "granted") {
			// If we're here, then the user did not give a permission to send notifications.
			$errorMessage.innerHTML = "אנא אשר קבלת התראות על מנת שתוכל להשתמש בGroupeat באופן תקין.";
		}
		else if (__NEXT_DATA__ == null) {
			// If we're here, it means that the user is not in 10bis.
			$errorMessage.innerHTML = "על מנת שתוכל להשתמש בGroupeat באופן תקין עליך להיכנס לאתר תן ביס.";
		}
		else if (Office.isActiveAddressAnOffice()) {
			// If the user has chosen an office address as his active address, we can move forward to the my orders page.
			location.href = "my_orders.html";
		}
		else if (User.getInstance().isConnected()) {
			// If the user is connected but he didn't choose an office as his active address, we let him know.
			$errorMessage.innerHTML = "עליך לבחור בכתובת של משרד ככתובת פעולה על מנת שתוכל להשתמש בGroupeat.";
		}
		else {
			// In this case, the user is not connected to 10bis, so we're letting him know that he must login.
			$errorMessage.innerHTML = "עליך להתחבר לחשבון התן ביס שלך על מנת שתוכל להשתמש בGroupeat.";
		}
		
		// We finished loading the page so we need to remove the loading gif.
		$loading.style.display = "none";

		// If we've added an error message, we should display it.
		if ($errorMessage.innerHTML != "") {
			$errorMessage.style.display = "block";
		}
	});
});
