# Multi-Platform Messaging Setup Guide

This guide explains how to set up and use each communication platform in GymGurus.

## Overview

GymGurus supports 6 communication platforms:
- **In-App Messaging** - Built-in, always available
- **WhatsApp** - Requires WhatsApp Business API
- **Telegram** - Requires Telegram Bot
- **Facebook Messenger** - Requires Facebook Page
- **Instagram** - Requires Instagram Business Account
- **SMS** - Requires Twilio or similar service

## Important Concepts

### Phone Numbers: E.164 Format
For WhatsApp and SMS, phone numbers MUST be in **E.164 format**:
- Format: `+[country code][number]`
- Example (US): `+14155551234`
- Example (UK): `+442071838750`
- NO spaces, dashes, or parentheses
- ALWAYS starts with `+`

### Platform-Specific IDs
Telegram, Facebook, and Instagram use platform-specific user IDs, not phone numbers:
- **Telegram**: `chat_id` (numeric)
- **Facebook**: `PSID` (Page-Scoped ID)
- **Instagram**: `IGSID` (Instagram-Scoped ID)

### Critical Limitation: User Must Initiate Contact First
⚠️ **IMPORTANT**: For Telegram, Facebook, and Instagram:
- **You CANNOT send the first message**
- **The client must message you first**
- Once they do, their platform ID is captured automatically
- Only then can you send them messages

This is a platform restriction, not a GymGurus limitation.

---

## Platform Setup

### 1. In-App Messaging ✅
**Status**: Fully functional, no setup required

**Requirements**: None - works automatically

**How it works**: Messages are sent through the GymGurus app directly.

---

### 2. SMS via Twilio

**Status**: Ready for API integration

