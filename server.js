const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const BLOOX_API_KEY = process.env.BLOOX_API_KEY;
const GUILD_ID = '1557730225616322631';

// Cache for Discord roles to avoid rate limits (refreshes every 10 minutes)
let roleCache = {};
let lastCacheTime = 0;

async function getGuildRolesMap() {
    const now = Date.now();
    if (Object.keys(roleCache).length > 0 && (now - lastCacheTime < 600000)) {
        return roleCache;
    }

    try {
        const res = await axios.get(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });

        const map = {};
        for (const role of res.data) {
            map[role.id] = role.name;
        }

        roleCache = map;
        lastCacheTime = now;
        return roleCache;
    } catch (error) {
        console.error('Failed to fetch guild roles:', error.message);
        return roleCache;
    }
}

app.post('/check-roles', async (req, res) => {
    const { robloxId } = req.body;

    if (!robloxId) {
        return res.status(400).json({ error: 'Missing robloxId' });
    }

    try {
        const bloxlinkRes = await axios.get(`https://api.blox.link/v4/public/guilds/${GUILD_ID}/roblox-to-discord/${robloxId}`, {
            headers: { 'Authorization': BLOOX_API_KEY }
        });

        const discordIds = bloxlinkRes.data.discordIDs || [];
        const discordId = discordIds.length > 0 ? discordIds[0] : null;

        if (!discordId) {
            return res.json({ authorizedTeams: [], message: 'User not linked via Bloxlink' });
        }

        const discordRes = await axios.get(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });

        const userRoleIds = discordRes.data.roles || [];
        const guildRolesMap = await getGuildRolesMap();

        const authorizedTeams = [];
        for (const roleId of userRoleIds) {
            const roleName = guildRolesMap[roleId];
            if (roleName) {
                authorizedTeams.push(roleName);
            }
        }

        return res.json({ authorizedTeams });

    } catch (error) {
        console.error('Error verifying role:', error.response ? error.response.data : error.message);
        return res.status(500).json({ error: 'Failed to verify roles' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});