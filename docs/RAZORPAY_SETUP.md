# Razorpay Integration Setup Guide

## Prerequisites

1. A Razorpay account (sign up at https://razorpay.com)
2. Your CodeBharat.dev application deployed and accessible
3. Firebase project configured with Firestore

## Step 1: Razorpay Account Setup

### 1.1 Create Razorpay Account
1. Go to https://razorpay.com
2. Click "Sign Up" and create your account
3. Complete the verification process
4. Access your Razorpay Dashboard

### 1.2 Get API Keys
1. In your Razorpay Dashboard, go to **Settings** → **API Keys**
2. Click **Generate Key Pair**
3. Save both the **Key ID** and **Key Secret**
4. **Important**: Keep these secure and never share them publicly

### 1.3 Configure Webhooks
1. Go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Set the webhook URL: `https://yourdomain.com/api/payment/webhook`
4. Select the event: `payment.captured`
5. Save the webhook and note the **Webhook Secret**

## Step 2: Environment Variables

Add the following variables to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

Replace the values with your actual Razorpay credentials.

## Step 3: Database Setup

The token system will automatically create the required collections in Firestore:

- `userTokens` - Stores user token balances
- `tokenTransactions` - Stores all token transactions

No manual setup required.

## Step 4: Test the Integration

### 4.1 Test Payment Flow
1. Start your development server: `npm run dev`
2. Sign in to your application
3. Click on the token balance in the header
4. Select a plan and try the payment flow
5. Use Razorpay's test mode for safe testing

### 4.2 Test Webhook
1. Make a test payment
2. Check your server logs for webhook events
3. Verify tokens are added to user account
4. Confirm token balance updates in UI

## Step 5: Production Deployment

### 5.1 Update Webhook URL
1. Deploy your application to production
2. Update the webhook URL in Razorpay Dashboard
3. Use your production domain: `https://yourdomain.com/api/payment/webhook`

### 5.2 Environment Variables
1. Add Razorpay environment variables to your production environment
2. For Vercel: Add them in the Vercel dashboard
3. For other platforms: Add them according to your hosting provider

### 5.3 SSL Certificate
Ensure your production domain has a valid SSL certificate, as Razorpay requires HTTPS for webhooks.

## Step 6: Monitoring

### 6.1 Razorpay Dashboard
- Monitor payments in the Razorpay Dashboard
- Check webhook delivery status
- Review payment analytics

### 6.2 Application Logs
- Monitor webhook processing logs
- Track token consumption patterns
- Watch for payment failures

### 6.3 Firebase Console
- Monitor Firestore collections
- Check token transaction logs
- Verify user token balances

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL accessibility
   - Verify SSL certificate
   - Check firewall settings

2. **Payment Verification Fails**
   - Verify API keys are correct
   - Check signature validation
   - Ensure webhook secret matches

3. **Tokens Not Added**
   - Check Firestore permissions
   - Verify user authentication
   - Review webhook processing logs

### Support Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Support](https://razorpay.com/support/)
- [Firebase Documentation](https://firebase.google.com/docs)

## Security Best Practices

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Webhook Security**
   - Always verify webhook signatures
   - Use HTTPS for webhook URLs
   - Implement idempotency

3. **Data Protection**
   - Encrypt sensitive data
   - Implement proper access controls
   - Regular security audits

## Pricing Configuration

### Default Plans
The system comes with three default pricing plans:

1. **Basic Pack**: 20,000 tokens for ₹100
2. **Pro Pack**: 50,000 tokens for ₹200
3. **Enterprise Pack**: 150,000 tokens for ₹500

### Customizing Plans
To modify pricing plans, edit the `DEFAULT_PRICING_PLANS` array in `lib/token-manager.ts`:

```typescript
export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'custom',
    name: 'Custom Plan',
    tokens: 100000,
    price: 300,
    description: 'Custom token package'
  }
];
```

## Next Steps

1. **Analytics**: Implement usage analytics and reporting
2. **Subscriptions**: Add recurring payment options
3. **Team Accounts**: Support for shared token pools
4. **International**: Add multi-currency support

## Support

For technical support or questions about the integration:

1. Check the troubleshooting section above
2. Review the comprehensive documentation in `docs/PRICING_MECHANISM.md`
3. Contact your development team
4. Reach out to Razorpay support for payment-specific issues
