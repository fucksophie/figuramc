import { WebSocket } from "ws";
import { websocket, http, authenication } from "../../src/index.js"

/* Tries getting token, authenicating and if authenication fails,
   invalidating cache and trying again.
*/

let [___, token] = await authenication.getToken();

if(!await http.checkAuth(token)) {
    await authenication.invalidateCache();
    let [___, t] = await authenication.getToken();
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
    if(avatar.pings[hashFiguraString("startWs")] /* startWs */ &&
        avatar.pings[hashFiguraString("wsEvent")] /* wsEvent */ &&
        avatar.pings[hashFiguraString("sendWs")] /* sendWs*/) {
        if(id == hashFiguraString("startWs")) {
            if(websocketBridge) return;
            websocketBridge = new WebSocket(args[0]);

            websocketBridge.addEventListener("open", () => {
                ws.ping(true, "wsEvent", ["open"])
            })
            websocketBridge.addEventListener("close", () => {
                websocketBridge = false
                ws.ping(true, "wsEvent", ["close"])
            })
            websocketBridge.addEventListener("error", () => {
                websocketBridge = false
                ws.ping(true, "wsEvent", ["close"])
            })
            websocketBridge.addEventListener("message", (data) => {
                ws.ping(true, "wsEvent", ["data", data.data])
            })
        }
        if(id == hashFiguraString("sendWs")) {
            if(!websocketBridge) return;
            websocketBridge.send(args[0])
        }
    }
})

await ws.connect();
