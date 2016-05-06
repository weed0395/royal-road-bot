const users = require("./data/users.json");
const items = require("./data/items.json");
const races = require("./data/races.json");
const mobs = require("./data/mobs.json");
const adventures = require("./data/adventures.json");
const locations = require("./data/locations.json");
const fs = require("fs");
const Discord = require("discord.js");
const mybot = new Discord.Client();

try { 
	const auth = require("../auth.json");
} catch (e) { 
	console.log("Create an auth.json like auth.json.example.\n"+e.stack);
	process.exit();
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function refHPMP(user) {

    var timeDiff = Math.floor(Date.now() / 1000) - users[user].tstamp;
    var HPgain = users[user].HPregain * timeDiff * users[user].maxhp / 100;

    // console.dir("timeDiff " + timeDiff + " HPgain " + HPgain);

    var MPgain = users[user].MPregain * timeDiff * users[user].maxmp / 100;

    if ((users[user].hp + HPgain) > users[user].maxhp)
        users[user].hp = users[user].maxhp;
    else
        users[user].hp += HPgain;

    if ((users[user].mp + MPgain) > users[user].maxmp)
        users[user].mp = users[user].maxmp;
    else
        users[user].mp += MPgain;

    users[user].tstamp = Math.floor(Date.now() / 1000);
    saveUsers();
}

function saveUsers() {
    fs.writeFile("./data/users.json", JSON.stringify(users, null, 4), 'utf8',
        function(err) {
            if (err) {
                console.dir(err);
            }
        });
}

function saveAdventures() {
    fs.writeFile("./data/adventures.json", JSON.stringify(adventures, null, 4), 'utf8',
        function(err) {
            if (err) {
                console.dir(err);
            }
        });
}

function getLevelUp(level) {
    var base = 30;
    return Math.floor(level * Math.sqrt(level) * base);
}

function missRate(level) {
    var base = 3;
    return (level * Math.sqrt(level) * base);
}

function missRateUpper(level) {
    return (level * Math.sqrt(level) * 10) + 101;
}

function getStats(user) {

    var stats = "";
    var msg = "";
    msg += "+ Name: " + toTitleCase(users[user].name);
    msg += "\n+ Race: " + toTitleCase(users[user].race);
    refHPMP(user);
    msg += "\n+ Heatlh: " + Math.floor(users[user].hp) + "/" + users[user].maxhp + "HP";
    msg += "\n+ Mana: " + Math.floor(users[user].mp) + "/" + users[user].maxmp + "MP";
    msg += "\n+ Level: " + users[user].level + " (" + users[user].xp + "/" + getLevelUp(users[user].level) + "XP)";

    msg += "\n+ Items: ";
    var keys = Object.keys(users[user].items);
    for (i = 0; i < keys.length - 1; i++)
        msg += users[user].items[keys[i]].quantity + " x " + users[user].items[keys[i]].name + ", ";
    msg += users[user].items[keys[i]].quantity + " x " + users[user].items[keys[i]].name + "";

    msg += "\n+ Equpied: ";
    if (users[user].equip.length !== 0) {
        for (i = 0; i < users[user].equip.length - 1; i++)
            msg += items[users[user].equip[i]].name + ", ";
        msg += items[users[user].equip[i]].name + "";
    } else {
        msg += "None.";
    }

    msg += "\n+ Money: " + users[user].gold + " Golds, " + users[user].silver + " Silver, " + users[user].copper + " Copper";
    msg += "\n+ Killed: " + users[user].kills + " enemies ";
    msg += " & Slain: " + users[user].deaths + " times";
    stats += "\n+ Attack: " + users[user].stats.attack;
    stats += ", Defense: " + users[user].stats.defense + "\n+ ";

    var statskey = Object.keys(users[user].stats);
    for (j = 0; j < 4; j++)
        stats += statskey[j] + ": " + users[user].stats[statskey[j]] + ", ";
    stats += statskey[j] + ": " + users[user].stats[statskey[j]];

    stats += "\n+ Luck: " + users[user].stats.luck;
    stats += ", Charisma: " + users[user].stats.charisma;
    stats += ", Leadership: " + users[user].stats.leadership;
    stats += "\n+ Fame: " + users[user].stats.fame;
    stats += ", Infamy: " + users[user].stats.infamy;

    return msg + stats;
}

function unequip(user) {

    if (users[user].equip.length === 0)
        return;

    var itemID = users[user].equip.pop();
    var item = items[itemID];

    if (item.stats.length > 1) {
        var statskey = Object.keys(item.stats);
        for (var i = 0; i < statskey.length; i++)
            if (statskey !== "stats")
                users[user][statskey[i]] -= item.stats[statskey[i]];
    }

    if (item.stats.hasOwnProperty("stats")) {
        var statskey = Object.keys(item.stats.stats);
        for (var i = 0; i < statskey.length; i++)
            users[user].stats[statskey[i]] -= item.stats.stats[statskey[i]];
    }
    saveUsers();
    return;
}


function equip(user) {
    var itemID = users[user].equip.pop();
    var item = items[itemID];
    var statskey = Object.keys(item.stats);
    for (var i = 0; i < statskey.length; i++) {
        users[user].stats[statskey[i]] += item.stats[statskey[i]];
    }
}

function restrictions(user, i) {
    var itmzRes = items[i].restrictions;
    var usr = users[user];

    if (usr.level < itmzRes.level)
        return true;

    if (itmzRes.hasOwnProperty("stats")) {
        var itmzSats = Object.keys(itmzRes.stats);
        for (var i = 0; i < itmzSats.length; i++)
            if (usr.stats[itmzSats[i]] < itmzRes.stats[itmzSats[i]])
                return true;
    }
    return false;
}

mybot.on("message", function(message) {

    var mcontent = message.content.toUpperCase();

    if (!mcontent.startsWith("!")) return;

    if (mcontent === "!PING") {
        mybot.reply(message, "pong");
    }

    if (mcontent === "!RACES") {

        var keys = Object.keys(races);

        var race = "```diff\n!======= [Races] =======!\n";
        for (var i = 0; i < keys.length; i++)
            race += "+ " + toTitleCase(races[keys[i]].name) + "\n";

        var msg = race + "```\n";
        msg += "Type `!JOIN [race name] [your name]` to join Royal Road.\n\n";
        msg += "Type `!RACE [race name]` to know more about a Race";

        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent.startsWith("!RACE ")) {

        var agrs = mcontent.split(" ");

        var search = agrs[1];
        var stats = "";
        var msg = "";
        var raceFlag = 0;

        var keys = Object.keys(races);
        for (var i = 0; i < keys.length; i++)
            if (races[keys[i]].name.toLowerCase() === search.toLowerCase()) {
                raceFlag = 1;

                msg = "```\n" + toTitleCase(races[keys[i]].name) + ":\n\n";

                msg += races[keys[i]].desc + "\n\n";
                msg += "Characteristics: " + races[keys[i]].characteristic + "\n\n";
                stats = "Stats: ";
                var statskey = Object.keys(races[keys[i]].stats);
                for (j = 0; j < statskey.length - 1; j++) {
                    stats += statskey[j] + ": " + races[keys[i]].stats[statskey[j]] + ", ";
                }
                stats += statskey[j] + ": " + races[keys[i]].stats[statskey[j]] + "\n";
                break;
            }
        if (raceFlag === 0)
            msg = "Race not Found! Please try again.";
        var fmsg = msg + stats + "```";

        mybot.sendMessage(message.channel, fmsg);
    }
    if (mcontent === "!STATS") {
        userNotFound(message.author.id, message);
        var user = message.author.id;
        var head = "!============== [" + toTitleCase(users[user].name) + "'s stats] ==============!"
        var msg = "```diff\n" + head + "\n";

        var tail = "";
        for (i = 0; i < head.length - 2; i++) {
            tail += "=";
        }

        var fmsg = msg + getStats(user) + "\n!" + tail + "!```";

        mybot.sendMessage(message.channel, fmsg);
    }

    if (mcontent.startsWith("!JOIN ")) {

        var user = message.author.id;
        if (false) {
            var msg = "User " + user + " has already joined Royal Road";
            mybot.sendMessage(message.channel, msg);
        } else {

            var agrs = mcontent.split(" ");

            if (agrs.length < 3) {
                mybot.sendMessage(message.channel, "Please try again!");
                return;
            }
            var race = agrs[1];
            var name = agrs[2];

            var head = "!======= [Welcome " + toTitleCase(name) + " to Roal Road] =======!";
            var msg = "```diff\n" + head + "\n";

            var search = race;
            var stats = "• Stats: ";
            var usrstats;
            var raceFlag = false;

            var keys = Object.keys(races);
            for (var i = 0; i < keys.length; i++)
                if (races[keys[i]].name.toLowerCase() === search.toLowerCase()) {
                    raceFlag = true;
                    usrstats = races[keys[i]].stats;
                    break;
                }
            if (!raceFlag) {
                mybot.sendMessage(message.channel, "Race: " + race + " Not Found! Please try again!");
                return;
            }

            var user = message.author.id;
            users[user] = {
                "items": {
                    "1": {
                        "name": "Health Potion",
                        "quantity": 2
                    },
                    "2": {
                        "name": "Barley Bread",
                        "quantity": 10
                    },
                    "3": {
                        "name": "Wooden Sword",
                        "quantity": 1
                    }
                },
                "equip": [
                    "3"
                ],
                "race": toTitleCase(race),
                "hp": usrstats.health,
                "maxhp": usrstats.health,
                "mp": usrstats.mana,
                "maxmp": usrstats.mana,
                "level": 1,
                "xp": 0,
                "copper": 10,
                "silver": 0,
                "gold": 0,
                "kills": 0,
                "deaths": 0,
                "weapon": "2",
                "stats": {
                    "STR": usrstats.STR,
                    "VIT": usrstats.VIT,
                    "AGI": usrstats.AGI,
                    "INT": usrstats.INT,
                    "WIS": usrstats.WIS,
                    "luck": usrstats.luck,
                    "attack": usrstats.attack,
                    "defense": usrstats.defense,
                    "fame": 0,
                    "infamy": 0,
                    "charisma": 0,
                    "leadership": 0
                },
                "HPregain": 0.033,
                "MPregain": 0.033,
                "area": "training center",
                "tstamp": Math.floor(Date.now() / 1000),
                "pvp": false,
                "name": toTitleCase(name),
                "guild": ""
            };
            saveUsers();

            var tail = "";
            for (i = 0; i < head.length - 2; i++) {
                tail += "=";
            }

            var fmsg = msg + getStats(user) + "\n!" + tail + "!```";

            mybot.sendMessage(message.channel, fmsg);
        }
    }
    if (mcontent === "!INVENTORY") {
        if (userNotFound(message.author.id, message))
            return;
        var user = message.author.id;
        var head = "!============== [" + toTitleCase(users[user].name) + "'s Inventory] ==============!"
        var msg = "```diff\n" + head + "\n";

        var msgItem = "";
        var keys = Object.keys(users[user].items);
        for (i = 0; i < keys.length; i++)
            msgItem += "+ " + users[user].items[keys[i]].name + " x " + users[user].items[keys[i]].quantity + "\n";

        var tail = "";
        for (i = 0; i < head.length - 2; i++) {
            tail += "=";
        }

        var fmsg = msg + msgItem + "!" + tail + "!```";
        fmsg += "\nType `!INSPECT [item name]` to inspect."

        mybot.sendMessage(message.channel, fmsg);
    }

    if (mcontent === "!ITEMS") {
        var msg = "```diff\n!Items\n";
        var keys = Object.keys(items);
        var itmz = [];
        for (var i = 0; i < keys.length; i++)
            if (items[keys[i]].hasOwnProperty("buyable"))
                msg += "- " + items[keys[i]].name + " - " + items[keys[i]].copper + " Copper.\n";
        msg += "```\n";
        msg += "Type `!INSPECT [item name]` to inspect. ";
        msg += "Type `!buy [item name] `to buy item.";
        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent.startsWith("!INSPECT ")) {

        var search = mcontent.substring(9);
        var msg = "";
        var itemFlag = false;
        var keys = Object.keys(items);
        for (var i = 0; i < keys.length; i++) {
            if (items[keys[i]].name.toLowerCase() === search.toLowerCase()) {
                itemFlag = true;
                msg = "```\n" + toTitleCase(items[keys[i]].name) + ":\n";

                msg += "\nDurability: " + items[keys[i]].durability[0] + "/" + items[keys[i]].durability[1] + "    ";
                if (items[keys[i]].hasOwnProperty("damage"))
                    msg += "Damage: " + items[keys[i]].damage.min + "-" + items[keys[i]].damage.max;
                if (items[keys[i]].hasOwnProperty("defense"))
                    msg += "Defense: " + items[keys[i]].defense;

                if (items[keys[i]].hasOwnProperty("buyable")) {
                    var cost = "";
                    if (items[keys[i]].hasOwnProperty("gold"))
                        cost += items[keys[i]].gold + " Gold ";

                    if (items[keys[i]].hasOwnProperty("silver"))
                        cost += items[keys[i]].silver + " Silver ";

                    if (items[keys[i]].hasOwnProperty("copper"))
                        cost += items[keys[i]].copper + " Copper ";

                    msg += "\n\nCost: " + cost;
                }


                msg += "\n\n" + items[keys[i]].desc + "\n";

                msg += "\nRestrictions: \n";
                if (items[keys[i]].restrictions.hasOwnProperty("none"))
                    msg += "None.\n";
                if (items[keys[i]].restrictions.level !== -1)
                    msg += "Level " + items[keys[i]].restrictions.level + "+\n";

                if (items[keys[i]].restrictions.hasOwnProperty("stats")) {
                    var keyResStats = Object.keys(items[keys[i]].restrictions.stats);
                    for (var j = 0; j < keyResStats.length; j++)
                        msg += keyResStats[j] + " " + items[keys[i]]["restrictions"]["stats"][keyResStats[j]] + "+\n";
                }

                msg += "\nEffects:\n";
                for (var j = 0; j < items[keys[i]].effects.length; j++)
                    msg += items[keys[i]].effects[j] + "\n";
                msg += "\n```";
                break;
            }
        }

        if (!itemFlag)
            msg = "Item not found!";

        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent.startsWith("!BUY ")) {
        if (userNotFound(message.author.id, message))
            return;
        var user = message.author.id;
        var search = mcontent.substring(5);
        var msg = "";
        var itemFlag = false;
        var keys = Object.keys(items);
        for (var i = 0; i < keys.length; i++) {
            if (items[keys[i]].name.toLowerCase() === search.toLowerCase()) {
                itemFlag = true;

                if (!items[keys[i]].hasOwnProperty("buyable")) {
                    msg = "Item not available for sale!";
                    break;
                }

                var cost = "";
                if (items[keys[i]].hasOwnProperty("gold") && users[user].gold >= items[keys[i]].gold) {
                    cost += items[keys[i]].gold + " Gold ";
                    users[user].gold -= items[keys[i]].gold;
                } else if (users[user].gold <= items[keys[i]].gold) {
                    msg = "Insuffcient funds!!";
                    break;
                }
                if (items[keys[i]].hasOwnProperty("silver") && users[user].silver >= items[keys[i]].silver) {
                    cost += items[keys[i]].silver + " Silver ";
                    users[user].silver -= items[keys[i]].silver;
                } else if (users[user].silver <= items[keys[i]].silver) {
                    msg = "Insuffcient funds!!";
                    break;
                }
                if (items[keys[i]].hasOwnProperty("copper") && users[user].copper >= items[keys[i]].copper) {
                    cost += items[keys[i]].copper + " Copper ";
                    users[user].copper -= items[keys[i]].copper;
                } else if (users[user].copper <= items[keys[i]].copper) {
                    msg = "Insuffcient funds!!";
                    break;
                }
                if (users[user].items.hasOwnProperty(keys[i]))
                    users[user].items[keys[i]].quantity++;
                else {
                    var bought = {
                        "name": items[keys[i]].name,
                        "quantity": 1
                    };
                    users[user].items[keys[i]] = bought;
                    saveUsers();
                }
                msg = toTitleCase(users[user].name) + " bought " + toTitleCase(items[keys[i]].name) + " for " + cost + ".";
                break;
            }
        }

        if (!itemFlag)
            msg = "Item not found!";

        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent.startsWith("!UNEQUIP ")) {
        if (userNotFound(message.author.id, message))
            return;
        var user = message.author.id;
        var search = mcontent.substring(9);
        var msg = "";
        var keys = Object.keys(users[user].items);
        for (i = 0; i < keys.length; i++)
            if (users[user].items[keys[i]].name.toLowerCase() === search.toLowerCase()) {
                itemFlag = true;
                unequip(user);
                msg = "Unequiped: " + toTitleCase(search);
            }

        if (!itemFlag)
            msg = "Item not found!";

        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent.startsWith("!USE ")) {
        if (userNotFound(message.author.id, message))
            return;
        var user = message.author.id;
        var search = mcontent.substring(5);
        var itemFlag = false;
        var msg = "";
        var keys = Object.keys(users[user].items);
        for (i = 0; i < keys.length; i++) {
            // console.dir("users[user].items[keys[i]].name.toLowerCase() " + users[user].items[keys[i]].name.toLowerCase() + " search.toLowerCase() " + search.toLowerCase());
            if (users[user].items[keys[i]].name.toLowerCase() === search.toLowerCase()) {
                itemFlag = true;

                if (items[keys[i]].type.toLowerCase() === "potion" || items[keys[i]].type.toLowerCase() === "food") {
                    users[user].items[keys[i]].quantity--;
                    if (users[user].items[keys[i]].quantity === 0)
                        delete users[user].items[keys[i]];
                    if (items[keys[i]].type.toLowerCase() === "potion")
                        msg = users[user].name + " drank " + items[keys[i]].name;
                    else
                        msg = users[user].name + " ate " + items[keys[i]].name;
                }
                // console.dir("items[keys[i]].type.toLowerCase() " + items[keys[i]].type.toLowerCase());

                if (items[keys[i]].type.toLowerCase() === "weapon") {
                    var flag = restrictions(user, keys[i]);
                    // console.dir("flag " + flag);
                    if (flag) {
                        msg = "*Cannot equip " + toTitleCase(search) + ". Requirements not meet!*"
                        break;
                    }
                    unequip(user);
                    users[user].equip.push(keys[i]);
                    msg = users[user].name + " equiped " + items[keys[i]].name;
                }

                if (items[keys[i]].stats.hasOwnProperty("hp")) {
                    users[user].hp += items[keys[i]].stats.hp;
                    if (users[user].hp > users[user].maxhp)
                        users[user].hp = users[user].maxhp;
                }

                if (items[keys[i]].stats.hasOwnProperty("stats")) {

                    var statkeys = Object.keys(items[keys[i]].stats.stats);
                    for (var j = 0; j < statkeys.length; j++)
                        users[user].stats[statkeys[j]] += items[keys[i]].stats.stats[statkeys[j]];
                }
            }
        }

        if (!itemFlag)
            msg = "Item not found!";

        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent === "!MONSTERS") {
        var msg = "```diff\n!Monsters\n";
        var mobFlag = false;
        var keys = Object.keys(mobs);
        var monsters = [];
        for (var i = 0; i < keys.length; i++)
            msg += "- " + toTitleCase(mobs[keys[i]].name) + " level-" + mobs[keys[i]].level + ".\n";
        msg += "```\n";
        msg += "Type `!FIGHT [monster name]` to fight that monster ";
        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent.startsWith("!FIGHT ")) {
        if (userNotFound(message.author.id, message))
            return;

        var user = message.author.id;
        var monster = mcontent.trim().substr(7).toLowerCase();
        var keys = Object.keys(mobs);
        var monsters = [];
        for (var i = 0; i < keys.length; i++)
            if (mobs[keys[i]].name.toLowerCase() === monster) {
                mobFlag = true;
                adventures[user] = mobs[keys[i]];
                saveAdventures();
                refHPMP(user);
                var head = "!============== [" + toTitleCase(users[user].name) + "'s Adventure] ==============!"
                var msg = "```diff\n" + head + "";
                msg += "\n+ Heatlh: " + Math.floor(users[user].hp) + "/" + users[user].maxhp + "HP";
                msg += " Mana: " + Math.floor(users[user].mp) + "/" + users[user].maxmp + "MP";
                msg += "\n+ " + toTitleCase(monster) + ": " + (Math.floor(adventures[user].stats.hp) / adventures[user].stats.maxhp * 100) + "% HP";
                var tail = "";
                for (i = 0; i < head.length - 2; i++) {
                    tail += "=";
                }
                msg += "\n!" + tail + "!```";
                msg += "\nType `!COMBAT` to combat commands info.";

            }

        if (!mobFlag)
            msg = "Monster not found!";

        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent === "!COMBAT") {
        if (userNotFound(message.author.id, message))
            return;
        var msg = "";
        msg += "```diff\n";
        msg += "!============== [Combat Commands] ==============!\n";
        msg += "+ Type !COMBO Attack + Attack + Attack to attack.";
        msg += "\n-  Example: !combo slash+slash+stab";
        msg += "\n+ Attacks: Slash, Stab, Slice, Penetrate";
        msg += "\n+ Others: Dash, Dodge, Block, Grasp."
        msg += "\n-  Example: !combo Dash+Slash+Grasp+Penetrate";
        msg += "\n!===============================================!```"
        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent === "!INFO") {
        var msg = "";
        msg += "```diff\n";
        msg += "======== [Royal Road Commands] ========\n";
        msg += "\n";
        msg += "+ !JOIN [RACE NAME] [YOUR NAME]\n";
        msg += "-  Join Royal Road\n";
        msg += "+ !RACES\n";
        msg += "-  List Races\n";
        msg += "+ !RACE [RACE NAME]\n";
        msg += "-  Gives more Info on a races\n";
        msg += "+ !STATS\n";
        msg += "-  Shows Stat Window\n";
        msg += "+ !INVENTORY\n";
        msg += "-  Shows Inventory Window\n";
        msg += "+ !INSPECT [ITEM NAME]\n";
        msg += "-  To inspect an item\n";
        msg += "+ !USE [ITEM NAME]\n";
        msg += "-  To use an Item\n";
        msg += "+ !UNEQUIP [ITEM NAME]\n";
        msg += "-  To unequip an Item\n";
        msg += "+ !ITEMS\n";
        msg += "-  Gives list of Items available for purchase\n";
        msg += "+ !BUY [ITEM NAME]\n";
        msg += "-  Buy an item\n";
        msg += "+ !MONSTERS\n";
        msg += "-  List Monsters\n";
        msg += "+ !FIGHT [MONSTER NAME]\n";
        msg += "-  Fight Monster\n";
        msg += "+ !COMABT\n";
        msg += "-  List all combat commands\n";
        msg += "+ !COMBO ATTACK + ATTACK + ATTACK + ATTACK + ATTACK\n";
        msg += "-  Combo attack\n";
        msg += "-  Attacks: Slash, Slice, Stab, Penetrate. Others: Dash, Dodge, Block, Grasp\n";
        msg += "+ !Info\n";
        msg += "-  Info on all commands\n";
        msg += "\n";
        msg += "=======================================\n";
        msg += "\n";
        msg += "```"
        mybot.sendMessage(message.channel, msg);
    }

    if (mcontent.startsWith("!COMBO ")) {
        if (userNotFound(message.author.id, message))
            return;

        if (Object.keys(adventures).indexOf(message.author.id) <= -1) {
            mybot.sendMessage(message.channel, "NO adventure found");
            return;
        }
        var combos = mcontent.trim().substr(7).toLowerCase();
        var user = message.author.id;
        // console.dir("combos: " + combos);
        var combo = combos.split("\+");
        for (var i = 0; i < combo.length; i++)
            combo[i] = combo[i].trim();
        // console.dir("combo: " + combo + " length: " + combo.length);
        var userloose = 0;
        var mobloose = 0;
        var monster = adventures[user].name;

        var head = "!============== [" + toTitleCase(users[user].name) + "'s Adventure] ==============!"
        var msg = "```diff\n" + head + "";


        var usrAtk = users[user].stats.attack;
        var usrDef = users[user].stats.defense;
        var mobAtk = adventures[user].stats.attack;
        var mobDef = adventures[user].stats.defense;
        if (users[user].equip.length > 0) {
            var itemID = users[user].equip[0];
            if (items[itemID].hasOwnProperty("damage")) {
                var minDmg = items[itemID].damage.min;
                var maxDmg = items[itemID].damage.max;
                userAtk = usrAtk + rInt(minDmg, maxDmg);
            }
        }
        var slashMin = 70;
        var slashMax = 101;
        var criMin = 150;
        var criMax = 250;
        var criDmg;
        var slashRan;
        var criticalHit;
        var missHit;
        var totalDamg = 0;
        var totalMobDmg = 0;
        var miss = missRate(adventures[user].level);
        var misUpLimt = missRateUpper(users[user].level);
        // console.dir("misUpLimt: " + misUpLimt);
        // console.dir("miss: " + miss);
        for (var i = 0; i < combo.length; i++) {
            if (Math.floor(adventures[user].stats.hp) <= 0 || Math.floor(users[user].hp) <= 0)
                break;
            missHit = Math.random() * 100;
            // console.dir("missHit: " + missHit);
            criticalHit = Math.random() * 100;
            mobloose = 0;
            if (missHit > 10) {
                if (combo[i] === "slash") {
                    slashRan = rInt(slashMin, slashMax) / 100;
                    // console.dir("slashRan: "+slashRan);
                    // console.dir("usrAtk: "+usrAtk);
                    if (criticalHit > 5) {
                        mobloose = Math.abs(slashRan * usrAtk - mobDef);
                        // console.dir("slashRan * usrAtk - mobDef: "+(slashRan * usrAtk - mobDef));
                    } else {
                        criDmg = rInt(criMin, criMax) / 100;
                        // console.dir("criDmg: "+criDmg);
                        mobloose = Math.abs(slashRan * usrAtk - mobDef) + Math.abs(criDmg * usrAtk - mobDef);
                        msg += "\nCRITICAL HIT!";
                    }
                    adventures[user].stats.hp -= mobloose;
                    saveAdventures();
                    totalDamg += mobloose;
                    msg += "\n+ " + Math.floor(mobloose);
                }
            } else {
                slashRan = rInt(slashMin, slashMax) / 100;
                userloose = Math.abs(slashRan * mobAtk - usrDef);
                totalMobDmg += userloose;
                msg += "\n- Missed You loose " + Math.floor(userloose) + "HP";
                users[user].hp -= userloose;
                saveUsers();
            }
        }
        console.dir("Mob Hp: " + Math.floor(adventures[user].stats.hp));
        msg += "\n+ Total Damage Dealt: " + Math.floor(totalDamg);
        msg += "\n- Total Damage Received: " + Math.floor(totalMobDmg);
        msg += "\n+ Heatlh: " + Math.floor(users[user].hp) + "/" + users[user].maxhp + "HP";
        msg += " Mana: " + Math.floor(users[user].mp) + "/" + users[user].maxmp + "MP";
        if (Math.floor(adventures[user].stats.hp) <= 0) {
            msg += "\n+ " + toTitleCase(monster) + ": 0/" + adventures[user].stats.maxhp + " HP";
            var drop = rInt(0, adventures[user].drops.length - 1);
            var itemdrop = adventures[user].drops[drop];
            var copp = rInt(0, adventures[user].copper + 1);
            msg += "\n!============ [" + users[user].name + " Wins] ============!";
            msg += "\nEXP earned: " + adventures[user].xp + " Item Drop: " + items[itemdrop].name + " Copper coins:" + copp;
            if (users[user].items.hasOwnProperty(itemdrop))
                users[user].items[itemdrop].quantity++;
            else {
                var dropitem = {
                    "name": items[itemdrop].name,
                    "quantity": 1
                };
                users[user].items[itemdrop] = dropitem;
            }
            users[user].xp += adventures[user].xp;
            users[user].copper += copp;
            moneyChk(user);
            var oldlvl = users[user].level;
            XPchk(user);
            for (var i = oldlvl; i < users[user].level; i++)
                msg += "\nYou have leveled UP!";
            delete adventures[user];
        } else {
            msg += "\n+ " + toTitleCase(monster) + ": " + Math.floor(adventures[user].stats.hp) + "/" + adventures[user].stats.maxhp + " HP";
        }
        if (Math.floor(users[user].hp) <= 0) {
            msg += "\n!============ [" + users[user].name + " loss] ============!";

            var copp = rInt(0, Math.floor(adventures[user].copper / 2) + 1);
            msg += "\nEXP Lost: " + (adventures[user].xp / 2) + " Copper coins:" + copp;

            if (copp > users[user].copper)
                users[user].copper = 0;
            else
                users[user].copper -= copp;

            if(adventures[user].xp / 2 > users[user].xp)
                users[user].xp = 0;
            else
                users[user].xp -= adventures[user].xp / 2;

            users[user].hp = users[user].maxhp;
            saveUsers();
            delete adventures[user];
        }

        var tail = "";
        for (i = 0; i < head.length - 2; i++) {
            tail += "=";
        }
        msg += "\n!" + tail + "!```";
        mybot.sendMessage(message.channel, msg);
    }


});

function XPchk(user) {
    var usrXP = users[user].xp;
    var nxtXP = getLevelUp(users[user].level);
    var returnMsg;
    if (usrXP > nxtXP) {
        users[user].level += 1;
        users[user].xp -= nxtXP;
        saveUsers();
        returnMsg = XPchk(user);
    } else
        return true;

    if (returnMsg)
        return;
    return;
}

function moneyChk(user) {
    var usrCopper = users[user].copper;
    if (usrCopper > 99) {
        var silvers = Math.floor(users[user].copper / 100);
        users[user].copper -= silvers * 100;
        users[user].silver += silvers;
    }
    var usrSilver = users[user].silver;
    if (usrSilver > 99) {
        var golds = Math.floor(users[user].silver / 100);
        users[user].silver -= golds * 100;
        users[user].gold += golds;
    }
    saveUsers();

}

function userNotFound(user, message) {
    if (Object.keys(users).indexOf(message.author.id) <= -1) {
        mybot.sendMessage(message.channel, "User not found!! Please Join RR");
        return true;
    }
    return false;
}

function rInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

mybot.loginWithToken(auth.discordToken);

console.dir("Bot running......");

mybot.on("ready", function() {
    console.dir("Ready");
    mybot.setPlayingGame("Type !Races ");
});
