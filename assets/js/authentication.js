// PKCE Authentication helper functions
const GENERATE_RANDOM_STRING = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

const SHA256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const BASE64_ENCODE = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

async function auth_connect_spotify() {
    // Debug popup to instantly confirm the button handler is firing on mobile
    alert("Connecting to Spotify...");

    try {
        const codeVerifier = GENERATE_RANDOM_STRING(64);
        const hashed = await SHA256(codeVerifier);
        const codeChallenge = BASE64_ENCODE(hashed);

        window.localStorage.setItem('code_verifier', codeVerifier);

        const callback_uri = location.origin + location.pathname;
        const scopes = AUTH_APPLICATION_SCOPES;
        const integrity = auth_get_hash(60);

        log('AUTHENTICATION', `Redirecting to Spotify OAuth PKCE Page: ${callback_uri}`);

        const authUrl = new URL("https://accounts.spotify.com/authorize");
        const params = {
            response_type: 'code',
            client_id: AUTH_CLIENT_ID,
            scope: scopes,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            redirect_uri: callback_uri,
            state: integrity
        };

        authUrl.search = new URLSearchParams(params).toString();
        window.location.href = authUrl.toString();
    } catch (err) {
        alert("Auth error: " + err);
    }
}

// Check for authorization code on page load and exchange it for a token
async function auth_handle_callback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) return;

    // Clean up the URL bar immediately
    window.history.replaceState({}, document.title, location.pathname);

    const codeVerifier = window.localStorage.getItem('code_verifier');
    if (!codeVerifier) {
        log('AUTHENTICATION', 'Error: Code verifier missing from storage.');
        return;
    }

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: AUTH_CLIENT_ID,
                code: code,
                redirect_uri: location.origin + location.pathname,
                code_verifier: codeVerifier,
            }),
        });

        const data = await response.json();
        if (data.access_token) {
            window.localStorage.setItem('spotify_access_token', data.access_token);
            if (data.refresh_token) {
                window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
            }
            log('AUTHENTICATION', 'Successfully authenticated via PKCE!');
            window.location.reload();
        } else {
            alert(`Token exchange failed: ${JSON.stringify(data)}`);
        }
    } catch (err) {
        alert(`Network error during token exchange: ${err}`);
    }
}

// Trigger callback listener on load
window.addEventListener('DOMContentLoaded', () => {
    auth_handle_callback();
});
