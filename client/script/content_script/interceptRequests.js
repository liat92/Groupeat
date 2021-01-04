/**
 * This method handles intercepting requests that are sent by 10bis and saving them in the DOM.
 */
function interceptRequestsHandler() {
    var xhrOverrideScript = document.createElement("script");
    xhrOverrideScript.type = "text/javascript";
    xhrOverrideScript.innerHTML = `
    (function() {
      var XHR = XMLHttpRequest.prototype;
      var send = XHR.send;
      var open = XHR.open;

      XHR.open = function(method, url) {
          this.url = url; // the request url
          return open.apply(this, arguments);
      }

      XHR.send = function() {
          this.addEventListener("load", function() {
              const urlsToIntercept = [
                  {
                      url: "/NextApi/SetDishListInShoppingCart",
                      divName: "SetDishListInShoppingCart"
                  },
                  {
                      url: "/NextApi/SubmitOrder",
                      divName: "SubmitOrder"
                  }
              ];

              for (let i = 0; i < urlsToIntercept.length; i++) {
                  if (this.url.includes(urlsToIntercept[i]["url"])) {
                    const existsDiv = document.getElementById("__interceptedData_" + urlsToIntercept[i]["divName"]);

                    if (existsDiv != null) {
                      existsDiv.innerText = this.response;
                    }
                    else {
                      const dataDOMElement = document.createElement("div");
                      
                      dataDOMElement.id = "__interceptedData_" + urlsToIntercept[i]["divName"];
                      dataDOMElement.innerText = this.response;
                      dataDOMElement.style.height = 0;
                      dataDOMElement.style.overflow = "hidden";
                      dataDOMElement.style.display = "none";
                      document.getElementsByClassName("groupeatInterceptedRequests")[0].appendChild(dataDOMElement);
                    }
                  }
              }         
          });

          return send.apply(this, arguments);
      };
    })();
    `
    document.head.prepend(xhrOverrideScript);
}

/**
 * This method waits for the head and body to load and when they do we inject the intercept requests script
 * to the page.
 */
function checkForDOM() {
    if (document.body && document.head) {
        interceptRequestsHandler();
    } 
    else {
        requestIdleCallback(checkForDOM);
    }
}

/**
 * Creating a div where the intercepted requests are stored inside.
 */
document.addEventListener("DOMContentLoaded", function(event) { 
    const $interceptedRequestsDiv = document.createElement("div");

    $interceptedRequestsDiv.className = "groupeatInterceptedRequests";
    document.body.appendChild($interceptedRequestsDiv);
});

requestIdleCallback(checkForDOM);
