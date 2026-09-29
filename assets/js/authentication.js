// Permanent direct-authentication configuration for your account
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
    const token = window.localStorage.getItem('spotify_access_token');
    return token && token !== 'undefined' && token !== 'null';
}

function auth_has_recently_connected() {
    return true;
}

function auth_get_hash(length) {
    return '1234567890abcdef';
}

// Safely clear the connect UI contents without collapsing layout wrappers
function auth_parse_connection_parameters() {
    const authContainer = document.querySelector('.auth-container');
    if (authContainer && auth_check_token()) {
        // Clear out the connect button/text cleanly without hiding the element layout
        authContainer.innerHTML = '';
    }

    const token = auth_get_access_token();
    if (token && window.spotify) {
        if (typeof window.spotify.init === 'function') {
            window.spotify.init(token);
        } else if (window.spotify._constants) {
            window.spotify._constants.TOKEN = token;
        }
    }

    // Fire playlist loading immediately
    setTimeout(() => {
        if (typeof loadPlaylists === 'function') loadPlaylists();
        else if (typeof fetchPlaylists === 'function') fetchPlaylists();
        else if (window.spotify && typeof window.spotify.get_playlists === 'function') {
            window.spotify.get_playlists();
        }
    }, 100);
}

// Fallback PKCE flow if token needs renewal or initial login
async function auth_connect_spotify() {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(64)))
        .map(x => possible[x % possible.length]).join('');
    
    const encoder = new TextEncoder();
    const hashed = await window.crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashed)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    window.localStorage.setItem('code_verifier', codeVerifier);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: AUTH_CLIENT_ID,
        scope: AUTH_APPLICATION_SCOPES,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: REDIRECT_URI,
        state: 'auth_direct'
    }).toString();

    window.location.href = authUrl.toString();
}

async function auth_handle_callback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (!code) return;

    const codeVerifier = window.localStorage.getItem('code_verifier');
    if (!codeVerifier) return;
    window.localStorage.removeItem('code_verifier');

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        }
    } catch (err) {
        console.error("Token error:", err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    auth_handle_callback();
    auth_parse_connection_parameters();
});
