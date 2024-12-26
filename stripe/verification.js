// stripe/verification.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { 
  addSpecificRoleToUser
} = require('../discord/utilities.js');

async function checkforActiveSubscription(client, customerEmail, discordUserId) {
    console.log('Checking for active subscription...');
    customerEmail = customerEmail.toLowerCase();
    
    // 1) Retrieve customer by email
    let customers = await stripe.customers.list({ email: customerEmail });
    if (customers.data.length === 0) {
        // Attempt second fetch
        const newCustomers = await stripe.customers.list({ limit: 100 });
        const matchingCustomers = newCustomers.data.filter(newCustomer => 
            newCustomer.email?.toLowerCase() === customerEmail
        );
        if (matchingCustomers.length > 0) {
            customers.data = matchingCustomers;
        } else {
            return 'No customer found with that email.';
        } 
    }

    let pastDueSubscriptionFound = false;
    let cancelledSubscriptionFound = false;
    let responseMessage = '';

    // 2) Check subscriptions for each matching customer
    for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            expand: ['data.latest_invoice', 'data.items.price.product']
        });
        
        for (const subscription of subscriptions.data) {
            const status = subscription.status;

            // If subscription is active or trialing, 
            //  check the name of the product or price to see which role they get.
            if (status === 'active' || status === 'trialing') {

                // Update Stripe metadata
                await stripe.customers.update(customer.id, {
                    metadata: { discord: discordUserId }
                });

                // Identify the product name or plan name (depends on how your Stripe is set up)
                // subscription.items.data[0].price.product.name might differ in your setup
                let productName = '';
                if (
                  subscription.items &&
                  subscription.items.data &&
                  subscription.items.data.length > 0 &&
                  subscription.items.data[0].price &&
                  subscription.items.data[0].price.product
                ) {
                  productName = subscription.items.data[0].price.product.name.toLowerCase();
                }

                // Decide which role to add
                if (productName.includes('casual')) {
                    // CASUAL TIER
                    await addSpecificRoleToUser(client, discordUserId, '1321766746604179518');
                } else if (productName.includes('day')) {
                    // DAY TIER
                    await addSpecificRoleToUser(client, discordUserId, '1321766105064411166');
                } else if (productName.includes('full time')) {
                    // FULL TIME TIER
                    await addSpecificRoleToUser(client, discordUserId, '1321766391442964491');
                } else {
                    // If no match, you can default to some fallback or do nothing
                    // For example, a fallback role or a message.
                }

                return 'Subscription is active. Correct role has been assigned.';
            }
            else if (status === 'past_due') {
                pastDueSubscriptionFound = true;
                responseMessage = `Found a subscription but it's past due. Please complete payment at this link: ${subscription.latest_invoice.hosted_invoice_url}`;
            }
            else if (status === 'canceled') {
                cancelledSubscriptionFound = true;
            }
        }
    }

    // 3) After checking all subs
    if (pastDueSubscriptionFound) {
        return responseMessage;
    } else if (cancelledSubscriptionFound) {
        return 'We found the account but the subscription is canceled. Please re-subscribe at https://app.tradehelper.ai/settings/billing';
    } else {
        return 'We found the account in Stripe, but there is no active subscription. Please sign up at https://app.tradehelper.ai/settings/billing';
    }
}

module.exports = { checkforActiveSubscription };
