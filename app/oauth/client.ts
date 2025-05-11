import { ClientCredentials } from 'simple-oauth2';

class OAuthClient {
  private client;
  private token: any = null;
  private options: { client: { id: string; secret: string }; auth: { tokenHost: string } };

  constructor(oauthOptions: { client: { id: string; secret: string }; auth: { tokenHost: string } }) {
    console.log('Initializing OAuth client with tokenHost:', oauthOptions.auth.tokenHost);
    console.log('Client ID exists:', !!oauthOptions.client.id);
    console.log('Client Secret exists:', !!oauthOptions.client.secret);
    
    this.options = oauthOptions;
    
    try {
      this.client = new ClientCredentials(oauthOptions);
      console.log('OAuth client initialized successfully');
    } catch (err) {
      console.error('Failed to initialize OAuth client:', err);
      throw err;
    }
  }

  async getToken(): Promise<string> {
    try {
      console.log('Getting OAuth token...');
      console.log('Current token exists:', !!this.token);
      
      if (this.token === null || this.token.expired()) {
        console.log('Token null or expired, requesting new token from:', this.options.auth.tokenHost);
        try {
          const token = await this.client.getToken({ scope: '' });
          console.log('Successfully retrieved new token');
          this.token = token;
        } catch (tokenErr) {
          console.error('Error during token request:', tokenErr);
          console.error('Request details:', {
            tokenHost: this.options.auth.tokenHost,
            clientIdPrefix: this.options.client.id ? this.options.client.id.substring(0, 5) + '...' : 'missing'
          });
          throw tokenErr;
        }
      } else {
        console.log('Using existing valid token');
      }
      
      return this.token.token.access_token;
    } catch (err) {
      console.error(`Failed to retrieve client credentials oauth token: ${(err as Error).message}`);
      throw err;
    }
  }
}

export default OAuthClient;
