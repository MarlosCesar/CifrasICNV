import { CONFIG } from '../config.js';

export class AuthService {
    constructor(onAuthChange) {
        this.tokenClient = null;
        this.accessToken = null;
        this.onAuthChange = onAuthChange;
    }

    init() {
        this.restoreSession();

        try {
            if (typeof google !== 'undefined' && google.accounts) {
                this.initClient();
            }
        } catch (e) { console.error("Google Auth Init Pending:", e); }
    }

    restoreSession() {
        const storedToken = localStorage.getItem('google_access_token');
        const expiration = localStorage.getItem('google_token_expiration');

        if (storedToken && expiration) {
            const now = Date.now();
            // Verifica se ainda é válido (com margem de 5 minutos)
            if (now < parseInt(expiration) - 300000) {
                this.accessToken = storedToken;
                console.log("Sessão restaurada do cache.");
                // Notifica em breve para UI atualizar
                setTimeout(() => {
                    if (this.onAuthChange) this.onAuthChange(true);
                }, 100);
            } else {
                console.log("Sessão expirada.");
                this.signOut(); // Limpa
            }
        }
    }

    initClient() {
        if (this.tokenClient) return;

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            scope: CONFIG.GOOGLE_SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;

                    // Salvar no localStorage com expiração (padrão 1 hora = 3600s)
                    const expiresIn = tokenResponse.expires_in || 3599;
                    const expirationTime = Date.now() + (expiresIn * 1000);

                    localStorage.setItem('google_access_token', this.accessToken);
                    localStorage.setItem('google_token_expiration', expirationTime);

                    // Fetch User Info Immediately
                    this.fetchUserInfo().then(() => {
                        if (this.onAuthChange) this.onAuthChange(true);
                    });
                }
            },
            error_callback: (err) => {
                alert("Erro no Login Google: " + JSON.stringify(err));
            }
        });
    }

    async fetchUserInfo() {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': 'Bearer ' + this.accessToken }
            });
            const data = await res.json();
            if (data.email) {
                this.userEmail = data.email;
                localStorage.setItem('google_user_email', data.email);
            }
        } catch (e) {
            console.error("Erro ao buscar info do usuário", e);
        }
    }

    getUserEmail() {
        return this.userEmail || localStorage.getItem('google_user_email');
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
            // Se pedir login explicitamente, pode forçar prompt
            this.tokenClient.requestAccessToken();
        }
    }

    signOut() {
        this.accessToken = null;
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expiration');
        if (this.onAuthChange) this.onAuthChange(false);
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    getToken() {
        return this.accessToken;
    }
}
