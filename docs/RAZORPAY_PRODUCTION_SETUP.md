# Razorpay Production Live Setup Guide

## 🚀 **Production Live Configuration**

### **Current Status**
✅ **Automatic Mode Detection**: The system automatically detects test vs production mode based on your API keys
✅ **Environment Variable Support**: All components now use environment variables
✅ **Webhook Integration**: Ready for production webhooks
✅ **Security**: Signature verification implemented

### **Step 1: Get Production API Keys**

1. **Login to Razorpay Dashboard**
   - Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Sign in with your production account

2. **Generate Production Keys**
   - Navigate to **Settings** → **API Keys**
   - Click **Generate Key Pair**
   - **Important**: Select **"Live"** mode (not test)
   - Save both **Key ID** and **Key Secret**

3. **Production Key Format**
   - Production keys start with `rzp_live_` (not `rzp_test_`)
   - Example: `rzp_live_ABC123DEF456`

### **Step 2: Environment Variables**

Add these to your `.env` file for **production**:

```env
# Razorpay Production Configuration
RAZORPAY_KEY_ID=rzp_live_your_production_key_id
RAZORPAY_KEY_SECRET=your_production_key_secret
RAZORPAY_WEBHOOK_SECRET=your_production_webhook_secret

# Frontend Razorpay Key (for client-side)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_production_key_id
```

### **Step 3: Configure Production Webhook**

1. **In Razorpay Dashboard**
   - Go to **Settings** → **Webhooks**
   - Click **Add New Webhook**

2. **Webhook Configuration**
   - **URL**: `https://yourdomain.com/api/payment/webhook`
   - **Events**: Select `payment.captured`
   - **Secret**: Generate a new webhook secret
   - **Status**: Enable the webhook

3. **Save Webhook Secret**
   - Copy the webhook secret
   - Add it to your environment variables

### **Step 4: Production Deployment**

#### **For Vercel:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all the Razorpay environment variables
4. Redeploy your application

#### **For Other Platforms:**
1. Add environment variables to your hosting platform
2. Ensure HTTPS is enabled
3. Redeploy your application

### **Step 5: Verify Production Setup**

#### **Check Environment Variables:**
```bash
# Test if production keys are loaded
curl https://yourdomain.com/api/test-setup
```

#### **Expected Response:**
```json
{
  "success": true,
  "setupStatus": {
    "razorpay": {
      "keyId": true,
      "keySecret": true,
      "webhookSecret": true
    }
  },
  "razorpayComplete": true,
  "ready": true
}
```

### **Step 6: Test Production Payment**

1. **Make a Real Payment**
   - Use a real UPI ID or card
   - Complete the payment flow
   - Verify tokens are added to account

2. **Check Webhook Processing**
   - Monitor server logs for webhook events
   - Verify payment verification
   - Confirm token balance updates

### **Step 7: Monitoring & Security**

#### **Razorpay Dashboard Monitoring:**
- **Payments**: Monitor all transactions
- **Webhooks**: Check delivery status
- **Analytics**: Review payment patterns
- **Settlements**: Track fund transfers

#### **Application Monitoring:**
- **Server Logs**: Monitor webhook processing
- **Error Tracking**: Watch for payment failures
- **Token Balance**: Verify accurate deductions
- **User Feedback**: Monitor payment success rates

### **Security Best Practices**

#### **1. API Key Security**
- ✅ Never commit keys to version control
- ✅ Use environment variables
- ✅ Rotate keys regularly
- ✅ Monitor key usage

#### **2. Webhook Security**
- ✅ Always verify signatures
- ✅ Use HTTPS for webhook URLs
- ✅ Implement idempotency
- ✅ Log all webhook events

#### **3. Payment Verification**
- ✅ Verify payment amounts
- ✅ Check user authorization
- ✅ Validate order details
- ✅ Handle duplicate payments

### **Troubleshooting Production Issues**

#### **Common Production Problems:**

1. **"Invalid API Key" Error**
   - Check if you're using production keys
   - Verify environment variables are set
   - Ensure keys are not truncated

2. **Webhook Not Receiving Events**
   - Verify webhook URL is accessible
   - Check SSL certificate validity
   - Confirm webhook is enabled in dashboard

3. **Payment Verification Fails**
   - Check webhook secret matches
   - Verify signature calculation
   - Review server logs for errors

4. **Tokens Not Added After Payment**
   - Check webhook processing logs
   - Verify user authentication
   - Confirm Firestore permissions

### **Production Checklist**

- [ ] **Production API Keys** configured
- [ ] **Environment Variables** set correctly
- [ ] **Webhook URL** points to production domain
- [ ] **SSL Certificate** valid and active
- [ ] **Payment Flow** tested with real money
- [ ] **Webhook Processing** verified
- [ ] **Token Balance Updates** working
- [ ] **Error Handling** implemented
- [ ] **Monitoring** set up
- [ ] **Security Measures** in place

### **Support Resources**

- **Razorpay Documentation**: [https://razorpay.com/docs/](https://razorpay.com/docs/)
- **Razorpay Support**: [https://razorpay.com/support/](https://razorpay.com/support/)
- **Production Status**: [https://status.razorpay.com/](https://status.razorpay.com/)

### **Emergency Contacts**

- **Razorpay Support**: support@razorpay.com
- **Technical Issues**: tech-support@razorpay.com
- **Account Issues**: accounts@razorpay.com

---

## 🎯 **Ready for Production!**

Your Razorpay integration is now configured for production live mode with:
- ✅ **Automatic test/production detection**
- ✅ **Secure payment processing**
- ✅ **Real-time webhook handling**
- ✅ **Comprehensive error handling**
- ✅ **Production-ready security measures**

**Next Steps**: Deploy to production and test with real payments! 🚀
