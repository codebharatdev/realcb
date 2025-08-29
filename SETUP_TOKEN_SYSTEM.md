# Quick Token System Setup Guide

## Current Issue
You're seeing "Failed to fetch token balance" because the Firebase configuration is missing.

## Quick Fix Options

### Option 1: Disable Token System (Temporary)
If you want to use the app without the token system for now:

1. **Disable token checking** by setting this in your `.env` file:
```env
DISABLE_TOKEN_SYSTEM=true
```

2. **Or comment out the token balance component** in `app/page.tsx`:
```tsx
{/* Comment out this section temporarily
{user && !authLoading && (
  <TokenBalance 
    userId={user.uid} 
    onRechargeClick={() => setShowPaymentModal(true)}
  />
)}
*/}
```

### Option 2: Complete Firebase Setup (Recommended)

#### Step 1: Get Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings → General
4. Scroll down to "Your apps" section
5. Click "Add app" → Web app
6. Copy the config object

#### Step 2: Add to .env file
Add these variables to your `.env` file:

```env
# Firebase Configuration (Required for Token System)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Razorpay Configuration (Optional - for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### Step 3: Enable Firestore
1. In Firebase Console, go to Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users

#### Step 4: Restart Development Server
```bash
npm run dev
```

## Test the Setup

1. **Check if Firebase is working**:
   - Sign in to your app
   - The token balance should now load properly
   - You should see "0" tokens initially

2. **Test token consumption**:
   - Try generating some AI code
   - You should see token consumption messages

## Next Steps

Once Firebase is working, you can:

1. **Set up Razorpay** (optional) - Follow `docs/RAZORPAY_SETUP.md`
2. **Customize pricing** - Edit `lib/token-manager.ts`
3. **Add initial tokens** - Manually add tokens to users in Firebase Console

## Troubleshooting

### Still getting errors?
1. **Check browser console** for specific error messages
2. **Verify environment variables** are loaded correctly
3. **Restart the dev server** after adding environment variables
4. **Check Firebase project settings** - ensure Firestore is enabled

### Need help?
- Check the detailed documentation in `docs/PRICING_MECHANISM.md`
- Review Firebase setup guide in `docs/GITHUB_SETUP.md`
- Contact your development team

## Quick Commands

```bash
# Check if .env file exists
ls -la .env

# View environment variables (be careful with sensitive data)
cat .env

# Restart development server
npm run dev
```
