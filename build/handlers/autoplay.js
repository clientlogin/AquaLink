const https = require('https');
const cheerio = require('cheerio');

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, text: () => Promise.resolve(data) });
                } else {
                    reject(new Error(`Failed to fetch URL. Status code: ${res.statusCode}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}
async function scAutoPlay(url) {
    try {
        const res = await fetch(`${url}/recommended`);

        const html = await res.text();
        const $ = cheerio.load(html);

        const hrefs = [];
        $('noscript').each((i, noscript) => {
            if (i === 1) {
                const section = $(noscript).find('section');
                section.find('article').each((_, article) => {
                    const h2 = $(article).find('h2[itemprop="name"]');
                    const a = h2.find('a[itemprop="url"]');
                    const href = `https://soundcloud.com${a.attr('href')}`;
                    hrefs.push(href);
                });
            }
        });

        if (hrefs.length === 0) {
            throw new Error('No recommended tracks found.');
        }

        return hrefs;
    } catch (error) {
        console.error('Error in scAutoPlay:', error.message);
        throw error;
    }
}

async function spAutoPlay(track_id) {
    try {
        const tokenResponse = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=embed");
        const tokenBody = JSON.parse(await tokenResponse.text());

        if (!tokenBody.accessToken) {
            throw new Error('Failed to fetch Spotify access token.');
        }

        const recommendationsResponse = await fetch(`https://api.spotify.com/v1/recommendations?limit=10&seed_tracks=${track_id}`, {
            headers: {
                Authorization: `Bearer ${tokenBody.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const recommendations = JSON.parse(await recommendationsResponse.text());

        if (!recommendations.tracks || recommendations.tracks.length === 0) {
            throw new Error('No recommended tracks found.');
        }


        const randomTrack = recommendations.tracks[Math.floor(Math.random() * recommendations.tracks.length)];
        return randomTrack.id;
    } catch (error) {
        console.error('Error in spAutoPlay:', error.message);
        throw error;
    }
}

module.exports = { scAutoPlay, spAutoPlay };
