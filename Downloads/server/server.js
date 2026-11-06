const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Your pre-configured credentials and IDs
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1557730225616322631';
const SOLDAT_ROLE_ID = '1557730375478812692';
const BLOOXLINK_API_KEY = 'dfa194f6-2ac9-403a-b892-8365959db78c';

app.post('/check-role', async (req, res) => {
    const { robloxId } = req.body;
    if (!robloxId) return res.status(400).json({ success: false, error: "Missing robloxId" });

    try {
        // 1. Get Discord ID from Bloxlink using your server ID and API key
        const bloxlinkRes = await axios.get(
            `https://api.blox.link/v4/public/guilds/${GUILD_ID}/roblox-to-discord/${robloxId}`,
            { headers: { 'Authorization': BLOOXLINK_API_KEY } }
        );

        const discordIds = bloxlinkRes.data.discordIDs;
        if (!discordIds || discordIds.length === 0) {
            return res.json({ success: true, hasRole: false });
        }
        const discordId = discordIds[0];

        // 2. Check Discord Member Roles using your bot token and server ID
        const memberRes = await axios.get(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`,
            { headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` } }
        );

        const roles = memberRes.data.roles;
        const hasRole = roles.includes(SOLDAT_ROLE_ID);

        return res.json({ success: true, hasRole: hasRole });

    } catch (error) {
        console.error(error.response?.data || error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));