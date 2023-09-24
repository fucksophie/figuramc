import { uuidStrToSigBits } from "../packets.js";
import { writeArgs } from "./writeArgs.js";

const magic = {
    TOKEN: 0,
    PING: 1,
    SUB: 2, // owo
    UNSUB: 3
}

export function auth(token) {
    const u8 = new Int8Array(1+token.length)
    u8[0] = magic.TOKEN;

    const ttk = new TextEncoder().encode(token);
    for(let x = 0; x < ttk.length; x++) {
        u8[1+x]=ttk[x];
    }

    return u8;
}
export function sub(uuid) {
    const u8 = new Int8Array(1+8+8)
    const view = new DataView(u8.buffer);
    u8[0] = magic.SUB;

    const parsed = uuidStrToSigBits(uuid)

    view.setBigInt64(1, parsed.msb)
    view.setBigInt64(9, parsed.lsb);
    
    return u8;
}

export function unsub(uuid) {
    const u8 = new Int8Array(1+8+8)
    const view = new DataView(u8.buffer);
    u8[0] = magic.UNSUB;

    const parsed = uuidStrToSigBits(uuid)

    view.setBigInt64(1, parsed.msb)
    view.setBigInt64(9, parsed.lsb);
    
    return u8;
}

export function ping(sync, id, args) {
    const encoded = writeArgs(args);
    const u8 = new Int8Array(1+4+1+encoded.length)
    const view = new DataView(u8.buffer);
    let current = 0;

    u8[current] = magic.PING;
    current+=1;
    
    view.setUint32(current, id)
    current+=4
    view.setInt8(current, sync?1:0)
    current+=1;
    for(let i = 0; i<encoded.length;i++) {
        u8[current+i]=encoded[i]
    }
    return u8;
}