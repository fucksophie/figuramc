import EventEmitter from "events"
import { WebSocket } from "ws";
import * as c2s from "./packets/c2s.js"
import * as s2c from "./packets/s2c.js"

import { getToken, invalidateCache } from "../authenication.js";
import { clearCaches, hashFiguraString } from "../http.js";
import { uuidSigBitsToStr } from "./packets.js";

export class WebsocketClient extends EventEmitter {
    /**
    * @type {WebSocket}
    */
    #ws;

    #subs = []

    constructor(uri) {
        super();
        this.uri = uri;
    }

    sub(uuid) {
        if(this.#subs.includes(uuid)) return;
        this.#subs.push(uuid);
        this.#ws.send(c2s.sub(uuid));
    }

    unsub(uuid) {
        if(!this.#subs.includes(uuid)) return;
        this.#subs = this.#subs.filter(z => z != uuid);
        this.#ws.send(c2s.unsub(uuid));
    }

    connect() {
        this.#ws = new WebSocket(this.uri);

        this.attach();
    }
    ping(sync, id, args) {
        this.#ws.send(c2s.ping(sync, hashFiguraString(id), args))
    }
    attach() {
        this.#ws.addEventListener("open", async () => {
            this.emit("connect")
            const [__, token] = await getToken();
            this.#ws.send(c2s.auth(token))

        })

        this.#ws.addEventListener("message", async (e) => {
            const data = new Int8Array(e.data);
            const dv = new DataView(data.buffer);

            if(data[0] == 0) {
                this.emit("auth");
                s2c.auth(dv, data, this.#ws);
            }
            if(data[0] == 1) {
                const {id, uuid, args} = await s2c.ping(dv, data, this.#ws);
                this.emit("ping", id, uuid, args)
            }
            if(data[0] == 2) {
                let msb = dv.getBigInt64(1)
                let lsb = dv.getBigInt64(9)
                const uuid = uuidSigBitsToStr(msb, lsb);
                this.emit("update", uuid)
                clearCaches(uuid, "avatar");
            }
        })

        this.#ws.addEventListener("close", async (b) => {
            if(b.code == 4000) {
                this.emit("reauth")
                await invalidateCache();
                await this.connect();
            } else {
                this.emit("error", b.code)
            }
        })
    }
}
