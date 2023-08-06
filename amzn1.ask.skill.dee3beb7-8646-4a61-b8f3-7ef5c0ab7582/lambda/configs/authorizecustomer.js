/* Function to getAuthorization token */

// Fetch helpers from the commerce SDK
const { Customer } = require("commerce-sdk");

const { getObjectFromResponse, ResponseError, ShopperToken, stripBearer }  = require("@commerce-apps/core");

// Create a configuration to use when creating API clients
var config = require('./config');

 // Get a JWT to use with Shopper API clients, a registered customer in this case
getRegisteredShopperToken().then(async (token) => {
    try {
        // Add the token to the client configuration
        config.headers["authorization"] = token.getBearerHeader();
        config.userDetails["username"] = token.customerInfo.firstName;
        config.userDetails["customerId"] = token.customerInfo.customerId;
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

function getRegisteredShopperToken() {  
    return new Promise(async function(resolve, reject){
        try {   
            const credentials = "vivek.sh2710@gmail.com:Mars@1992";
            const buff = Buffer.from(credentials);
            const basicAuth = 'Basic '+buff.toString("base64");
            const headers = { Authorization: basicAuth };
            
            const ShopperCustomersClient = new Customer.ShopperCustomers(config);

            const response = await ShopperCustomersClient.authorizeCustomer(
                { headers: headers, body: { type: "credentials" } },
                true
            );

            if (!response.ok) {
                throw new ResponseError(response);
            }
            const customerInfo = await getObjectFromResponse(response);

            const shopperToken = new ShopperToken(
            customerInfo,
            stripBearer(response.headers.get("Authorization"))
            );
            resolve(shopperToken);
        } catch(e) {
            reject(e);
        }
    });
}

module.exports = config;
