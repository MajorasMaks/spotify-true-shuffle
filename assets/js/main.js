    } catch (error) {
        log('ERROR', 'Failed to retrieve Spotify playlists: ' + error.message);
        
        // This will print the exact Spotify API error directly onto the screen
        const loading_message = document.getElementById('application_message') || document.getElementById('loading_message');
        if (loading_message) {
            loading_message.innerText = `Error: ${error.message}`;
        }
        
        // Optional: also pop up an alert so you see it instantly on mobile
        alert(`Spotify Error: ${error.message}`);
        
        return console.log(error);
    }
