    // Define the method for making API requests to Spotify API
    instance._api_request = async ({ method = 'GET', endpoint, body, timeout = 15, json = true }) => {
        // Destructure the required constants
        const { API_BASE, TOKEN } = instance._constants;

        // Create an abort controller instance with a timeout to trigger it
        const controller = new AbortController();
        const _timeout = setTimeout(() => controller.abort(), timeout * 1000);

        // Perform the fetch request to Spotify API
        const { signal } = controller;
        let response;
        try {
            response = await fetch(`${API_BASE}${endpoint}`, {
                method,
                headers: {
                    authorization: `Bearer ${TOKEN}`,
                    'content-type': 'application/json',
                },
                body,
                signal,
            });
        } catch (err) {
            clearTimeout(_timeout);
            throw new Error(`Network error or timeout reaching Spotify: ${err.message}`);
        }

        log('SPOTIFY_API', `${response.status} ${method} ${endpoint}`);
        clearTimeout(_timeout);

        // Handle non-successful HTTP responses from Spotify
        if (!response.ok) {
            let error_details = response.statusText;
            try {
                const err_body = await response.json();
                error_details = err_body.error?.message || JSON.stringify(err_body);
            } catch (e) {}
            throw new Error(`Spotify API Error ${response.status} (${endpoint}): ${error_details}`);
        }

        // Resolve the response as a JSON object if specified by caller
        if (json) return await response.json();
        return response;
    };
