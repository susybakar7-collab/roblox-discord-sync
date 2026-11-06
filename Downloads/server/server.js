const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Credentials & Configurations
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1557730225616322631';
const BLOOX_API_KEY = 'dfa194f6-2ac9-403a-b892-8365959db78c';

/**
 * 🎯 CENTRAL TEAM CONFIGURATION MAP
 * Make sure team names match the exact Team name in Roblox Studio (game.Teams)
 */
const TEAM_ROLES = {
    "Armed Forces": "1557730375478812692",
    "Government": "1568310490114031696"
};

app.post('/check-roles', async (req, res) => {
    const { robloxId } = req.body;

    if (!robloxId) {
        return res.status(400).json({ error: 'Missing robloxId' });
    }

    try {
        // 1. Get Discord ID from Bloxlink v4 Guild API
        const bloxlinkRes = await axios.get(`https://api.blox.link/v4/public/guilds/${GUILD_ID}/roblox-to-discord/${robloxId}`, {
            headers: { 'Authorization': BLOOX_API_KEY }
        });

        const discordIds = bloxlinkRes.data.discordIDs || [];
        const discordId = discordIds.length > 0 ? discordIds[0] : null;

        if (!discordId) {
            return res.json({ authorizedTeams: [], message: 'User not linked via Bloxlink' });
        }

        // 2. Fetch Guild Member from Discord API v10
        const discordRes = await axios.get(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });

        const userRoles = discordRes.data.roles || [];

        // 3. Dynamically evaluate which teams the user is authorized for
        const authorizedTeams = [];
        for (const [teamName, roleId] of Object.entries(TEAM_ROLES)) {
            if (userRoles.includes(roleId)) {
                authorizedTeams.push(teamName);
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