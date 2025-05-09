import { ClientCredentials } from 'simple-oauth2';

class OAuthClient {
  private client;
  private token: any = null;

  constructor(oauthOptions: { client: { id: string; secret: string }; auth: { tokenHost: string } }) {
    this.client = new ClientCredentials(oauthOptions);
  }

  async getToken(): Promise<string> {
    try {
      if (this.token === null || this.token.expired()) {
        const token = await this.client.getToken({ scope: '' });
        this.token = token;
      }
      return this.token.token.access_token;
    } catch (err) {
      console.error(`Failed to retrieve client credentials oauth token: ${(err as Error).message}`);
      throw err;
    }
  }
}

export default OAuthClient;
