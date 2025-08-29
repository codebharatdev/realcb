# System Reset Guide

## 🚀 **Complete System Reset for Testing**

This guide explains how to reset the entire CodeBharat.dev system for fresh testing scenarios.

## 📋 **What Gets Reset**

### **✅ Data Cleared:**
- **All User Token Balances** → Reset to 1000 credits
- **All Generated Apps** → Completely deleted
- **Credit Consumption History** → All records removed
- **Token Transactions** → Payment history cleared
- **Sandbox Files** → All temporary files deleted

### **✅ What Stays:**
- **User Accounts** → Authentication data preserved
- **GitHub Connections** → OAuth tokens remain
- **System Configuration** → Admin settings intact

## 🔧 **How to Reset**

### **Method 1: Using the Reset Script (Recommended)**

1. **Navigate to the scripts directory:**
   ```bash
   cd scripts
   ```

2. **Run the reset script:**
   ```bash
   node reset-system.js
   ```

3. **Or with custom configuration:**
   ```bash
   BASE_URL=https://yourdomain.com node reset-system.js
   ```

### **Method 2: Direct API Call**

1. **Using curl:**
   ```bash
   curl -X POST https://yourdomain.com/api/admin/reset-system \
     -H "Content-Type: application/json" \
     -d '{"adminKey": "reset-all-data-2024"}'
   ```

2. **Using Postman/Insomnia:**
   - **URL:** `POST https://yourdomain.com/api/admin/reset-system`
   - **Headers:** `Content-Type: application/json`
   - **Body:**
     ```json
     {
       "adminKey": "reset-all-data-2024"
     }
     ```

### **Method 3: Environment Variable Configuration**

1. **Set the admin key in your `.env` file:**
   ```env
   ADMIN_RESET_KEY=your-custom-admin-key
   ```

2. **Use the custom key in your request:**
   ```json
   {
     "adminKey": "your-custom-admin-key"
   }
   ```

## 📊 **Reset Response**

### **Success Response:**
```json
{
  "success": true,
  "message": "Complete system reset successful",
  "resetSummary": {
    "userTokens": 5,
    "savedApps": 12,
    "creditConsumptionHistory": 45,
    "tokenTransactions": 8,
    "sandboxFiles": 3,
    "totalDocuments": 73,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "status": "All data cleared, all users reset to 1000 credits"
  }
}
```

### **Error Response:**
```json
{
  "success": false,
  "error": "Invalid admin key"
}
```

## 🎯 **Testing Scenarios After Reset**

### **1. Fresh User Experience**
- New users start with 1000 credits
- No existing apps or history
- Clean slate for testing

### **2. Credit Consumption Testing**
- Test credit deduction during app generation
- Verify credit balance updates
- Test low credit warnings

### **3. Payment Flow Testing**
- Test payment with fresh credit balance
- Verify token addition after payment
- Test payment failure scenarios

### **4. App Generation Testing**
- Test complete app generation flow
- Verify GitHub repository creation
- Test app saving and loading

### **5. End-to-End Scenarios**
- Full user journey from signup to app creation
- Payment integration testing
- Credit transparency testing

## 🔒 **Security Considerations**

### **Admin Key Protection:**
- **Default Key:** `reset-all-data-2024`
- **Custom Key:** Set via `ADMIN_RESET_KEY` environment variable
- **Production:** Use a strong, unique admin key

### **Access Control:**
- Only authorized personnel should have the admin key
- Reset should be done in controlled testing environments
- Monitor reset activities in production logs

## 🚨 **Important Warnings**

### **⚠️ Data Loss:**
- **This is a destructive operation**
- All user data will be permanently deleted
- No recovery mechanism available

### **⚠️ Production Use:**
- **Never use in production without backup**
- Always backup data before reset
- Test in staging environment first

### **⚠️ User Impact:**
- All users will lose their apps and history
- Credit balances reset to 1000
- GitHub repositories remain (but app links lost)

## 📝 **Best Practices**

### **1. Testing Workflow:**
```bash
# 1. Start development server
npm run dev

# 2. Reset system for fresh testing
node scripts/reset-system.js

# 3. Test your scenarios
# 4. Repeat reset as needed
```

### **2. Environment Management:**
- Use different admin keys for different environments
- Document reset procedures for your team
- Keep reset scripts in version control

### **3. Monitoring:**
- Check server logs after reset
- Verify all collections are cleared
- Confirm user token balances are reset

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **"Invalid admin key" Error**
   - Check if admin key matches environment variable
   - Verify key is correctly set in `.env` file

2. **"Firebase not configured" Error**
   - Ensure Firebase credentials are set
   - Check Firebase connection

3. **"Failed to reset system" Error**
   - Check server logs for detailed error
   - Verify database permissions
   - Ensure all collections exist

### **Debug Commands:**
```bash
# Check if server is running
curl http://localhost:3000/api/test-setup

# Test admin endpoint (without reset)
curl -X POST http://localhost:3000/api/admin/reset-system \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "wrong-key"}'
```

## 📞 **Support**

If you encounter issues with the system reset:

1. **Check server logs** for detailed error messages
2. **Verify environment variables** are correctly set
3. **Test with default admin key** first
4. **Contact development team** if issues persist

---

## 🎯 **Ready for Testing!**

Your system reset is now configured for comprehensive testing. Use the reset script whenever you need a fresh start for end-to-end testing scenarios! 🚀
