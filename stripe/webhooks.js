// stripe/webhooks.js
module.exports = function (client) {
    const express = require('express');
    const app = express();
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { removeRoleFromUser, doesUserHaveRole, messageUserForUpdate } = require('../discord/utilities');
  
    app.use(express.json());
  
    app.post('/webhook', (request, response) => {
      const customerId = request.body.data.object.customer; 
  
      retrieveCustomer(customerId).then(customer => {
        const discordUserId = customer.metadata.discord; 
        if (discordUserId) {
          // If payment succeeded, re-check subscription or just add role
          if (request.body.type === 'payment_intent.succeeded') {
            checkAndHandleRole(client, discordUserId);
          }
  
          // Payment failed => remove role, ask them to update
          if (request.body.type === 'payment_intent.payment_failed') {
            removeRoleFromUser(client, discordUserId);
            messageUserForUpdate(client, discordUserId);
          }
  
          // Subscription deleted => remove role, optionally message
          if (request.body.type === 'customer.subscription.deleted') {
            removeRoleFromUser(client, discordUserId);
          }
  
        } else {
          console.log('Discord user ID not found in customer metadata');
        }
      }).catch(error => {
        console.error('Error retrieving customer:', error);
      });
  
      response.status(200).send('Event received');
    });
  
    function retrieveCustomer(customerId) {
      return stripe.customers.retrieve(customerId);
    }
  
    async function checkAndHandleRole(client, discordUserId) {
      try {
        const hasRole = await doesUserHaveRole(client, discordUserId);
        if (hasRole) {
          return; // They already have some role assigned. Possibly re-check if you want to upgrade/downgrade
        } else {
          // You can call your checkforActiveSubscription again to get the right tier
          // or just manually add a role. 
          // Best approach is to re-run the checkforActiveSubscription so the correct tier is assigned.
        }
      } catch (error) {
        console.error('Error in checkAndHandleRole:', error);
      }
    }
  
    return app;
  };
  