#!/usr/bin/env node

/**
 * Ngrok Setup Script for Webhook Testing
 * This script helps you set up ngrok for testing Razorpay webhooks locally
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupNgrok() {
  console.log('🚀 Ngrok Setup for Webhook Testing\n');
  console.log('This will help you configure ngrok for testing Razorpay webhooks locally.\n');

  // Check if ngrok is installed
  try {
    require('ngrok');
    console.log('✅ ngrok package is installed\n');
  } catch (error) {
    console.log('❌ ngrok package not found. Installing...\n');
    const { execSync } = require('child_process');
    try {
      execSync('npm install ngrok --save-dev', { stdio: 'inherit' });
      console.log('✅ ngrok package installed successfully\n');
    } catch (installError) {
      console.error('❌ Failed to install ngrok:', installError.message);
      process.exit(1);
    }
  }

  // Get ngrok authtoken
  console.log('📋 Ngrok Configuration\n');
  console.log('To use ngrok with custom subdomains and more features, you need an authtoken.');
  console.log('Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken\n');

  const hasAuthtoken = await question('Do you have an ngrok authtoken? (y/n): ');
  
  let authtoken = '';
  if (hasAuthtoken.toLowerCase() === 'y' || hasAuthtoken.toLowerCase() === 'yes') {
    authtoken = await question('Enter your ngrok authtoken: ');
  }

  // Get preferred region
  console.log('\n🌍 Ngrok Region Selection');
  console.log('Choose the region closest to you for better performance:');
  console.log('1. US (us) - United States');
  console.log('2. EU (eu) - Europe');
  console.log('3. AU (au) - Australia');
  console.log('4. AP (ap) - Asia Pacific');

  const regionChoice = await question('Select region (1-4, default: 1): ');
  const regions = ['us', 'eu', 'au', 'ap'];
  const region = regions[parseInt(regionChoice) - 1] || 'us';

  // Get subdomain preference
  let subdomain = '';
  if (authtoken) {
    const wantSubdomain = await question('\nDo you want a custom subdomain? (y/n): ');
    if (wantSubdomain.toLowerCase() === 'y' || wantSubdomain.toLowerCase() === 'yes') {
      subdomain = await question('Enter your preferred subdomain (e.g., myapp): ');
    }
  }

  // Create environment variables
  const envContent = `# Ngrok Configuration for Webhook Testing
NGROK_AUTHTOKEN=${authtoken}
NGROK_REGION=${region}
NGROK_SUBDOMAIN=${subdomain}

# Optional: Auto-start ngrok tunnel on development
AUTO_START_NGROK=true
`;

  const envPath = path.join(process.cwd(), '.env.ngrok');
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Ngrok configuration saved to .env.ngrok');
  console.log('\n📝 Next Steps:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Open the Ngrok Manager in your app header');
  console.log('3. Click "Start Tunnel" to create a public URL');
  console.log('4. Copy the webhook URL and add it to Razorpay dashboard');
  console.log('5. Make a test payment to trigger the webhook');

  if (authtoken) {
    console.log('\n🔧 Advanced Configuration:');
    console.log('- Custom subdomain available');
    console.log('- Better tunnel stability');
    console.log('- More concurrent tunnels');
  } else {
    console.log('\n💡 Pro Tip: Get a free ngrok authtoken for:');
    console.log('- Custom subdomains');
    console.log('- Better performance');
    console.log('- More features');
    console.log('Visit: https://dashboard.ngrok.com/get-started/your-authtoken');
  }

  console.log('\n🎉 Setup complete! Happy webhook testing!');
  rl.close();
}

// Handle script errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});

// Run the setup
setupNgrok().catch((error) => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});
