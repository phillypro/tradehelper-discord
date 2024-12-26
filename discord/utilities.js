const guildId = global.guildId;
const defaultRoleId = global.roleId;

/**
 * Add a *specific* role to a user, given a roleId.
 */
async function addSpecificRoleToUser(client, discordUserId, roleId) {
    console.log('[addSpecificRoleToUser] Called with:', { discordUserId, roleId });

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.error('[addSpecificRoleToUser] Guild not found');
            throw new Error('Guild not found');
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            console.error('[addSpecificRoleToUser] Role not found');
            throw new Error('Role not found');
        }

        console.log('[addSpecificRoleToUser] Fetching member...');
        const member = await guild.members.fetch(discordUserId);
        await member.roles.add(role);
        console.log(`[addSpecificRoleToUser] Role (${roleId}) added to user ${discordUserId}`);
    } catch (error) {
        console.error('Error adding specific role to user:', error);
    }
}

async function removeRoleFromUser(client, discordUserId) {
    console.log('[removeRoleFromUser] Called with:', { discordUserId });

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.error('[removeRoleFromUser] Guild not found');
            throw new Error('Guild not found');
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            console.error('[removeRoleFromUser] Role not found');
            throw new Error('Role not found');
        }

        console.log('[removeRoleFromUser] Fetching member...');
        const member = await guild.members.fetch(discordUserId);
        await member.roles.remove(role);
        console.log(`[removeRoleFromUser] Role (${roleId}) removed from user ${discordUserId}`);
    } catch (error) {
        console.error('Error removing role from user:', error);
    }
}

async function doesUserHaveRole(client, userId) {
    console.log('[doesUserHaveRole] Checking role for:', { userId });

    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const hasRole = member.roles.cache.has(defaultRoleId);

        console.log(`[doesUserHaveRole] User ${userId} has role? ${hasRole}`);
        return hasRole;
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
}

async function messageUserForUpdate(client, discordUserId) {
    console.log('[messageUserForUpdate] Attempting to message user:', discordUserId);

    try {
        const user = await client.users.fetch(discordUserId);
        if (!user) throw new Error('User not found');

        await user.send(
            "There's an issue with your account. To regain access, login to https://app.tradehelper.ai/settings/billing and update your account information"
        );
        console.log(`[messageUserForUpdate] Message sent to user ${discordUserId}`);
    } catch (error) {
        console.error('Error sending message to user:', error);
    }
}

module.exports = {
    addSpecificRoleToUser,
    removeRoleFromUser,
    doesUserHaveRole,
    messageUserForUpdate
};
