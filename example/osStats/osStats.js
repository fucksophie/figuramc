import { websocket, http, authenication } from "../../src/index.js"

import { totalmem, freemem } from "node:os"

let [___, token] = await authenication.getToken();

if(!await http.checkAuth(token)) {
    await authenication.invalidateCache();
    let [u, t] = await authenication.getToken();
    uuid = u;
    token = t;
}


const ws = new websocket.WebsocketClient("wss://"+http.host+"/ws")

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
    
    setInterval(() => {
        ws.ping(true, 1648479844 /* osStats*/ , [
            {ram: {total: (totalmem()/1e+9).toFixed(3), free: (freemem()/1e+9).toFixed(3)}}])
    }, 5000)
})


await ws.connect();
