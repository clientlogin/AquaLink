const https = require('https');

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Request failed. Status code: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.end();
    });
}

async function scAutoPlay(url) {
    try {
        const html = await fetch(`${url}/recommended`);
        const matches = [...html.matchAll(/<h2 itemprop="name">.*?<a itemprop="url" href="(.*?)"/g)];
        
        const hrefs = matches.map(match => `https://soundcloud.com${match[1]}`);
        
        return hrefs.filter((href, index, self) => self.indexOf(href) === index); // Remove duplicates
    } catch (error) {
        console.error("Error fetching SoundCloud recommendations:", error);
        return [];
    }
}

async function spAutoPlay(track_id) {
    try {
        const tokenResponse = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=embed");
        const { accessToken } = JSON.parse(tokenResponse);
        
        if (!accessToken) throw new Error("Failed to retrieve Spotify access token");
        
        const recommendationsResponse = await fetch(`https://api.spotify.com/v1/recommendations?limit=10&seed_tracks=${track_id}`, {
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });
        
        const { tracks } = JSON.parse(recommendationsResponse);
        
        return tracks.length ? tracks[Math.floor(Math.random() * tracks.length)].id : null;
    } catch (error) {
        console.error("Error fetching Spotify recommendations:", error);
        return null;
    }
}

module.exports = { scAutoPlay, spAutoPlay };
