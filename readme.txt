                         ██████╗ ██████╗  ██████╗ ██╗   ██╗██████╗ ███████╗ █████╗ ████████╗
                        ██╔════╝ ██╔══██╗██╔═══██╗██║   ██║██╔══██╗██╔════╝██╔══██╗╚══██╔══╝
                        ██║  ███╗██████╔╝██║   ██║██║   ██║██████╔╝█████╗  ███████║   ██║   
                        ██║   ██║██╔══██╗██║   ██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██║   ██║   
                        ╚██████╔╝██║  ██║╚██████╔╝╚██████╔╝██║     ███████╗██║  ██║   ██║   
                         ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   
                                                                    
Created by: Elad Cohen, Liat Matzov and Hadar Yitzhaki.

###################################################################################################################
The project contains a server side and a client side where the server's files can be found in the 'server' folder
and the client's files can be found in the 'client' folder.
###################################################################################################################

###################################################################################################################
IMPORTANT NOTES:
* The __NEXT_DATA__ (sometimes referred to as nextData or NextData) is a huge object that 10bis stores in the
  client side.
  This object stores a lot of important information, such as the user's userToken (similar to user id),
  addressCompanyId (will be detailed in the following notes), addressKey (will be detailed in the following notes),
  information about the restaurants, etc...
* The userToken is a unique user identifer given by 10bis.
  According to the userToken, we know how to relate to different users.
* The addressCompanyId is a unique company identifier given by 10bis.
  According to this identifier, we know which users belong to which companies, and by using this parameter we can
  link users from the same companies together.
* The addressKey is a unique address identifier given by 10bis.
  We use the active address' addressKey (the address that the user chose) in the requests we send.
* Using the combination of addressCompanyId and addressKey, we identify an office, and by identifying the office
  we know how to relate office orders (הזמנות משרדיות) to each other and create group orders.
* In some of the requests, we don't need the user's office details to handle the request, but we still require
  the user to identify himself by specifying userToken, addressCompanyId and addressKey for extra security, in
  order to counter requests forgery.
* The "pooledOrderSum" that can be found in some places, is the total amount of paid orders that 10bis received
  from the users until 11 AM.
###################################################################################################################

