import { WebSocket } from "ws";
import { websocket, http, authenication } from "../../src/index.js"

/* Tries getting token, authenicating and if authenication fails,
   invalidating cache and trying again.
*/

let [___, token] = await authenication.getToken();

if(!await http.checkAuth(token)) {
    await authenication.invalidateCache();
    let [u, t] = await authenication.getToken();
    uuid = u;
    token = t;
}

let websocketBridge = false;

const ws = new websocket.WebsocketClient("wss://" + http.host + "/ws")

ws.addListener("connect", () => {
    console.log("[WS] WS connnection made")
})

ws.addListener("auth", () => {
    console.log('[WS] WS successfully authenicated!');

    [
        /********* Populate this with UUIDs for the players you wish to communicate with! */
    ].forEach((z,i)=>{
        ws.sub(z);
    })
})

ws.addListener("ping", async (id, uuid, args) => {
    const avatar = await http.getCachedAvatar(token, uuid, "avatar")
    console.log(`[WS] ${uuid}: ${avatar.pings[id]} (${id}) -`, args)
    if(avatar.pings[1316789505] /* startWs */ &&
        avatar.pings[2307212993] /* wsEvent */ && 
        avatar.pings[1979906075] /* sendWs*/) {
        if(id == 1316789505) {
            if(websocketBridge) return;
            websocketBridge = new WebSocket(args[0]);

            websocketBridge.addEventListener("open", () => {
                ws.ping(true, 2307212993, ["open"])
            })
            websocketBridge.addEventListener("close", () => {
                websocketBridge = false
                ws.ping(true, 2307212993, ["close"])
            })
            websocketBridge.addEventListener("error", () => {
                websocketBridge = false
                ws.ping(true, 2307212993, ["close"])
            })
            websocketBridge.addEventListener("message", (data) => {
                ws.ping(true, 2307212993, ["data", data.data])
            })
        }
        if(id == 1979906075) {
            if(!websocketBridge) return;
            websocketBridge.send(args[0])
        }
    }
})

await ws.connect();
