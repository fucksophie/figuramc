# figurajs - nodejs API for Figura
This is a quite sophisticated API for Figura.
Contains a full reversal of the whole WS api including Ping encoding. This system encodes Java Double's, lua tables, ints, and more efficiently.
## Examples
There are two built in examples at
1. example/osStats (run with `npm run osStats`)
This simple app displays your current ram usage as your entity nameplate.
2. example/websocket (run with `npm run websocket`)
This app creates a simple, single user websocket bridge. It's very insecure, do not use it for any secure authenication or whatnot. Otherwise, it works great and latency is not high at all either.

## HTTP docs
### No authenication required

1. TEXT GET /api/auth/id?username=(username)
This returns a ServerID that you have to authenicate with Yggdrasil with.

2. TEXT GET /api/auth/verify?id=(serverId)
Checks if you've authenicated with the serverID sent, and if you have, gives you a token.

### Authenication required
Requires headers
```
headers: {
    "user-agent": "Figura/4.5",
    token: token
}
```

1. GET JSON /api/limits
Gives you your ping ratelimits.
2. GET JSON /api/version
Gets the latest Figura version
3. GET TEXT/JSON /api/motd
Gets MOTD, in Mojang text JSON
4. GET JSON /api/(uuid)
This is a very important endpoint. It gets the user's UserData, which contains information such as your equipped avatar, badges, if you're banned and your rank.
5. GET BINARY/NBT /api/(uuid)/avatar
This returns the NBT data of your avatar. This contains everything, from avatar metadata, to every single script and texture.
6. PUT /api/avatar
This sets your avatar. Send compressed NBT data, equal type as the /api/(uuid)/avatar endpoint.
## WS docs
### server -> client
1. auth (0)
The auth packet lets the client know that the token authenication has been succesful. It contains no additional data.
2. ping (1)
    1. 0x01
    2. 4 bytes (uint32) of the Ping ID. Obtained by using HashCode on the name of the ping, plus 1 and timed by 31. `(string.hashCode()+1)*31`
    3. 1 byte (int8) of the Sync bit. This bit, if set will send the ping to the host too
    4. variable length of the PingArgs. These are documenated elsewhere
3. update (2)
The update packet contains two BigInt's that both are
the most significant and least significant bits of a UUID. Combine them and get the UUID of the user who's avatar was changed.

There are also TOAST, CHAT and NOTICE messages, however they are totally useless for normal operations.

### client -> server
There are four types of C2S packets, and each of them are very useful
1. TOKEN (0x00)
This packet is very important. You send it instantly once you create authenication with Figura. It starts with 0x00 and then you have utf8 (textencoder) encoded token.
2. PING (0x01)
    1. 0x01
    2. 4 bytes (uint32) of the Ping ID. Obtained by using HashCode on the name of the ping, plus 1 and *31. `(string.hashCode()+1)*31`
    3. 1 byte (int8) of the Sync bit. This bit, if set will send the ping to the host too
    4. PingArgs. Explained below
3. SUB (0x02)
The SUB (subcription) packet is the basis of ping communcation. To see a person's pings you have to first subscribe to them. For them to see your pings, they have to subscribe to you.
    1. 0x02
    2. 8 bytes of the MSB of the user's UUID
    3. 8 bytes of the LSB of the user's UUID
4. UNSUB (0x03)
Unsubcribes from a user.
    1. 0x03
    2. 8 bytes of the MSB of the user's UUID
    3. 8 bytes of the LSB of the user's UUID

## PingArgs encoding
PingArgs encoding is quite complicated, and is also quite out of scope for a full explanation here. In short -
Ping arguments are encoded as such
1. Numbers
Numbers in pings are quite complicated.
1.1 For numbers that can fit in a singular byte (`Math.pow(-2,7)-1 <= z && z <= Math.pow(2,7)-1`), a singular byte is used
1.2 For numbers that can't fit in a singular byte, a short (2 bytes, i16) is used. (`Math.pow(-2,15)-1 <= z && z <= Math.pow(2,15)-1`)
1.3 For numbers that can't fit in a short, 3 bytes (2 bytes (i16), and 1 byte (i8)) are used. (`-0x800000 <= z && z < 0x800000`)
1.4 For numbers that can't fit in a short, a signed 32 bit integer is used (i32).
1.5 For numbers that can't fit in a signed 32bit integer, a BigInt (double) is used.
2. Booleans
Booleans are the simplest but also the weirdes to implement. They technically do not have any data, only their type. Types are explained later.
3. Strings
Strings are a short (u16) for size, and then the string. String is encoded in utf-8 (TextEncoder).

I am skipping Vectors, Tables and Matrixes, because they're really hard to explain. Check `src/websocket/packets/readArgs` and `writeArgs` for more information.

Args are encoded as such
```
----------------------
 | type | data here |
----------------------
```
Some packets, such as booleans only have their types set.

A fully encoded ping might look as such -
```
--------------------------------------------
 | type | data here | type | data here |
--------------------------------------------
```
## Figura Authenication
1. You authenicate with Mojang's authenication platform (further known as Yggdrasil), grab your UUID and your AccessToken (used to authenicate with MC), and your username
1.1 Can be done with prismarine-auth's getMinecraftJavaToken
2. You now hit `https://figura.moonlight-devs.org/api/auth/id?username=${partOneUsername}`, taking the serverId you will be joining the server with
3. Now you can join a server, in game the mod catches when you're joining a server and inserts the correct serverId ^^, in code we can just send a request to `https://sessionserver.mojang.com/session/minecraft/join`, containing our UUID (selectedProfile) (1.) , accessToken (1.) and serverId (2.). Post request, JSON + Content-Type: application/json
4. Now you can get the token you're going to authenicate with,  `https://figura.moonlight-devs.org/api/auth/verify?id=${partTwoId}`, using the server ID from (2.)
5. Enjoy a fully usable token! You can now hit API's such as `https://figura.moonlight-devs.org/api/limits` and more, including the `token: myC__oolToken` header, and `"user-agent": "Figura/4.5"`

### WS authenication:
1. Finish above authenication
2. Connect to `"wss://figura.moonlight-devs.org/ws"`
3. When the socket is open, send a binary message that has it's first byte set to `0x00`, indicating it's a TOKEN packet, then you have to add UTF-8 encoded string to the end of this, that includes your token. Can be done with `new TextEncoder()` in JS
4. If you recieve a packet that starts with `0x00` (AUTH packet), from the server, it means you've authenicated succesfully!
