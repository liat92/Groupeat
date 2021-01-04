/**
 * Class UIHelper - Contains useful UI methods.
 */
class UIHelper {
    /**
     * This method adds Groupeat's tooltip to selected elements which will be displayed upon hovering on them.
     * There are 2 types of tooltips - a "big" one and a "small" one which can be defined by the "isSmall" parameter.
     * 
     * @param {Array<object>} $element 
     * @param {string} text 
     * @param {Boolean} isSmall 
     * @param {Number} width Sets the width of the tooltip.
     * @param {string} style Sets the style of the tooltip.
     */
    static addTooltip($element, text, isSmall, width, style) {
        // If the element already has a tooltip, we should remove it before adding the new tooltip.
        if ($element.hasClass("groupeatTooltip") || $element.hasClass("groupeatTooltipSmall")) {
            UIHelper.removeTooltip($element);
        }

        const className = "groupeatTooltip" + (isSmall ? "Small" : "");

        if (typeof style !== "string") {
            style = "";
        }
        else {
            style = " " + style;
        }

        let leftMargin = "";

        width = parseFloat(width);

        if (isSmall) {
            if (!isNaN(width)) {
                width = "width: " + width + "px;";
            }
            else {
                width = "";
            }
        }
        else {
            if (Helper.isEmpty(width) || isNaN(width)) {
                width = "width: 200px;";
            }
            else {
                leftMargin = "margin-left: " + -1 * (0.5 * width) + "px;";
                width = "width: " + width + "px;";
            }
        }

        const $text = jQuery("<span/>", {"class": "groupeatTooltipText", "style": width + " " + leftMargin + style});

        // Adding the tooltip to the element.
        $element.addClass(className);
        $text.html(text);
        $element.append($text);
    }

    /**
     * This method receives an element and removes Groupeat's tooltip from the element.
     * 
     * @param {Array<object>} $element 
     */
    static removeTooltip($element) {
        $element.removeClass("groupeatTooltip");
        $element.removeClass("groupeatTooltipSmall");
        $element.find(".groupeatTooltipText").remove();
    }
}
