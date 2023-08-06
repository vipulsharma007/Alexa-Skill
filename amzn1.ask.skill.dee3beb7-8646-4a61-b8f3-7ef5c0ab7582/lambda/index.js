/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

// import Packages from "commerce-sdk" | Configurations to use while creating API Clients
const {Customer, Checkout, Product, Search} = require("commerce-sdk");

// Create a configuration to use when creating API clients. Also fetch the authorization token in the config obect.
var config = require('./configs/getauthorizationtoken.js');
var userJourney ={};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const repromptText = 'Please log me in';
        const speakOutput = 'Welcome, to headless commerce, Would you like to continue as guest or login ?';
        userJourney.itemNames = '';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptText)
            .getResponse();
    }
};

const CaptureUserBrowsingPrefIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureUserBrowsingPref';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};
        
        const loginName = sessionAttributes.hasOwnProperty('loginName') ? sessionAttributes.loginName : '';
        const loginPassword = sessionAttributes.hasOwnProperty('loginPassword') ? sessionAttributes.loginPassword : '';
        
        const customerType = handlerInput.requestEnvelope.request.intent.slots.loginPref.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        
        let speakOutput = 'How I can help you today. Are you looking for something';
        userJourney.isNewCustomer = false;
        if(customerType==='registered') {
            userJourney.isGuest = false;
            speakOutput = 'Please provide your username and password to continue';
        } else {
            userJourney.isGuest = true;
        }
        
        if(!userJourney.isGuest && loginName && loginPassword) {
            const { getObjectFromResponse, ShopperToken, stripBearer }  = require("@commerce-apps/core");
            const credentials = loginName + ':' + loginPassword;
            const buff = Buffer.from(credentials);
            const basicAuth = 'Basic '+buff.toString("base64");
            const headers = { Authorization: basicAuth };
            
            const ShopperCustomersClient = new Customer.ShopperCustomers(config);
            
            const response = await ShopperCustomersClient.authorizeCustomer(
                { headers: headers, body: { type: "credentials" } },
                true
            );
            if (response.ok) {
                const customerInfo = await getObjectFromResponse(response);
                const shopperToken = new ShopperToken(customerInfo, stripBearer(response.headers.get("Authorization")));
                config.headers["authorization"] = shopperToken.getBearerHeader();
                config.userDetails["firstName"] = shopperToken.customerInfo.firstName;
                config.userDetails["customerId"] = shopperToken.customerInfo.customerId;
                userJourney.loginName = loginName;
                userJourney.loginPassword = loginPassword;
                speakOutput ='Welcome' + config.userDetails["firstName"] + 'How I can help you Today, Are you looking for something';
                if(shopperToken.customerInfo.c_cartData) {
                    const abandoncart = shopperToken.customerInfo.c_cartData;
                    userJourney.itemNames = abandoncart +',';
                    const basketCount  = abandoncart.split(',');
                    if(basketCount && basketCount.length > 0) {
                      speakOutput ='Welcome' + config.userDetails["firstName"] + 'You have' + basketCount.length +'items pending in your basket. Do you want to place this order now or I can help you in something else as well';  
                    }
                }    
            }
        }

        const repromptMessage = 'Iam looking for shorts';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const CaptureCustomerLoginIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureCustomerLogin';
    },
    async handle(handlerInput) {
        const userNameAndPasswordPhrases = handlerInput.requestEnvelope.request.intent.slots.userNameAndPassword.value.split(" ");
        const username = userNameAndPasswordPhrases[0]+'@gmail.com';
        let password = userNameAndPasswordPhrases[userNameAndPasswordPhrases.length-2]+'@'+userNameAndPasswordPhrases[userNameAndPasswordPhrases.length-1];
        password = password.charAt(0).toUpperCase() + password.substring(1,password.length);
        let speakOutput ='Sorry! we could not find account based on your inputs, Would you like to create a new account';
        
        
        if(username && password) {
            const { getObjectFromResponse, ShopperToken, stripBearer }  = require("@commerce-apps/core");
            const credentials = username + ':' + password;
            const buff = Buffer.from(credentials);
            const basicAuth = 'Basic '+buff.toString("base64");
            const headers = { Authorization: basicAuth };
            
            const ShopperCustomersClient = new Customer.ShopperCustomers(config);
            
            const response = await ShopperCustomersClient.authorizeCustomer(
                { headers: headers, body: { type: "credentials" } },
                true
            );
            if (response.ok) {
                const customerInfo = await getObjectFromResponse(response);
                const shopperToken = new ShopperToken(customerInfo, stripBearer(response.headers.get("Authorization")));
                config.headers["authorization"] = shopperToken.getBearerHeader();
                config.userDetails["firstName"] = shopperToken.customerInfo.firstName;
                config.userDetails["customerId"] = shopperToken.customerInfo.customerId;
                userJourney.loginName = username;
                userJourney.loginPassword = password;
                speakOutput ='Welcome' + config.userDetails["firstName"] + 'How I can help you Today, Are you looking for something';
                if(shopperToken.customerInfo.c_cartData) {
                    const abandoncart = shopperToken.customerInfo.c_cartData;
                    userJourney.itemNames = abandoncart +',';
                    const basketCount  = abandoncart.split(',');
                    if(basketCount && basketCount.length > 0) {
                      speakOutput ='Welcome' + config.userDetails["firstName"] + 'You have' + basketCount.length +'items pending in your basket. Do you want to place this order now or I can help you in something else as well';  
                    }
                }
            }
        }
        
        //let speakOutput ='UsserName is ' +username+'password is'+password;
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const CreateAccountConsentIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateAccountConsent';
    },
    handle(handlerInput) {
        let speakOutput ='Ok! ,Thanks for the confirmation, please provide your full name';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const CustomerNameIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CustomerName';
    },
    handle(handlerInput) {
        const customerName = handlerInput.requestEnvelope.request.intent.slots.customerFullName.value.split(" ");
        userJourney.accountCustomerFirstName = customerName[0];
        userJourney.accountCustomerLastName = customerName[1];
        let speakOutput ='Hello'+ userJourney.accountCustomerFirstName + 'What username and password you want to keep for this new account';
        config.userDetails["firstName"] = userJourney.accountCustomerFirstName;
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const CreateCustomerAccountIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateCustomerAccount';
    },
    async handle(handlerInput) {
        const userNameAndPasswordPhrases = handlerInput.requestEnvelope.request.intent.slots.customerUserNameAndPassword.value.split(" ");
        const username = userNameAndPasswordPhrases[0]+'@gmail.com';
        let password = userNameAndPasswordPhrases[userNameAndPasswordPhrases.length-2]+'@'+userNameAndPasswordPhrases[userNameAndPasswordPhrases.length-1];
        password = password.charAt(0).toUpperCase() + password.substring(1,password.length);
        let speakOutput ='Congratulation! Your account has been successfully created, How I can help you today for the item you looking for';
        
        if(username && password) {
            const ShopperCustomersClient = new Customer.ShopperCustomers(config);
            const customer = await ShopperCustomersClient.registerCustomer({
                body: {
                    "customer": {
                        "email": username,
                        "firstName": userJourney.accountCustomerFirstName,
                        "lastName": userJourney.accountCustomerLastName,
                        "login": username
                    },
                    "password": password
                }
            });
            if(customer && customer.customerId) {
                config.userDetails["customerId"] = customer.customerId;
                userJourney.loginName = username;
                userJourney.loginPassword = password;
                userJourney.isNewCustomer = true;
            }
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const CaptureUserSearchedItemsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureUserSearchedItems';
    },
    async handle(handlerInput) {
        const searchedTerm = handlerInput.requestEnvelope.request.intent.slots.userSearchItem.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        const searchClient = new Search.ShopperSearch(config);
        const searchResults = await searchClient.productSearch({
            parameters: {
                q: searchedTerm,
                limit: 3
            }
        });
        
        userJourney.item1 = searchResults.hits[0].representedProduct.id;
        userJourney.item2 = searchResults.hits[1].representedProduct.id;
        userJourney.item3 = searchResults.hits[2].representedProduct.id;
        userJourney.itemName1 =  searchResults.hits[0].productName;
        userJourney.itemName2 =  searchResults.hits[1].productName;
        userJourney.itemName3 =  searchResults.hits[2].productName;


        const userWelcomeMsg = userJourney.isGuest ? '' : config.userDetails["firstName"]; 
        const speakOutput = 'Hi'+ userWelcomeMsg +'We have found following top items for you. The first item is'+ searchResults.hits[0].productName +'The Second Item is' +searchResults.hits[1].productName
        +'The third Item is' +searchResults.hits[2].productName +'would you like add any item to your basket';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};



const AddUserItemsToBasketIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AddUserItemsToBasket';
    },
     async handle(handlerInput) {
        const quantity = "1";
        const useAsBilling = true;
        let basketResult, shopperBasketsClient, basketId, reqbody, isAllItemAdded;
        
        const itemToBeAdded = handlerInput.requestEnvelope.request.intent.slots.itemIndex.resolutions.resolutionsPerAuthority[0].values[0].value.name;

        
        if(itemToBeAdded === "1"){
              isAllItemAdded = false;
              userJourney.itemNames = userJourney.itemNames + userJourney.itemName1 + ',';
              reqbody =  [
                    {
                        "productId": userJourney.item1,
                        "quantity": parseFloat(quantity),
                        "inventoryId": "inventory_m"
                    }
                ];
            userJourney.nodAddedItems = userJourney.item2 +','+ userJourney.item3;
        } else if(itemToBeAdded === "2"){
            isAllItemAdded = false;
            userJourney.itemNames = userJourney.itemNames + userJourney.itemName2 + ',';
            reqbody =  [
                    {
                        "productId": userJourney.item2,
                        "quantity": parseFloat(quantity),
                        "inventoryId": "inventory_m"
                    }
                ];
            userJourney.nodAddedItems = userJourney.item1 +','+ userJourney.item3;
            
        } else if(itemToBeAdded === "3") {
           isAllItemAdded = false;
           userJourney.itemNames = userJourney.itemNames + userJourney.itemName3 + ',';
           reqbody =  [
                    {
                        "productId": userJourney.item3,
                        "quantity": parseFloat(quantity),
                        "inventoryId": "inventory_m"
                    }
                ];
            userJourney.nodAddedItems = userJourney.item1 +','+ userJourney.item2;
            
        } else if(itemToBeAdded === 'all'){
              isAllItemAdded = true;
              userJourney.itemNames = userJourney.itemNames + userJourney.itemName1 + ',' + userJourney.itemName2 +',' + userJourney.itemName3 +',';
              reqbody =  [
                    {
                        "productId": userJourney.item1,
                        "quantity": parseFloat(quantity),
                        "inventoryId": "inventory_m"
                    },
                    {
                        "productId": userJourney.item2,
                        "quantity": parseFloat(quantity),
                        "inventoryId": "inventory_m"
                    },
                    {
                        "productId": userJourney.item3,
                        "quantity": parseFloat(quantity),
                        "inventoryId": "inventory_m"
                    }
                ];
        }
        
        //get customer existing basket
        if(!userJourney.isGuest && !userJourney.isNewCustomer && !userJourney.basketID) {
            const ShopperCustomersClient = new Customer.ShopperCustomers(config);
            shopperBasketsClient = await ShopperCustomersClient.getCustomerBaskets({
                parameters: {
                        customerId: config.userDetails["customerId"]
                }
            });
        }

        basketId = userJourney.basketID ? userJourney.basketID : null;
        
        if(shopperBasketsClient && shopperBasketsClient.baskets && shopperBasketsClient.baskets.length && shopperBasketsClient.baskets.length > 0 && shopperBasketsClient.baskets[0]){
            basketId = shopperBasketsClient.baskets[0].basketId;
        }
        
        shopperBasketsClient = new Checkout.ShopperBaskets(config);
        
        if(basketId) {
            basketResult = await shopperBasketsClient.addItemToBasket({
                parameters: {
                    basketId: basketId
                },
                body:reqbody
            });
        }
        
        
        if(!basketId) {
            basketResult = await shopperBasketsClient.createBasket({
            body : { 
                "productItems": reqbody
              }       
            });
            basketId = basketResult.basketId;
        }
        
        userJourney.basketID = basketId;
        basketResult = await shopperBasketsClient.updateShippingMethodForShipment({
            body: {
                "id": "003"
              },
              parameters: {
                  basketId: basketId,
                  shipmentId: basketResult.shipments[0].shipmentId
              }  
        });
        
        basketResult = await shopperBasketsClient.updateShippingAddressForShipment({
            body: {
                "address1": 'Residence Inn by Marriott Austin Southwest',
                "city": 'Austin',
                "countryCode": 'US',
                "firstName": 'Vivek',
                "lastName": 'Sharma',
                "postalCode": '78735',
                "stateCode": 'TX'
            },
            parameters: {
                basketId: basketId,
                shipmentId: basketResult.shipments[0].shipmentId,
                useAsBilling: useAsBilling
            }  
        });
        
        basketResult = await shopperBasketsClient.addPaymentInstrumentToBasket({
            parameters: {
                basketId: basketId
            },
            body: {
                "amount":  parseFloat(basketResult.orderTotal),
                "paymentCard": {
                    "cardType": 'Visa',
                    "expirationMonth": parseInt("12"),
                    "expirationYear": parseInt("2024"),
                    "holder": 'Vivek',
                    "maskedNumber": '*********1234'
                },
                "paymentMethodId": "CREDIT_CARD"
            }
        });
        
        let speakOutput = 'All asked items has been added to the basket and basket total is $' + basketResult.orderTotal + 'Would you like to place this order now or I can help you with something else as well';
        
        if(!isAllItemAdded && !userJourney.isGuest) {
            speakOutput = 'All asked items has been added to the basket and basket total is $'+basketResult.orderTotal +'Would you like to place this order now or I can help you with something else as well. Shall I also add remaining items to your wishlist';
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};



const CreateCustomerWishlistIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateCustomerWishlist';
    },
    async handle(handlerInput) {
        const wishListItem1 = userJourney.nodAddedItems.split(',')[0];
        const wishListItem2 = userJourney.nodAddedItems.split(',')[1];
        
        const ShopperCustomersClient = new Customer.ShopperCustomers(config);
        let shopperWishlistClient = await ShopperCustomersClient.createCustomerProductList({
            parameters: {
                    customerId: config.userDetails["customerId"]
            },
            body: {
                  "description": "My Product List",
                  "id": "MyList",
                  "name": "My Awesome List",
                  "public": true,
                  "type": "wish_list"
            }
        });
        
        if(shopperWishlistClient && shopperWishlistClient.id) {
            let wishlistId = shopperWishlistClient.id;
            shopperWishlistClient = await ShopperCustomersClient.createCustomerProductListItem({
                parameters: {
                        customerId: config.userDetails["customerId"],
                        listId: wishlistId,
                },
                body: {
                   "type": "product",
                   "priority": 1,
                   "productId" : wishListItem1,
                   "public": true,
                   "quantity": 1
                }
            });
                
            shopperWishlistClient = await ShopperCustomersClient.createCustomerProductListItem({
                parameters: {
                        customerId: config.userDetails["customerId"],
                        listId: wishlistId,
                },
                body: {
                   "type": "product",
                   "priority": 1,
                   "productId" : wishListItem2,
                   "public": true,
                   "quantity": 1
                }
            });
        }

        const speakOutput = 'The required items has been added to your wishlist, Would you like to place your order now';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const OrderPlaceConfirmationIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OrderPlaceConfirmation';
    },
    async handle(handlerInput) {
        if(!userJourney.isGuest) {
            userJourney.itemNames = userJourney.itemNames.substring(0,userJourney.itemNames.length-1);
            const attributesManager = handlerInput.attributesManager;
            const customerJourneyAttributes = {
                "loginName" : userJourney.loginName,
                "loginPassword"  : userJourney.loginPassword
            };
            attributesManager.setPersistentAttributes(customerJourneyAttributes);
            await attributesManager.savePersistentAttributes(); 
            
            const ShopperCustomersClient = new Customer.ShopperCustomers(config);
            const shopperWishlistClient = await ShopperCustomersClient.updateCustomer({
                parameters: {
                        customerId: config.userDetails["customerId"]
                },
                body: {
                    "c_cartData" : userJourney.itemNames
                }
            });
        }

        const speakOutput = 'You are welcome any time !Have a great day. Please visit us again';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt()
            .getResponse();
    }
};

const CaptureCustomerPlaceOrderIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureCustomerPlaceOrder';
    },
    async handle(handlerInput) {
        const shopperOrdersClient = new Checkout.ShopperOrders(config);
        const orderResult = await shopperOrdersClient.createOrder({
            body: {
                "basketId": userJourney.basketID
            }
        });
        
        if(!userJourney.isGuest) {
            const attributesManager = handlerInput.attributesManager;
            const customerJourneyAttributes = {
                "loginName" : userJourney.loginName,
                "loginPassword"  : userJourney.loginPassword
            };
            attributesManager.setPersistentAttributes(customerJourneyAttributes);
            await attributesManager.savePersistentAttributes();
            
            const ShopperCustomersClient = new Customer.ShopperCustomers(config);
            const shopperWishlistClient = await ShopperCustomersClient.updateCustomer({
                parameters: {
                        customerId: config.userDetails["customerId"]
                },
                body: {
                    "c_cartData" : ''
                }
            });
        }
       
        
        const speakOutput = 'Your Order Number is' +orderResult.orderNo+ 'Thankyou for shopping with us, Have a great day';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt()
            .getResponse();
    }
};

const LoadCustomerInfoInterceptor = {
    async process(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};
        
        const loginName = sessionAttributes.hasOwnProperty('loginName') ? sessionAttributes.loginName : '';
        const loginPassword = sessionAttributes.hasOwnProperty('loginPassword') ? sessionAttributes.loginPassword : '';

        if (loginName && loginPassword) {
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .withPersistenceAdapter(
    new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
    )
    .addRequestHandlers(
        LaunchRequestHandler,
        AddUserItemsToBasketIntentHandler,
        CaptureUserSearchedItemsIntentHandler,
        CaptureUserBrowsingPrefIntentHandler,
        CaptureCustomerPlaceOrderIntentHandler,
        CaptureCustomerLoginIntentHandler,
        CreateAccountConsentIntentHandler,
        CreateCustomerAccountIntentHandler,
        CreateCustomerWishlistIntentHandler,
        OrderPlaceConfirmationIntentHandler,
        CustomerNameIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
        .addRequestInterceptors(
         LoadCustomerInfoInterceptor
       )
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();