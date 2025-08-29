import Razorpay from 'razorpay';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  upi?: {
    vpa: string;
  };
  created_at: number;
}

export class RazorpayClient {
  private static instance: RazorpayClient;
  private client: Razorpay;

  private constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials not configured');
      throw new Error('Razorpay credentials not configured');
    }



    try {
      this.client = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } catch (error) {
      console.error('Failed to initialize Razorpay client:', error);
      throw new Error('Failed to initialize Razorpay client');
    }
  }

  static getInstance(): RazorpayClient {
    if (!RazorpayClient.instance) {
      RazorpayClient.instance = new RazorpayClient();
    }
    return RazorpayClient.instance;
  }

  async createOrder(amount: number, receipt: string, notes?: Record<string, string>): Promise<RazorpayOrder> {
    try {
      const order = await this.client.orders.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt,
        notes: notes || {},
        payment_capture: 1, // Auto capture payment
      });

      return order as RazorpayOrder;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  async verifyPayment(paymentId: string, orderId: string, signature: string): Promise<boolean> {
    try {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(orderId + '|' + paymentId)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  async getPaymentDetails(paymentId: string): Promise<RazorpayPayment> {
    try {
      const payment = await this.client.payments.fetch(paymentId);
      return payment as RazorpayPayment;
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  async getOrderDetails(orderId: string): Promise<RazorpayOrder> {
    try {
      const order = await this.client.orders.fetch(orderId);
      return order as RazorpayOrder;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  // Generate UPI payment link
  generateUPIPaymentLink(orderId: string, amount: number, description: string): string {
    const keyId = process.env.RAZORPAY_KEY_ID;
    // Use test payment URL for test keys
    const baseUrl = keyId?.startsWith('rzp_test_') 
      ? 'https://checkout.razorpay.com/v1/checkout.html'
      : 'https://pay.razorpay.com';
    
    const params = new URLSearchParams({
      key_id: keyId!,
      amount: (amount * 100).toString(), // Convert to paise
      currency: 'INR',
      name: 'CodeBharat.dev',
      description,
      order_id: orderId,
      prefill: JSON.stringify({
        method: 'upi'
      }),
      theme: JSON.stringify({
        color: '#F97316' // Orange color matching the app theme
      })
    });

    return `${baseUrl}?${params.toString()}`;
  }
}

export const razorpayClient = RazorpayClient.getInstance();
