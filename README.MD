## 🔨 Installation
```
npm i discordxp-sql
```

### Setup
```
const { GatewayIntentBits, Client, Collection, ActivityType, Partials } = require('discord.js');

const BotClient = new Client({ // Create our discord bot client
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, // IMPORTANT
        ],
    partials: [
        Partials.User,
        Partials.Channel,
        Partials.Message,
        Partials.GuildMember
        ],
});

var Leveler = require('discordxp-sql');

var leveler = new Leveler({
    client: BotClient, // Set the value to your discord bot client
    path: 'path/to/database.db' // Set this to where you want your database to be 
});

```

### Usage

```
// Below where we defined the leveler

BotClient.on('messageCreate', async (message) => {

    leveler.handleLevel(message, 500).then(async (lvl) => {
        if (lvl) {
            leveler.setLevelUpMessage('{user} reached level {level}!')
            await leveler.levelUp(lvl, message);

            var roles = [
                {
                    level: 12,
                    roleId: '1004211232850575411',
                    sticky: true // Sticky roles are permanent
                },
                {
                    level: 14,
                    roleId: '997355373784727562',
                    sticky: false // Non sticky roles are removed at next role level
                },
            ];

            await leveler.handleRoles(lvl, message, roles);
        }
    });

});

```

### Get a user
```
var userId = '1234567890';
var guildId = '3456789012';

var user = await leveler.getUser(userId, guildId);
```

### View leaderboard
```
var guildId = '3456789012';

var lb = await leveler.leaderboard(guildId); // Fetches top 10

lb = await leveler.leaderboard(guildId, 2); // Fetches next 10
```

### Set level
```
await leveler.setLevel({
    level: 1
    userId: '1234567890',
    guildId: '3456789012'
});
```

### Add XP
```
await leveler.addXp({
    amount: 200
    userId: '1234567890',
    guildId: '3456789012'
});
```

### Subtract XP
```
await leveler.subXp({
    amount: 200
    userId: '1234567890',
    guildId: '3456789012'
});
```

### Delete a guild
```
var guildId = '3456789012';

await leveler.deleteGuild(guildId);
```