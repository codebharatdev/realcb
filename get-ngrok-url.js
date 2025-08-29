const ngrok = require('ngrok');

async function getNgrokUrl() {
  try {
    console.log('🚀 Starting ngrok tunnel...');
    
    const url = await ngrok.connect({
      addr: 3000,
      region: 'us'
    });
    
    console.log('\n✅ Ngrok tunnel started successfully!');
    console.log('🌐 Public URL:', url);
    console.log('🔗 Webhook URL:', `${url}/api/payment/webhook`);
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the webhook URL above');
    console.log('2. Add it to your Razorpay dashboard webhook settings');
    console.log('3. Make a test payment to trigger the webhook');
    console.log('4. Check the console logs for webhook events');
    
    // Keep the tunnel running
    console.log('\n⏳ Tunnel is running. Press Ctrl+C to stop.');
    
    // Set up event listeners
    ngrok.onConnect((url) => {
      console.log('🔄 Ngrok tunnel connected:', url);
    });
    
    ngrok.onDisconnect(() => {
      console.log('❌ Ngrok tunnel disconnected');
    });
    
    ngrok.onError((err) => {
      console.error('❌ Ngrok tunnel error:', err);
    });
    
  } catch (error) {
    console.error('❌ Failed to start ngrok tunnel:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping ngrok tunnel...');
  try {
    await ngrok.kill();
    console.log('✅ Ngrok tunnel stopped');
  } catch (error) {
    console.error('❌ Error stopping tunnel:', error.message);
  }
  process.exit(0);
});

getNgrokUrl();
