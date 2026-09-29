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

const AUTH_CLIENT_ID = '9e09bf13b9e640d8b7d94b58ad885484';
const AUTH_APPLICATION_SCOPES = [
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-modify-playback-state',
    'user-library-read',
    'user-read-playback-state'
].join(' ');

const REDIRECT_URI = 'https://spotify-true-shuffle.vercel.app/';

function auth_get_access_token() {
    return window.localStorage.getItem('spotify_access_token');
}

function auth_get_token() {
    return auth_get_access_token();
}

function auth_check_token() {
    return !!window.localStorage.getItem('spotify_access_token');
}

function auth_has_recently_connected() {
    return !!window.localStorage.getItem('spotify_refresh_token');
}

function auth_get_hash(length) {
    return GENERATE_RANDOM_STRING(length || 16);
}

// Clean UI toggle that only hides the auth card without breaking layout containers
function auth_parse_connection_parameters() {
    if (auth_check_token()) {
        const token = auth_get_access_token();

        // Safely hide only the authentication container if present
        document.querySelectorAll('.auth-container').forEach(el => {
            el.style.display = 'none';
        });

        // Inject token into any global Spotify instance if available
        if (window.spotify) {
            if (typeof window.spotify.init === 'function') {
                window.spotify.init(token);
            } else if (window.spotify._constants) {
                window.spotify._constants.TOKEN = token;
            }
        }

        // Trigger playlist loaders safely after a brief DOM settling delay
        setTimeout(() => {
            if (typeof loadPlaylists === 'function') loadPlaylists();
            else if (typeof fetchPlaylists === 'function') fetchPlaylists();
            else if (window.spotify && typeof window.spotify.get_playlists === 'function') {
                window.spotify.get_playlists();
            }
        }, 150);
    }
}

async function auth_connect_spotify() {
    try {
        const codeVerifier = GENERATE_RANDOM_STRING(64);
        const hashed = await SHA256(codeVerifier);
        const codeChallenge = BASE64_ENCODE(hashed);

        window.localStorage.setItem('code_verifier', codeVerifier);
        const integrity = auth_get_hash(60);

        const authUrl = new URL("https://accounts.spotify.com/authorize");
        const params = {
            response_type: 'code',
            client_id: AUTH_CLIENT_ID,
            scope: AUTH_APPLICATION_SCOPES,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            redirect_uri: REDIRECT_URI,
            state: integrity
        };

        authUrl.search = new URLSearchParams(params).toString();
        window.location.href = authUrl.toString();
    } catch (err) {
        alert("Auth error: " + err);
    }
}

async function auth_handle_callback() {
    if (auth_check_token()) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code')) {
            window.history.replaceState({}, document.title, REDIRECT_URI);
        }
        auth_parse_connection_parameters();
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) return;

    const codeVerifier = window.localStorage.getItem('code_verifier');
    if (!codeVerifier) return;

    window.localStorage.removeItem('code_verifier');

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
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier,
            }),
        });

        const data = await response.json();
        if (data.access_token) {
            window.localStorage.setItem('spotify_access_token', data.access_token);
            if (data.refresh_token) {
                window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
            }
            
            window.history.replaceState({}, document.title, REDIRECT_URI);
            window.location.href = REDIRECT_URI;
        } else {
            alert(`Token exchange failed: ${JSON.stringify(data)}`);
        }
    } catch (err) {
        alert(`Network error during token exchange: ${err}`);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    auth_handle_callback();
    auth_parse_connection_parameters();
});
