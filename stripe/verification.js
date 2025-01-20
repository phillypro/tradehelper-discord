// stripe/verification.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { addSpecificRoleToUser } = require('../discord/utilities');
const { notifyDiscordVerified } = require('../discord/sellblue');  // <-- ADD THIS


/**
 * Checks if a user has an active subscription in Stripe.
 * If active, assigns the correct Discord role based on the Stripe Product name.
 */
async function checkforActiveSubscription(client, customerEmail, discordUserId) {
  console.log('[checkforActiveSubscription] Called with:', { customerEmail, discordUserId });

  // Convert email to lowercase to avoid matching issues
  customerEmail = customerEmail.toLowerCase();

  // 1) Retrieve matching customers by email
  let customers = await stripe.customers.list({ email: customerEmail });
  console.log('[checkforActiveSubscription] Initial customers found:', customers.data.length);

  if (customers.data.length === 0) {
    // Attempt a broader fetch if none found
    console.log('[checkforActiveSubscription] No direct match found; fetching all customers...');
    const allCustomers = await stripe.customers.list({ limit: 100 });
    const matchingCustomers = allCustomers.data.filter(
      (cust) => cust.email?.toLowerCase() === customerEmail
    );

    if (matchingCustomers.length === 0) {
      console.log('[checkforActiveSubscription] Still no matching customer found.');
      return 'No customer found with that email.';
    } else {
      console.log('[checkforActiveSubscription] Found matching customer(s) with broader fetch:', matchingCustomers.length);
      customers.data = matchingCustomers;
    }
  }

  let pastDueSubscriptionFound = false;
  let cancelledSubscriptionFound = false;
  let responseMessage = '';

  // 2) For each matching customer, get their subscriptions (all statuses)
  for (const customer of customers.data) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      expand: ['data.latest_invoice'],
    });
    console.log('[checkforActiveSubscription] Checking subscriptions for customer ID:', customer.id);

    for (const subscription of subscriptions.data) {
      const status = subscription.status;
      console.log('[checkforActiveSubscription] Subscription status:', status);

      // Check if subscription is active or trialing
      if (status === 'active' || status === 'trialing') {
        // 2a) Update Stripe metadata with Discord ID
        await stripe.customers.update(customer.id, {
          metadata: { discord: discordUserId },
        });
        console.log('[checkforActiveSubscription] Subscription is active/trialing. Updating Discord ID in metadata.');

        // 2b) Determine the Product name from the subscription item
        const subItem = subscription.items?.data?.[0];
        if (!subItem) {
          console.log('[checkforActiveSubscription] No subscription items found. Skipping.');
          continue;
        }

        // Prefer the price.product, otherwise fallback to plan.product
        const productId = subItem.price?.product || subItem.plan?.product;
        if (!productId) {
          console.log('[checkforActiveSubscription] No product found on the subscription item. Skipping role assignment.');
          continue;
        }

        // Fetch the Stripe product to get its name
        let productName = '';
        try {
          const product = await stripe.products.retrieve(productId);
          productName = product.name.toLowerCase();
          console.log('[checkforActiveSubscription] Retrieved product name:', product.name);
        } catch (error) {
          console.error('[checkforActiveSubscription] Error fetching product:', error);
        }

        // 2c) Assign the correct role based on the product name
        // Adjust the condition checks to match your Stripe product names.
        if (productName.includes('casual')) {
          await addSpecificRoleToUser(client, discordUserId, '1321766746604179518');
          console.log('[checkforActiveSubscription] Assigned "casual" role.');
        } else if (productName.includes('day')) {
          await addSpecificRoleToUser(client, discordUserId, '1321766105064411166');
          console.log('[checkforActiveSubscription] Assigned "day" role.');
        } else if (productName.includes('full time')) {
          await addSpecificRoleToUser(client, discordUserId, '1321766391442964491');
          console.log('[checkforActiveSubscription] Assigned "full time" role.');
        }
        // else: no match → optionally do nothing or fallback

        await notifyDiscordVerified({
          phoneNumber: customer.phone, 
          name: customer.name
        });

        // Subscription is valid; return immediately so we stop checking others
        return 'Subscription is active. The correct role has been assigned.';
      }

      // Handle other statuses
      if (status === 'past_due') {
        pastDueSubscriptionFound = true;
        responseMessage = `Found a subscription but it's past due. Please complete payment at this link: ${subscription.latest_invoice?.hosted_invoice_url || ''}`;
      } else if (status === 'canceled') {
        cancelledSubscriptionFound = true;
      }
    }
  }

  // 3) Determine final message based on what was found
  if (pastDueSubscriptionFound) {
    console.log('[checkforActiveSubscription] Past due subscription detected.');
    return responseMessage;
  } else if (cancelledSubscriptionFound) {
    console.log('[checkforActiveSubscription] Canceled subscription detected.');
    return 'We found the account but the subscription is canceled. Please re-subscribe at https://app.tradehelper.ai/settings/billing';
  } else {
    console.log('[checkforActiveSubscription] No active subscription found.');
    return 'We found the account in Stripe, but there is no active subscription. Please sign up at https://app.tradehelper.ai/settings/billing';
  }
}

module.exports = { checkforActiveSubscription };
