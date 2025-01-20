// discord/sellblue.js
const axios = require('axios');

async function notifyDiscordVerified({ phoneNumber, name }) {
  if (!phoneNumber || !name) {
    console.log('notifyDiscordVerified: Missing phoneNumber or name, skipping SellBlue message.');
    return;
  }

  // If you store SellBlue creds in ENV, load them here:
  const sellBlueApiKey = process.env.VITE_SELLBLUE_API_KEY;
  const sellBlueUserId = process.env.VITE_SELLBLUE_USER_ID;
  const sellBluePhoneNumberId = process.env.VITE_SELLBLUE_PHONE_NUMBER_ID;
  const sellBlueAssistantId = process.env.VITE_SELLBLUE_ASSISTANT_ID;
  const sellBlueApiKeyValue = process.env.VITE_SELLBLUE_API_KEY_VALUE;

  // Make sure these are actually defined in your environment:
  if (!sellBlueApiKey || !sellBlueUserId || !sellBluePhoneNumberId || !sellBlueAssistantId) {
    console.error('notifyDiscordVerified: SellBlue API environment variables not configured.');
    return;
  }

  // Basic name splitting:
  const [ firstName, ...rest ] = name.split(' ');
  const lastName = rest.join(' ') || '';

  // Example text
  const messageText = `Saw you got discord access`;

  // NOTE: If SellBlue interprets scheduledAt as "minutes from now," then `2` is 2 minutes from now
  const messageData = {
    text: messageText,
    recipient: phoneNumber,
    name: `${firstName} ${lastName}`,
    assistant: sellBlueAssistantId,
    scheduledAt: 2,
    phoneNumberId: sellBluePhoneNumberId,
    conversationgroup: 'Active Member With Discord',
    existingSkip: false
  };

  // If you want to set an "existingText":
  // messageData.existingText = "I see you're all set up in Discord now! Let’s get you going...";

  try {
    const response = await axios.post('https://api.sellblue.ai/api/v1/message/outbound', messageData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: sellBlueApiKey,
        userid: sellBlueUserId,
        'api-Key': sellBlueApiKeyValue
      },
    });
    console.log('notifyDiscordVerified: SellBlue response:', response.data);
    return response.data;
  } catch (error) {
    console.error('notifyDiscordVerified: SellBlue API error:', error.response?.data || error.message);
  }
}

module.exports = {
  notifyDiscordVerified
};
