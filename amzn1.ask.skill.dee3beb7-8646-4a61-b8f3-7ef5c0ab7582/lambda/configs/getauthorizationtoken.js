/* Function to getAuthorization token */

// Fetch helpers from the commerce SDK
const { helpers } = require("commerce-sdk");

// Create a configuration to use when creating API clients
var config = require('./config');

// Get a JWT to use with Shopper API clients, a guest token in this case
helpers.getShopperToken(config, { type: "guest" }).then(async (token) => {

    try {
        // Add the token to the client configuration
        config.headers["authorization"] = token.getBearerHeader();
    } catch (e) {
        // Print the status code and status text
        console.error(e);
        // Print the body of the error
        console.error(await e.response.text());
    }
}).catch(async (e) => {
    console.error(e);
    console.error(await e.response.text());
});

module.exports = config;