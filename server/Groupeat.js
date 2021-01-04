const express = require("express");
const app = express();
const https = require("https");
const http = require("http");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");

const Controller = require("./class/Controllers/Controller.js");
const DB = require("./class/Database/DB.js");

// Constants
const SERVER_PORT = 80;
const SSL_SERVER_PORT = 443;
const MAXIMUM_REQUEST_SIZE = "1mb";

/**
 * Class GroupeatServer - Responsible for initializing the server.
 */
class GroupeatServer {
    /**
     * This method starts the server.
     */
    start() {
        // Connecting to the database, if we're unable to connect we display an error and terminate the server.
        DB.connect().then(() => {
            app.use(bodyParser.json({"limit": MAXIMUM_REQUEST_SIZE})); // Defining the maximum size of data the server accepts.
            app.use(bodyParser.urlencoded({"limit": MAXIMUM_REQUEST_SIZE, "parameterLimit": 50000, "extended": true}));
            app.use(cors({origin: "*"})); // Accepting requests from any source. This allows us to accept requests from background scripts that run in the client and 10bis.

            // Creating the HTTP server.
            http.createServer(app).listen(SERVER_PORT, () => {
                console.log("Server is running at port " + SERVER_PORT + ".");
        
                // Initializing the controller.
                this._controller = new Controller(app, express);
                this._controller.start();
            });

            // If SSL is an option, uncomment the following code and define the exact path of the SSL certificate.
            const sslOptions = {
                key: fs.readFileSync("/etc/letsencrypt/live/groupeat.info/privkey.pem", "utf-8"),
                cert: fs.readFileSync("/etc/letsencrypt/live/groupeat.info/cert.pem", "utf-8"),
                ca: fs.readFileSync("/etc/letsencrypt/live/groupeat.info/chain.pem", "utf8")
            };

            // Create an HTTPS server along with the HTTP server.
            https.createServer(sslOptions, app).listen(SSL_SERVER_PORT);
        })
        .catch(err => {
            console.log(err);
            console.log("There was an error while connecting to the DB, terminating server...");
        });
    }
}

const server = new GroupeatServer();

server.start();