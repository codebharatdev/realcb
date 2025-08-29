# Quick Razorpay Setup Guide

## Current Status
✅ Ngrok tunnel is working: `https://099c5811de64.ngrok-free.app`
❌ Token system needs Firebase configuration
❌ Razorpay integration needs API keys

## Step 1: Add Firebase Configuration

Add these variables to your `.env` file:

```env
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Razorpay Configuration (Required for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## Step 2: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings → General
4. Scroll down to "Your apps" section
5. Click "Add app" → Web app
6. Copy the config object

## Step 3: Get Razorpay API Keys

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to Settings → API Keys
3. Generate a new key pair
4. Copy Key ID and Key Secret

## Step 4: Configure Webhook

1. In Razorpay Dashboard, go to Settings → Webhooks
2. Add new webhook with URL: `https://099c5811de64.ngrok-free.app/api/payment/webhook`
3. Select event: `payment.captured`
4. Save and copy the webhook secret

## Step 5: Test the Integration

1. Restart your development server: `npm run dev`
2. Sign in to your app
3. You should see "Token Balance" in the header
4. Click "Recharge Tokens" to see payment options
5. Select a plan and proceed to UPI payment

## Quick Test Without Firebase (Temporary)

If you want to test the UI without Firebase, you can:

1. Comment out the token balance component temporarily
2. Add a test button to open the payment modal

Add this to your app header for testing:

```tsx
<button 
  onClick={() => setShowPaymentModal(true)}
  className="bg-orange-500 text-white px-4 py-2 rounded-lg"
>
  Test Payment Modal
</button>
```

## Current Ngrok URL
Your webhook URL is: `https://099c5811de64.ngrok-free.app/api/payment/webhook`

## Next Steps
1. Add Firebase configuration
2. Add Razorpay API keys
3. Configure webhook in Razorpay dashboard
4. Test payment flow
5. Monitor webhook events

## Need Help?
- Check `docs/RAZORPAY_SETUP.md` for detailed instructions
- Check `docs/PRICING_MECHANISM.md` for token system details
- Check `docs/NGROK_WEBHOOK_SETUP.md` for webhook testing
