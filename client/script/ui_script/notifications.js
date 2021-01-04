/**
 * Class NotificationsPage - handles the notifications page's activity.
 */
class NotificationsPage {
    /**
     * This method receives a step variable that indicates how many sets of notifications has already added to the page.
     * The method sends a request for the needed set of notifications according to the step and adds the notifications that are recieved to the page.
     *
     *  @param {Integer} step 
     * @returns {Promise<void>}
     */
    static async loadNotifications(step) {
        const requestData = await Request.getBasicRequestDataObject();

        requestData["step"] = step;

        const items = await Request.sendGroupeatRequest("user/getNotifications", requestData);
        const notifications = items["result"];
    
        jQuery(".notificationsContainer").show();
        jQuery("h1").show();
        jQuery(".emptyNotificationsDiv").hide();        
        jQuery(".loading").hide();
        
        for (let i = 0; i < notifications.length; i++) {
            NotificationsPage.addNotificationToPage(notifications[i]);
        }
        
        // Notifying the server that the user's notifications were read and resetting the unread notifications count.
        NotificationsPage.markNotificationAsRead();
     
        const hasMoreNotifications = notifications.length == NotificationsPage.MAX_AMOUNT_OF_NOTIFICATIONS_PER_STEP;
    
        NotificationsPage.checkAndAddEmptyNotificationsDivs(hasMoreNotifications);

        if (hasMoreNotifications) {
            const $loadMoreNotificationsBtn = jQuery("#loadMoreNotificationsBtn");

            $loadMoreNotificationsBtn.show();
        }     
    }

    /**
     * This method recieves a notification object, creates a div for the notification and adds it to the page.
     *
     *  @param {object} notification 
     */
    static addNotificationToPage(notification) {
        const $todaysNotificationsDiv = jQuery("#todaysNotifications").find(".notificationsDiv");
        const $previousNotificationsDiv = jQuery("#previousNotifications").find(".notificationsDiv");
        const $notificationDiv = jQuery("<div/>", {"class": "singleNotificationDiv" + (notification["isRead"] ? " notificationIsRead" : "")});
        const $notificationBody = jQuery("<div/>", {"class": "notificationBody"});
        const $notificationTitleDiv = jQuery("<div/>", {"class": "notificationTitle"});
        const $notificationMessageDiv = jQuery("<div/>", {"class": "notificationMessage"});
        const $notificationNameDiv = jQuery("<div/>", {"class": "notificationName"});
        const $notificationDateDiv = jQuery("<div/>", {"class": "notificationDate"});
        const $trashCanDiv = jQuery("<div/>", {"class": "notificationTrashCan"});
        const $trashCanImg = jQuery("<i/>", {"class": NotificationsPage.TRASH_CAN_ICON_CLASS_NAME, "data-dateadded": notification["dateAdded"]});
    
        $notificationNameDiv.html(notification["title"]);
        $notificationMessageDiv.html(notification["message"]);
        
        $trashCanDiv.append($trashCanImg);
        $notificationTitleDiv.append($notificationDateDiv);
        $notificationTitleDiv.append($notificationNameDiv);
        $notificationDiv.append($notificationTitleDiv);
        $notificationBody.append($notificationMessageDiv);
        $notificationBody.append($trashCanDiv);
        $notificationDiv.append($notificationBody);

        const notificationDate = new Date(notification["dateAdded"]);
        
        // In case the notification is from today it should be appended to today's notifications div and the notification's hour should be displayed.
        if (NotificationsPage.isToday(notificationDate)) {
            $notificationDateDiv.html(NotificationsPage.getNotificationHourString(notificationDate));        
            $todaysNotificationsDiv.append($notificationDiv);
        }
        else {
            // In case the notification is not from today it should be appended to the previous notifications div and the notification's date should be displayed.
            $notificationDateDiv.html(notificationDate.toLocaleDateString());
            $previousNotificationsDiv.append($notificationDiv);
        }     

        NotificationsPage.initTrashCanImg($trashCanImg);
    }

