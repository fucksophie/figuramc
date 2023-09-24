import { uuidSigBitsToStr } from "../packets.js";
import { parseArgs } from "./readArgs.js";

export async function auth(dv, data, ws) {
}


export async function ping(dv, data, ws) {
    let curr = 1

    let uuid = "";
    let id = 0;
    let args = [];

    {
        let msb = dv.getBigInt64(curr)
        curr+=8;
        let lsb = dv.getBigInt64(curr);
        curr+=8;
        uuid = uuidSigBitsToStr(msb, lsb);
    }    
    {
        id = dv.getUint32(curr)
        curr+=4
    }
    curr+=1; // this is the sync bit
    {
        const rawData = new Int8Array(data.subarray(curr, data.length));
        args = parseArgs(rawData);
    }

    return {
        id, uuid, args
    }
}