###################################################################################################################
Client Side Structure (important files):
* client
	* class (main classes)
		* Errors (error classes)
		* General (general classes)
			* ContentModifier.js (methods for injecting and handling content change)
			* Helper.js (helpful methods)
			* Request.js (methods for requests sending)
		* Notifications (notifications classes)
			* FCM.js (methods for handling firebase cloud messaging)
			* GroupeatNotification.js (methods for displaying notifications)
		* UI (UI classes)
			* NextDataFetcher.js (responsible for fetching a main object from 10bis into the UI part)
		* Office.js (main office related methods)
		* Restaurant.js (main restaurant related methods)
		* User.js (main user related methods)
	* css
	* images
	* script
		* background_script
			* background.js (notifies content scripts of page changes)
			* foregroundNotificationHandler.js (handles displaying notifications that are requested
			  by the GroupeatNotification class).
			* timeToOrderHandler.js (handles displaying the time to order notification).
			* unreadNotificationsCountHandler.js (handles updating the unread notifications count
			  that is displayed on the extension's icon).
		* content_script (scripts that are injected into 10bis)
			* main_page
				* main_table.js (handles creating and displaying the 
				  main table in 10bis' main page)
			* restaurant
				* add_update_restaurant_order.js (handles adding and updating orders in the
				  restaurant page)
				* groupeat_restaurants_updater.js (handles sending the status of the restaurants
				  in 10bis to the server)
			* interceptRequests.js (handles intercepting requests that are sent from 10bis and
			  saving them for our use)
			* main.js (handles main and general tasks)
			* user_office_registration.js (handles registering new users and offices in Groupeat)
		* ui_script (scripts that are included in pages when clicking on the extension's icon)
			* index.js (related to the index.html page, handles displaying related messages when
			  opening the extension by pressing on the extension's icon)
			* my_orders.js (related to the my_orders.html page)
			* notifications.js (related to the notifications.html page)
			* page_change_handler.js (handles moving from/to 10bis while the extension window is open)
			* settings.js (related to the settings.html page)
	* firebase-messaging-sw.js (a service worker that handles receiving notifications from the server side.
	  This file also handles automatic payments)
	* index.html (first page that is shown when clicking the extension's icon)
	* manifset.json (extension's settings)
	* my_orders.html (displays the user's orders for the current day and the previous orders)
	* notifications.html (displays the user's notifications log)
	* settings.html (basic settings such as time to order notification and resetting the extension)

Server Side Structure (important files):
* class
	* Controllers (routers for the requests)
		* Controller.js (initializes the subcontrollers)
		* ControllerHelper.js (helpful methods for the controllers)
		* OfficeController.js (routes offices related requests to their designated destination)
		* OrderController.js (routes orders related requests to their designated destination)
		* RestaurantController.js (routes restaurants related requests to their designated destination)
		* UserController.js (routes users related requests to their designated destination)
	* Database
		* DB.js (lets the server performs tasks against the database)
	* Errors (error classes)
	* General
		* GroupeatDate.js (useful date related methods)
		* Helper.js (helpful methods)
		* Logger.js (logs errors and general data in the database)
		* Notification.js (handles sending messages to the client using Firebase)
	* Office.js (main office related methods)
	* Restaurant.js (main restaurant and restaurant orders related methods)
	* User.js (main user related methods)
* firebase (contains the firebase settings file)
* Groupeat.js (the main server file, initializes the server and connects to the database)
* package.json (the external packages that are used by the server)
###################################################################################################################

###################################################################################################################
Key features:
	Server Side & Client Side:
		* When a group order passed the required minimum that was set by a restaurant, the group order
		  is charged automatically by sending a notification (message) to the client side which
		  then sends the payment request to 10bis.
		  When the group order passed the required minimum, a message is sent from the server to client
		  that checks each user whether he is online or not (whether their internet is disconnected
		  and/or their computer is turned off or not).
  		  If one or more of the people who have joined the group order were not online when the
		  "is connected" message was sent, their order will be canceled (the users' computers have 20 
		  seconds to respond to the message that was sent from the server).
  		  If the online people who have joined the group order have passed together the required minimum,
		  they will receive an automatic payment notification (message) that is sent from the server.
		  This automatic payment message will make the client send a request to 10bis that charges the user
		  for his order and also send a request to Groupeat's server that marks the user's order as paid.
  		  In the server side, this is handled by the method
		  "sendAutomaticPaymentNotificationsIfPassedMinimum" in class "Restaurant".
  		  In the client side, the notifications that are passed from the server side are handled in
  		  the file "firebase-messaging-sw.js".
		* The client sends the status of the restaurants in 10bis to Groupeat's server every 10 seconds
		  using the file "groupeat_restaurants_updater.js" in the client side.
		  The server handles these requests in the file "RestaurantController.js" in the request
		  "/restaurant/updateRestaurantsMetadata".
		  If the groupOrderSum and the pooledOrderSum pass the required minimum, the automatic payment
		  notifications are sent to the relevant users.

	Server Side:
		* The server side supports SSL by defining the paths to the SSL certificates in the "Groupeat.js"
		  file.

	Client Side:
		* The group orders that are created for the same day are displayed in 10bis in a table.
  		  The files that handle the creation of the table and fetching the orders can be found in the
		  client side and are called "main_table.js" and "main_table.css".
		* The user's orders and the user's previous orders are displayed to the user when clicking on
		  the addon's icon in chrome's extensions bar (next to the address bar).
		  The files that are associated with this feature are "my_orders.html", "my_orders.js"
		  and "my_orders.css".
		* When the user disconnects from 10bis, the extension automatically cancels any active orders
		  the user has, because we will not be able to charge him if a group order that he has 
		  joined to passed the required minimum.
		  This is handled by the "loggingOffHandler" method in class "GroupeatMain" in the file "main.js"
		  in the client side.
		* When the user switches his active address, the extension automatically cancels any active
		  orders the user has for the previous address.
		  This is handled by the "officeChangeHandler" method in class "GroupeatMain"
		  in the file "main.js" in the client side.
		* The user receives notifications even if the browser is shut down thanks to the
		  "firebase-messaging-sw.js" file which continues running in the background.
		  This was done by requesting the "background" permission in the manifset.json file in
		  the client side.
		* The user receives a time to order notification (which is set by default to 10:45 AM) if the
		  user doesn't have any paid order yet.
		  The time to order notification can be set in the Settings page ("settings.html") and is handled
		  by a background script which is called "timeToOrderHandler.js."
		* The notifications that the user receives are logged and can be found in the Notifications page
		  which can be accessed via the "my_orders.html" page.
		  A notifications count is displayed on both the icon in the "my_orders.html" page and
		  also on the extension's icon in chrome's extension bar.
		  The notifications count that is displayed on the extension's icon is handled by a background
		  script which is called "unreadNotificationsCountHandler.js".
		* The extension automatically identifies the user and office according to the data in 10bis and therefore
		  we don't need the users to manually register to Groupeat, the registration is done automatically.
		  This is done in the file "user_office_registration.js".
###################################################################################################################
