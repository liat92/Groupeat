// Constants
const CURRENT_DAY_START_HOUR = 7;
const CURRENT_DAY_END_HOUR = 11;
const IGNORE_CURRENT_DAY_START_HOUR = true; // When set to false, the day starts at CURRENT_DAY_START_HOUR.
const IGNORE_CURRENT_DAY_END_HOUR = true; // When set to false, the day ends at CURRENT_DAY_END_HOUR.
const ISRAEL_TIME_DIFFERENCE = 1; // The time difference of the server from Israel
const ZULU_TIME_DIFFERENCE = 2; // The time difference of the server from Zulu

/**
 * Class GroupeatDate - Handles Groupeat's date related methods.
 */
class GroupeatDate extends Date {
    constructor() {
        super();
    }

    /**
     * This method returns today's date as it begins in Groupeat / 10bis.
     * 
     * @returns {GroupeatDate}
     */
    static getTodayDate() {
        const currentDay = new GroupeatDate();

        if (IGNORE_CURRENT_DAY_START_HOUR) {
            currentDay.setDate(currentDay.getDate());
            currentDay.setHours(0);
        }
        else {
            currentDay.setHours(CURRENT_DAY_START_HOUR - ZULU_TIME_DIFFERENCE);
        }

        currentDay.setMinutes(0);
        currentDay.setSeconds(0);

        return currentDay;
    }

    /**
     * This method returns tomorrow's date as it begins in Groupeat / 10bis.
     * 
     * @returns {GroupeatDate}
     */
    static getTomorrowDate() {
        const currentDay = GroupeatDate.getTodayDate();
        const tomorrow = new GroupeatDate();

        if (IGNORE_CURRENT_DAY_END_HOUR) {
            tomorrow.setDate(currentDay.getDate() + 1);
            tomorrow.setHours(0);
        }
        else {
            tomorrow.setDate(currentDay.getDate());
            tomorrow.setHours(CURRENT_DAY_END_HOUR - ZULU_TIME_DIFFERENCE);
        }

        tomorrow.setMinutes(0);
        tomorrow.setSeconds(0);

        return tomorrow;
    }

    /**
     * This method returns whether the current time is the order time in Groupeat / 10bis.
     * 
     * @returns {Boolean}
     */
    static isOrderTime() {
        if (IGNORE_CURRENT_DAY_START_HOUR || IGNORE_CURRENT_DAY_END_HOUR) {
            return true;
        }

        const currentTime = new GroupeatDate();

        if (currentTime.getHours() + ISRAEL_TIME_DIFFERENCE < CURRENT_DAY_START_HOUR || currentTime.getHours() + ISRAEL_TIME_DIFFERENCE >= CURRENT_DAY_END_HOUR) {
            return false;
        }

        return true;
    }
}

module.exports = GroupeatDate;
