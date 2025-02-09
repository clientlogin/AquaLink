const { Pool } = require("undici");

class Rest {
    constructor(aqua, options) {
        this.aqua = aqua;
        this.sessionId = options.sessionId;
        this.password = options.password;
        this.version = options.restVersion || "v4";
        this.calls = 0;
        this.baseUrl = `http${options.secure ? "s" : ""}://${options.host}:${options.port}`;
        this.pool = new Pool(this.baseUrl, { connections: 8 });
        this.headers = {
            "Content-Type": "application/json",
            Authorization: this.password,
        };
    }

    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }

    async makeRequest(method, endpoint, body = null) {
        const opts = {
            method,
            headers: { ...this.headers },
        };

        if (body) {
            opts.body = JSON.stringify(body);
        }

        const path = endpoint;

        let response;
            response = await this.pool.request({ path, ...opts });
            if (response.statusCode === 204) {
                return null;
            }
            this.calls++;
            const data = await response.body.json();
            this.aqua.emit("apiResponse", endpoint, {
                status: response.statusCode,
                headers: response.headers,
            });
            return data;
        
    }

    updatePlayer(options) {
        const { data, guildId } = options;
        let requestBody = { ...data };

        if (
            (requestBody.track?.encoded && requestBody.track?.identifier) ||
            (requestBody.encodedTrack && requestBody.identifier)
        ) {
            throw new Error("Cannot provide both 'encoded' and 'identifier' for track");
        }

        return this.makeRequest(
            "PATCH",
            `/${this.version}/sessions/${this.sessionId}/players/${guildId}?noReplace=false`,
            requestBody
        );
    }

    getPlayers() {
        return this.makeRequest("GET", `/${this.version}/sessions/${this.sessionId}/players`);
    }

    destroyPlayer(guildId) {
        return this.makeRequest("DELETE", `/${this.version}/sessions/${this.sessionId}/players/${guildId}`);
    }

    getTracks(identifier) {
        return this.makeRequest("GET", `/${this.version}/loadtracks?identifier=${encodeURIComponent(identifier)}`);
    }

    decodeTrack(track) {
        return this.makeRequest("GET", `/${this.version}/decodetrack?encodedTrack=${encodeURIComponent(track)}`);
    }

    decodeTracks(tracks) {
        return this.makeRequest("POST", `/${this.version}/decodetracks`, tracks);
    }

    getStats() {
        return this.makeRequest(
            "GET",
            `/${this.version}/stats${this.version !== "v3" ? "/all" : ""}`
        );
    }

    getInfo() {
        return this.makeRequest("GET", `/${this.version}/info`);
    }

    getRoutePlannerStatus() {
        return this.makeRequest("GET", `/${this.version}/routeplanner/status`);
    }

    getRoutePlannerAddress(address) {
        return this.makeRequest("POST", `/${this.version}/routeplanner/free/address`, { address });
    }

    async getLyrics({ track }) {
        if (track.search) {
            const v2 = await this.makeRequest(
                "GET",
                `/v4/lyrics/search?query=${encodeURIComponent(track.encoded.info.title)}&source=genius`
            );
            if (v2) {
                return v2;
            }
        }
        const v4 = await this.makeRequest(
            "GET",
            `/v4/sessions/${this.sessionId}/players/${track.guild_id}/track/lyrics?skipTrackSource=false`
        );
        return v4;
    }
}

module.exports = { Rest };
