# Ngrok Webhook Setup Guide

## Overview

This guide helps you set up ngrok for testing Razorpay webhooks locally. Ngrok creates a secure tunnel to your local development server, making it accessible from the internet for webhook testing.

## Quick Start

### 1. Run the Setup Script

```bash
npm run setup:ngrok
```

This interactive script will:
- Install ngrok package if needed
- Guide you through configuration
- Create environment files
- Provide next steps

### 2. Start Development Server

```bash
npm run dev
```

### 3. Use the Ngrok Manager

1. Look for the "Webhook Tunnel" component in your app header
2. Click "Start Tunnel" to create a public URL
3. Copy the webhook URL
4. Add it to your Razorpay dashboard

## Manual Setup

### 1. Install ngrok

```bash
npm install ngrok --save-dev
```

### 2. Get ngrok Authtoken (Optional but Recommended)

1. Go to [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
2. Sign up for a free account
3. Copy your authtoken

### 3. Configure Environment Variables

Add to your `.env` file:

```env
# Ngrok Configuration
NGROK_AUTHTOKEN=your_ngrok_authtoken_here
NGROK_REGION=us
NGROK_SUBDOMAIN=your-subdomain
AUTO_START_NGROK=true
```

## Using the Ngrok Manager

### Features

- **One-click tunnel management**: Start/stop tunnels with a button
- **Real-time status**: See tunnel status and URLs
- **Copy to clipboard**: Easy URL copying
- **Settings panel**: Configure port, region, and authentication
- **Webhook URL generation**: Automatic webhook URL creation

### Configuration Options

#### Port
- **Default**: 3000 (matches Next.js dev server)
- **Custom**: Set any port your app runs on

#### Region
- **US**: United States (default)
- **EU**: Europe
- **AU**: Australia
- **AP**: Asia Pacific

#### Authentication
- **Authtoken**: Required for custom subdomains
- **Subdomain**: Custom subdomain (requires authtoken)

## Razorpay Integration

### 1. Get Webhook URL

1. Start the ngrok tunnel
2. Copy the webhook URL from the manager
3. Example: `https://abc123.ngrok.io/api/payment/webhook`

### 2. Configure Razorpay

1. Go to your Razorpay Dashboard
2. Navigate to **Settings** → **Webhooks**
3. Click **Add New Webhook**
4. Set the webhook URL to your ngrok URL
5. Select event: `payment.captured`
6. Save the webhook

### 3. Test the Integration

1. Make a test payment through your app
2. Check the console logs for webhook events
3. Verify tokens are added to user account
4. Monitor the ngrok tunnel status

## API Endpoints

### Start Tunnel
```http
POST /api/ngrok/start
Content-Type: application/json

{
  "port": 3000,
  "authtoken": "your_token",
  "region": "us",
  "subdomain": "myapp"
}
```

### Stop Tunnel
```http
POST /api/ngrok/stop
```

### Get Status
```http
GET /api/ngrok/status
```

## Troubleshooting

### Common Issues

#### 1. Tunnel Won't Start
- **Check port**: Ensure port 3000 is available
- **Firewall**: Allow ngrok through firewall
- **Authtoken**: Verify authtoken is correct

#### 2. Webhook Not Receiving Events
- **URL format**: Ensure webhook URL ends with `/api/payment/webhook`
- **Razorpay settings**: Verify webhook is enabled in dashboard
- **Tunnel status**: Check if tunnel is still running

#### 3. Connection Errors
- **Network**: Check internet connection
- **ngrok service**: ngrok service might be down
- **Rate limits**: Free ngrok has rate limits

### Error Messages

#### "Failed to start ngrok tunnel"
- Check if port is in use
- Verify authtoken
- Check network connection

#### "Tunnel already running"
- Use the stop button first
- Check for existing ngrok processes

#### "Invalid port number"
- Port must be between 1-65535
- Use port 3000 for Next.js dev server

## Advanced Configuration

### Custom Subdomains

With an ngrok authtoken, you can use custom subdomains:

```javascript
// In ngrok manager settings
{
  "port": 3000,
  "authtoken": "your_token",
  "subdomain": "myapp"
}
```

This creates: `https://myapp.ngrok.io`

### Multiple Tunnels

You can run multiple tunnels for different services:

```bash
# Terminal 1: Main app
ngrok http 3000

# Terminal 2: API server
ngrok http 8000
```

### Environment-Specific Configuration

Create different configs for development/staging:

```env
# .env.development
NGROK_REGION=us
NGROK_SUBDOMAIN=dev-myapp

# .env.staging
NGROK_REGION=eu
NGROK_SUBDOMAIN=staging-myapp
```

## Security Considerations

### 1. Authtoken Security
- Never commit authtokens to version control
- Use environment variables
- Rotate tokens regularly

### 2. Webhook Security
- Always verify webhook signatures
- Use HTTPS (ngrok provides this)
- Implement idempotency

### 3. Development vs Production
- Use ngrok only for development/testing
- Use real domains for production
- Never expose ngrok URLs in production

## Monitoring and Logs

### Console Logs
The ngrok manager provides real-time status:
- Tunnel connection status
- URL changes
- Error messages
- Webhook events

### ngrok Dashboard
Visit [ngrok dashboard](https://dashboard.ngrok.com/) for:
- Traffic analytics
- Request logs
- Error monitoring
- Usage statistics

## Best Practices

### 1. Development Workflow
1. Start development server
2. Start ngrok tunnel
3. Configure Razorpay webhook
4. Test payments
5. Monitor webhook events
6. Stop tunnel when done

### 2. Testing Strategy
- Use test mode payments
- Monitor webhook delivery
- Verify token addition
- Test error scenarios

### 3. Team Collaboration
- Share ngrok URLs with team
- Use consistent subdomains
- Document webhook configurations
- Coordinate testing schedules

## Alternative Tools

If ngrok doesn't work for you, consider:

### 1. LocalTunnel
```bash
npm install -g localtunnel
lt --port 3000
```

### 2. Serveo
```bash
ssh -R 80:localhost:3000 serveo.net
```

### 3. Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```

## Support

### Getting Help
1. Check the troubleshooting section
2. Review ngrok documentation
3. Check console logs for errors
4. Verify Razorpay webhook settings

### Useful Links
- [ngrok Documentation](https://ngrok.com/docs)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

### Community
- ngrok Community: [ngrok.com/community](https://ngrok.com/community)
- Razorpay Support: [razorpay.com/support](https://razorpay.com/support)
