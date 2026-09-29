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
    return !!auth_get_access_token();
}

function auth_has_recently_connected() {
    return !!window.localStorage.getItem('spotify_access_token');
}

function auth_get_hash(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length || 16));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

function auth_parse_connection_parameters() {
    // Handled in auth_handle_callback
}

// Connect trigger using Token response type (Implicit Flow)
async function auth_connect_spotify() {
    try {
        const state = auth_get_hash(32);
        const authUrl = new URL("https://accounts.spotify.com/authorize");
        const params = {
            response_type: 'token',
            client_id: AUTH_CLIENT_ID,
            scope: AUTH_APPLICATION_SCOPES,
            redirect_uri: REDIRECT_URI,
            state: state,
            show_dialog: 'true'
        };

        authUrl.search = new URLSearchParams(params).toString();
        window.location.href = authUrl.toString();
    } catch (err) {
        alert("Auth error: " + err);
    }
}

// Extract access token directly from the URL hash fragment upon return
async function auth_handle_callback() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (!accessToken) return;

    // Save token and clean URL hash
    window.localStorage.setItem('spotify_access_token', accessToken);
    window.history.replaceState({}, document.title, REDIRECT_URI);
    window.location.reload();
}

window.addEventListener('DOMContentLoaded', () => {
    auth_handle_callback();
});
