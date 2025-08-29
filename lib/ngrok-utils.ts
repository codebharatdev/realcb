import ngrok from 'ngrok';

export interface NgrokConfig {
  port: number;
  authtoken?: string;
  region?: string;
  subdomain?: string;
}

export class NgrokManager {
  private static instance: NgrokManager;
  private tunnelUrl: string | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  static getInstance(): NgrokManager {
    if (!NgrokManager.instance) {
      NgrokManager.instance = new NgrokManager();
    }
    return NgrokManager.instance;
  }

  async startTunnel(config: NgrokConfig): Promise<string> {
    if (this.isRunning && this.tunnelUrl) {
      console.log('Ngrok tunnel already running:', this.tunnelUrl);
      return this.tunnelUrl;
    }

    try {
      const ngrokConfig: any = {
        addr: config.port,
        region: config.region || 'us'
      };

      // Add authtoken if provided
      if (config.authtoken) {
        ngrokConfig.authtoken = config.authtoken;
      }

      // Add subdomain if provided
      if (config.subdomain) {
        ngrokConfig.subdomain = config.subdomain;
      }

      console.log('Starting ngrok tunnel...');
      this.tunnelUrl = await ngrok.connect(ngrokConfig);
      this.isRunning = true;

      console.log('✅ Ngrok tunnel started successfully!');
      console.log('🌐 Public URL:', this.tunnelUrl);
      console.log('🔗 Webhook URL:', `${this.tunnelUrl}/api/payment/webhook`);

      // Set up tunnel event listeners
      ngrok.onConnect((url) => {
        console.log('🔄 Ngrok tunnel connected:', url);
      });

      ngrok.onDisconnect(() => {
        console.log('❌ Ngrok tunnel disconnected');
        this.isRunning = false;
        this.tunnelUrl = null;
      });

      ngrok.onError((err) => {
        console.error('❌ Ngrok tunnel error:', err);
        this.isRunning = false;
        this.tunnelUrl = null;
      });

      return this.tunnelUrl;
    } catch (error) {
      console.error('Failed to start ngrok tunnel:', error);
      throw error;
    }
  }

  async stopTunnel(): Promise<void> {
    if (!this.isRunning) {
      console.log('No ngrok tunnel running');
      return;
    }

    try {
      await ngrok.kill();
      this.isRunning = false;
      this.tunnelUrl = null;
      console.log('✅ Ngrok tunnel stopped');
    } catch (error) {
      console.error('Failed to stop ngrok tunnel:', error);
      throw error;
    }
  }

  getTunnelUrl(): string | null {
    return this.tunnelUrl;
  }

  isTunnelRunning(): boolean {
    return this.isRunning;
  }

  getWebhookUrl(): string | null {
    if (!this.tunnelUrl) return null;
    return `${this.tunnelUrl}/api/payment/webhook`;
  }
}

export const ngrokManager = NgrokManager.getInstance();
