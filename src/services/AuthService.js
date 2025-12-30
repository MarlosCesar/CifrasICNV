import { CONFIG } from '../config.js';

export class AuthService {
    constructor(onAuthChange) {
        this.tokenClient = null;
        this.accessToken = null;
        this.onAuthChange = onAuthChange;
    }

    init() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            scope: CONFIG.GOOGLE_SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;
                    if (this.onAuthChange) this.onAuthChange(true);
                }
            }
        });
    }

    signIn() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken();
        }
    }

    signOut() {
        this.accessToken = null;
        // Optional: Revoke token if needed, but for client-side simple sign-out, checking null is enough
        if (this.onAuthChange) this.onAuthChange(false);
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    getToken() {
        return this.accessToken;
    }
}