    /**
     * This method receives a date object and returns whether the date is today's date or not.
     * 
     * @param {Date} date
     * @returns {Boolean} 
     */
    static isToday(date) {
       const shortDateString = date.toLocaleDateString();
       const todaysShortDateString = new Date().toLocaleDateString();

       return shortDateString == todaysShortDateString; 
   }

   /**
    * This method receives a date objedt and returns a string in the format hours:minutes.
    * 
    * @param {Date} notificationDate
    * @returns {string} 
    */
   static getNotificationHourString(notificationDate) {
      const minutes = notificationDate.getMinutes();
  
      if (minutes < 10) {
          minutes = "0" + minutes;
      }
  
      return notificationDate.getHours() + ":" + minutes;
    }

    /**
     * This method notifies the server that the user's notifications were read and resets the unread notifications count.
     * 
     * @returns {Promise<void>}
     */
    static async markNotificationAsRead() {
        const requestData = await Request.getBasicRequestDataObject();
    
        await Request.sendGroupeatRequest("user/markNotificationsAsRead", requestData);
        GroupeatNotification.resetUnreadNotificationsCount();
    }

    /**
     * This method activates the trash can image that is used to delete a specific notification.
     * 
     * @param {object} $trashCanImg 
     */
    static initTrashCanImg($trashCanImg) {
        $trashCanImg.on("click", async function() {
            const $this = jQuery(this);
            const requestData = await Request.getBasicRequestDataObject();

            requestData["dateAdded"] = $this.data("dateadded");
            await Request.sendGroupeatRequest("user/removeNotification", requestData);
            window.location.reload();
        });
    }

    /**
     * This method recieves a boolean variable indicates whether there are more notifications to load.
     * The method checks whether there are notifications from today in the page and whether there are previous notifications in the page.
     * According to this data and to the boolean that is received the method displays/hides different elements in the page. 
     * 
     * @param {Boolean} hasMoreNotifications 
     */
    static checkAndAddEmptyNotificationsDivs(hasMoreNotifications) {
        const $todaysNotificationsDiv = jQuery("#todaysNotifications").find(".notificationsDiv");
        const $previousNotificationsDiv = jQuery("#previousNotifications").find(".notificationsDiv");
    
        if ($todaysNotificationsDiv.children().length == 0) {
            jQuery("#todaysNotifications").find(".emptyNotificationsDiv").show();
        }
    
        if ($previousNotificationsDiv.children().length == 0) {
            if (hasMoreNotifications) {
                jQuery("#previousNotifications").hide();
            } 
            else {
                jQuery("#previousNotifications").find(".emptyNotificationsDiv").show();
            }
        }
    }

    /**
     * This method initializes the load more notifications button's functionality.
     */
    static initLoadMoreNotificationsButton() {
        const $loadMoreNotificationsBtn = jQuery("#loadMoreNotificationsBtn");
        
        $loadMoreNotificationsBtn.on("click", async function() {
            const $this = jQuery(this);
            const step = parseInt($this.attr("data-step")); 
            
            $loadMoreNotificationsBtn.hide();
   
            const $loadingImgDiv = jQuery("#loadMore").find(".loading");
            
            $loadingImgDiv.show();
            await NotificationsPage.loadNotifications(step); // Adding another set of notifications to the notifications page (according to the step).
            $this.attr("data-step", (step + 1).toString());
       });
    }
}

// Constants
NotificationsPage.TRASH_CAN_ICON_CLASS_NAME = "fas fa-trash-alt trash-icon";
NotificationsPage.MAX_AMOUNT_OF_NOTIFICATIONS_PER_STEP = 10; // The maximum amount of noticiations that can be received from the server in each request.

// Fetching the __NEXT_DATA__ object from 10bis.
jQuery(document).ready(() => {
    new NextDataFetcher().getNextData(() => {
        NotificationsPage.initLoadMoreNotificationsButton();
        NotificationsPage.loadNotifications(0).catch(console.log); // Adding the latest notifications to the notifications page.
    });
});
