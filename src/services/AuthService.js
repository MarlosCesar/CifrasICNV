import { CONFIG } from '../config.js';

export class AuthService {
    constructor(onAuthChange) {
        this.tokenClient = null;
        this.accessToken = null;
        this.onAuthChange = onAuthChange;
    }

    init() {
        // Tenta inicializar. Se google falhar (ainda não carregou), ignora silenciosamente
        // pois tentaremos novamente no click do botão.
        try {
            if (typeof google !== 'undefined' && google.accounts) {
                this.initClient();
            }
        } catch (e) { console.error("Google Auth Init Pending:", e); }
    }

    initClient() {
        if (this.tokenClient) return;

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            scope: CONFIG.GOOGLE_SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;
                    if (this.onAuthChange) this.onAuthChange(true);
                }
            },
            error_callback: (err) => {
                alert("Erro no Login Google: " + JSON.stringify(err));
            }
        });
    }

    signIn() {
        // Garantir que esteja inicializado antes de chamar
        if (!this.tokenClient) {
            if (typeof google !== 'undefined' && google.accounts) {
                this.initClient();
            } else {
                alert("O sistema do Google ainda está carregando ou foi bloqueado. Verifique sua conexão ou Recarregue a página.");
                return;
            }
        }

        if (this.tokenClient) {
            this.tokenClient.requestAccessToken();
        }
    }

    signOut() {
        this.accessToken = null;
        if (this.onAuthChange) this.onAuthChange(false);
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    getToken() {
        return this.accessToken;
    }
}