**What you need**:
- Twilio account (https://www.twilio.com)
- Twilio Phone Number
- Twilio Account SID
- Twilio Auth Token

**Client Requirements**:
- Phone number in E.164 format: `+14155551234`

**Setup Steps**:
1. Sign up for Twilio at https://www.twilio.com
2. Purchase a phone number in Twilio
3. Get your Account SID and Auth Token from Twilio Console
4. Add these to your `.env` file:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

**How to use**:
1. When creating a client, enter their phone in E.164 format
2. Select SMS platform when sending messages
3. Messages will be sent via Twilio

**Costs**: Pay per message (varies by country)

---

### 3. WhatsApp Business API

**Status**: Ready for API integration

**What you need**:
- WhatsApp Business API account (NOT regular WhatsApp)
- Verified business with Meta
- Business website with privacy policy
- Dedicated phone number (can't be used on WhatsApp mobile app)

**Client Requirements**:
- Phone number in E.164 format: `+14155551234`
- Client must have WhatsApp on that number

**Setup Steps**:
1. Apply for WhatsApp Business API at https://business.whatsapp.com
2. Verify your business with Meta Business Manager
3. Register your phone number
4. Get your API credentials
5. Add these to your `.env` file:
   ```
   WHATSAPP_API_KEY=your_api_key
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
   ```

**How to use**:
1. Enter client phone in E.164 format when creating client
2. Select WhatsApp platform when sending messages
3. Client will receive message on their WhatsApp

**Limitations**:
- 24-hour messaging window after last user message
- Must use approved message templates outside this window
- Requires business verification

**Costs**: Free for up to 1,000 conversations/month (varies by region)

---

### 4. Telegram Bot

**Status**: Ready for bot integration

**What you need**:
- Telegram Bot Token (from @BotFather)
- Telegram account

**Client Requirements**:
- Telegram account
- **Client MUST message your bot first with /start**
- System captures their `chat_id` automatically

**Setup Steps**:
1. Open Telegram and search for @BotFather
2. Send `/newbot` and follow instructions
3. Copy the bot token provided
4. Add to your `.env` file:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   ```
5. Share your bot link with clients: `https://t.me/your_bot_username`

**How to use**:
1. Give clients your bot link
2. Client must open Telegram and click your bot link
3. Client must send `/start` command
4. System automatically captures their `chat_id`
5. You can now send them messages via Telegram

**Important**:
- You CANNOT send messages to a username like `@johndoe`
- You CANNOT initiate contact - client must start the conversation
- Once client sends `/start`, their chat_id is stored in `clientCommunicationPrefs` table

**Costs**: FREE

---

### 5. Facebook Messenger

**Status**: Ready for integration

**What you need**:
- Facebook Page (not personal profile)
- Facebook Developer App
- Page Access Token
- Webhooks configured

**Client Requirements**:
- Facebook account
- **Client MUST message your Facebook Page first**
- System captures their `PSID` automatically

**Setup Steps**:
1. Create a Facebook Page for your business
2. Go to https://developers.facebook.com
3. Create a new app with Messenger product
4. Generate a Page Access Token
5. Configure webhooks for your page
6. Add to your `.env` file:
   ```
   FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token
   FACEBOOK_VERIFY_TOKEN=your_verify_token
   FACEBOOK_APP_SECRET=your_app_secret
   ```

**How to use**:
1. Share your Facebook Page with clients
2. Client must send a message to your page
3. System captures their `PSID` (Page-Scoped ID)
4. You can now reply via GymGurus messaging interface

**Important**:
- PSID is unique per page (same user has different PSIDs on different pages)
- 24-hour messaging window after last user message
- Need message tags to message outside this window

**Costs**: FREE (but requires approved app for production)

---

### 6. Instagram Messaging

**Status**: Ready for integration

**What you need**:
- Instagram Business or Creator Account
- Facebook Page connected to Instagram
- Instagram Graph API access
- Access tokens from Facebook Developer

**Client Requirements**:
- Instagram account
- **Client MUST message your Instagram Business account first**
- System captures their `IGSID` automatically

**Setup Steps**:
1. Convert Instagram to Business/Creator account
2. Connect Instagram to a Facebook Page
3. Go to https://developers.facebook.com
4. Set up Instagram Graph API
5. Request Instagram messaging permissions
6. Add to your `.env` file:
   ```
   INSTAGRAM_ACCESS_TOKEN=your_access_token
   INSTAGRAM_BUSINESS_ACCOUNT_ID=your_business_account_id
   ```

**How to use**:
1. Share your Instagram handle with clients
2. Client must send a DM to your Instagram Business account
3. System captures their `IGSID` (Instagram-Scoped ID)
4. You can now reply via GymGurus

**Important**:
- Only works with Business/Creator accounts
- Client must initiate conversation
- Similar to Facebook Messenger (same parent company)

**Costs**: FREE (but requires approved app for production)

---

## Client Setup Checklist

### For SMS and WhatsApp
When adding a client:
1. ✅ Get their phone number
2. ✅ Convert to E.164 format: `+[country code][number]`
   - US: `+1` + 10 digits
   - UK: `+44` + number (remove leading 0)
   - For other countries: look up country code
3. ✅ Enter in client form as: `+14155551234`
4. ✅ Platform ready to use immediately

### For Telegram
When adding a client:
1. ✅ Share your bot link: `https://t.me/your_bot_username`
2. ✅ Ask client to click link and send `/start`
3. ✅ System automatically captures their `chat_id`
4. ✅ Platform shows as "Active" in communication preferences
5. ✅ You can now send messages

### For Facebook Messenger
When adding a client:
1. ✅ Share your Facebook Page link
2. ✅ Ask client to send you a message on Facebook
3. ✅ System automatically captures their `PSID`
4. ✅ Platform shows as "Active" in communication preferences
5. ✅ You can now send messages

### For Instagram
When adding a client:
1. ✅ Share your Instagram handle
2. ✅ Ask client to send you a DM
3. ✅ System automatically captures their `IGSID`
4. ✅ Platform shows as "Active" in communication preferences
5. ✅ You can now send messages

---

## Current System Status

### ✅ Fully Implemented
- In-app messaging with WebSocket real-time updates
- Multi-platform UI with platform filtering
- Message templates
- Read receipts and delivery status
- Database schema with `clientCommunicationPrefs` table

### 🔧 Ready for API Integration
- SMS via Twilio (structure ready, needs API keys)
- WhatsApp Business API (structure ready, needs setup)
- Telegram Bot (structure ready, needs bot token)
- Facebook Messenger (structure ready, needs page token)
- Instagram Messaging (structure ready, needs access token)

### 📝 What You Need to Do

1. **Choose which platforms you want to use**
   - Start with SMS (easiest) or in-app messaging only
   - Add others as needed

2. **For each platform**:
   - Follow setup steps above
   - Add API credentials to `.env` file
   - Test with a client

3. **Phone Number Format**:
   - Always use E.164 format: `+14155551234`
   - Will update client form to enforce this

4. **Platform-Specific IDs**:
   - System will capture automatically when clients message you
   - Stored in `clientCommunicationPrefs` table

---

## Database Schema

The system uses two tables for messaging:

### `clients` table
```sql
phone: text  -- Store in E.164 format: +14155551234
```

### `clientCommunicationPrefs` table
```sql
clientId: varchar        -- Links to client
platform: text           -- 'whatsapp', 'telegram', 'facebook', 'instagram', 'sms'
platformUserId: text     -- Platform-specific ID (chat_id, PSID, IGSID, or phone)
isPreferred: boolean     -- Is this their preferred platform?
isActive: boolean        -- Is this platform connection active?
```

When a client messages you on Telegram/Facebook/Instagram:
- Webhook receives their platform-specific ID
- System creates entry in `clientCommunicationPrefs`
- Platform becomes available for that client

---

## Quick Start Guide

### Option 1: Start with In-App Only
1. No setup required
2. Add clients normally
3. Use in-app messaging immediately

### Option 2: Add SMS (Easiest External Platform)
1. Sign up for Twilio (5 minutes)
2. Add credentials to `.env`
3. Enter client phones in E.164 format
4. Start sending SMS

### Option 3: Add WhatsApp
1. Apply for WhatsApp Business API (can take days for approval)
2. Set up business verification
3. Add credentials to `.env`
4. Enter client phones in E.164 format
5. Send WhatsApp messages

### Option 4: Add Telegram
1. Create bot with @BotFather (2 minutes)
2. Add bot token to `.env`
3. Share bot link with clients
4. Clients send `/start`
5. Start messaging on Telegram

---

## Troubleshooting

### "Can't send WhatsApp message"
- ✅ Check phone is in E.164 format: `+14155551234`
- ✅ Verify client has WhatsApp on that number
- ✅ Check your WhatsApp Business API is set up
- ✅ Verify API credentials in `.env`

### "Can't send Telegram message"
- ✅ Verify client has sent `/start` to your bot
- ✅ Check `clientCommunicationPrefs` table for their chat_id
- ✅ Verify bot token in `.env`
- ✅ Cannot use @username - must have chat_id

### "Can't send Facebook/Instagram message"
- ✅ Verify client has messaged your page first
- ✅ Check `clientCommunicationPrefs` table for their PSID/IGSID
- ✅ Verify access token in `.env`
- ✅ Check 24-hour messaging window

### "Invalid phone number format"
- ✅ Must start with `+`
- ✅ Must include country code
- ✅ No spaces, dashes, or parentheses
- ✅ Example: `+14155551234` (US), `+442071838750` (UK)

---

## Next Steps

1. **Update client form** to validate E.164 phone format
2. **Add platform API integrations** based on your needs
3. **Set up webhooks** to capture platform-specific IDs
4. **Test with real clients** on each platform
5. **Monitor message delivery** and adjust as needed
