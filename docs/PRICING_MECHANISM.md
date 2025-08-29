# Token-Based Pricing Mechanism

## Overview

CodeBharat.dev implements a token-based pricing system where users pay for AI code generation using tokens. This system provides a fair and transparent pricing model that scales with usage.

## How It Works

### 1. Token System
- **Tokens**: Virtual currency used to pay for AI code generation
- **Consumption**: Tokens are consumed based on the complexity and length of AI requests
- **Recharge**: Users can purchase tokens through UPI payments via Razorpay

### 2. Pricing Plans

| Plan | Tokens | Price (INR) | Price per 1K tokens |
|------|--------|-------------|-------------------|
| Basic Pack | 20,000 | ₹100 | ₹5.00 |
| Pro Pack | 50,000 | ₹200 | ₹4.00 |
| Enterprise Pack | 150,000 | ₹500 | ₹3.33 |

### 3. Token Consumption

#### Estimation Formula
```javascript
// Base estimation: 1 token ≈ 4 characters
const baseTokens = Math.ceil(prompt.length / 4);

// Add buffer for AI processing (30%)
const bufferTokens = Math.ceil(baseTokens * 0.3);

// Minimum tokens for any request
const minTokens = 100;

const totalTokens = Math.max(minTokens, baseTokens + bufferTokens);
```

#### Example Consumption
- **Short prompt** (100 chars): ~100 tokens
- **Medium prompt** (500 chars): ~163 tokens  
- **Long prompt** (1000 chars): ~325 tokens
- **Complex request** (2000 chars): ~650 tokens

## Implementation Details

### 1. Database Schema

#### User Tokens Collection
```javascript
{
  userId: string,
  tokens: number,
  lastRecharge: Date,
  totalSpent: number,
  totalRecharged: number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Token Transactions Collection
```javascript
{
  id: string,
  userId: string,
  type: 'recharge' | 'consumption' | 'refund',
  amount: number,
  description: string,
  paymentId?: string,
  createdAt: Date
}
```

### 2. API Endpoints

#### Token Management
- `GET /api/tokens/balance?userId={userId}` - Get user token balance
- `POST /api/tokens/consume` - Consume tokens for AI generation

#### Payment Processing
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment and add tokens
- `POST /api/payment/webhook` - Razorpay webhook handler

### 3. Frontend Components

#### TokenBalance Component
- Displays current token balance
- Shows recent transactions
- Provides quick recharge access
- Low balance warnings

#### PaymentModal Component
- Plan selection interface
- Razorpay UPI integration
- Payment status tracking
- Success/failure handling

## Razorpay Integration

### 1. Setup Requirements

#### Environment Variables
```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### Razorpay Dashboard Configuration
1. Create a Razorpay account
2. Get API keys from dashboard
3. Configure webhook URL: `https://yourdomain.com/api/payment/webhook`
4. Enable UPI payment method
5. Set webhook events: `payment.captured`

### 2. Payment Flow

1. **User selects plan** → Frontend calls `/api/payment/create-order`
2. **Razorpay order created** → Returns payment URL
3. **User completes UPI payment** → Razorpay processes payment
4. **Webhook triggered** → `/api/payment/webhook` receives notification
5. **Tokens added** → User account updated automatically
6. **UI refreshed** → Token balance updated in real-time

### 3. Security Measures

- **Signature verification** for all webhook requests
- **Payment amount validation** against plan pricing
- **User ID verification** from order notes
- **Duplicate payment prevention** using payment IDs

## User Experience

### 1. Token Balance Display
- **Header integration**: Token balance shown in main header
- **Real-time updates**: Balance updates after each transaction
- **Low balance alerts**: Warning when tokens < 1000
- **Quick recharge**: One-click access to payment modal

### 2. Payment Process
- **Plan comparison**: Clear pricing and value comparison
- **UPI integration**: Native UPI payment experience
- **Instant confirmation**: Real-time payment status
- **Automatic token addition**: No manual intervention required

### 3. Usage Tracking
- **Transaction history**: Complete record of all token usage
- **Cost transparency**: Clear breakdown of token consumption
- **Usage analytics**: Insights into spending patterns

## Pricing Strategy

### 1. Competitive Analysis
- **Per-token pricing**: More granular than subscription models
- **Pay-as-you-use**: No upfront commitments
- **Bulk discounts**: Better rates for larger purchases
- **Transparent pricing**: No hidden fees

### 2. Value Proposition
- **Cost-effective**: ₹3.33-₹5.00 per 1000 tokens
- **Scalable**: Works for both casual and heavy users
- **Fair usage**: Consumption based on actual AI usage
- **No waste**: Unused tokens remain available

### 3. Revenue Optimization
- **Multiple plans**: Cater to different user segments
- **Popular plan highlighting**: Guide users to best value
- **Bulk incentives**: Encourage larger purchases
- **Retention focus**: Fair pricing encourages continued usage

## Technical Considerations

### 1. Performance
- **Caching**: Token balance cached for quick access
- **Batch operations**: Efficient database updates
- **Async processing**: Non-blocking payment verification
- **Error handling**: Graceful failure recovery

### 2. Scalability
- **Database indexing**: Optimized queries for token operations
- **Rate limiting**: Prevent abuse of token consumption
- **Load balancing**: Handle high payment volumes
- **Monitoring**: Track system performance and usage

### 3. Security
- **Input validation**: Sanitize all user inputs
- **SQL injection prevention**: Use parameterized queries
- **XSS protection**: Sanitize frontend data
- **CSRF protection**: Secure payment forms

## Future Enhancements

### 1. Advanced Features
- **Subscription plans**: Monthly/yearly token packages
- **Team accounts**: Shared token pools
- **Usage analytics**: Detailed consumption reports
- **Auto-recharge**: Automatic token replenishment

### 2. Payment Methods
- **Credit/Debit cards**: Additional payment options
- **Net Banking**: Bank transfer integration
- **Wallets**: Digital wallet support
- **International payments**: Multi-currency support

### 3. Pricing Models
- **Dynamic pricing**: Usage-based rate adjustments
- **Loyalty programs**: Rewards for regular users
- **Referral bonuses**: Token rewards for referrals
- **Seasonal discounts**: Promotional pricing

## Monitoring and Analytics

### 1. Key Metrics
- **Token consumption rate**: Average tokens per request
- **Payment conversion**: Success rate of payments
- **User retention**: Token usage patterns
- **Revenue tracking**: Monthly recurring revenue

### 2. Alerts
- **Low balance warnings**: Users approaching token limits
- **Payment failures**: Failed transaction notifications
- **System errors**: API and database issues
- **Abuse detection**: Unusual usage patterns

### 3. Reporting
- **Daily usage reports**: Token consumption summaries
- **Payment analytics**: Revenue and conversion data
- **User behavior**: Usage pattern analysis
- **System health**: Performance and error metrics

## Troubleshooting

### Common Issues

1. **Payment Failures**
   - Check Razorpay API keys
   - Verify webhook configuration
   - Validate payment amounts

2. **Token Balance Issues**
   - Check database connectivity
   - Verify transaction logs
   - Validate user authentication

3. **Webhook Problems**
   - Check webhook URL accessibility
   - Verify signature validation
   - Monitor webhook delivery

### Support Procedures

1. **User Support**
   - Token balance inquiries
   - Payment issue resolution
   - Usage clarification

2. **Technical Support**
   - API integration issues
   - Database problems
   - Performance optimization

3. **Escalation Process**
   - Critical payment failures
   - System outages
   - Security incidents
