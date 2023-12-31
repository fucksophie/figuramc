import * as prismarineNbt from "prismarine-nbt"
import * as luaparse from "luaparse"

export const host = "figura.moonlight-devs.org"

function int32touint32(int32) { // TODO: This is slow and kind of disgusting.
    let a = new ArrayBuffer(4)
    let dv = new DataView(a);
    dv.setUint32(0, int32)
    let nr = dv.getUint32(0)
    a = null
    return nr;
}

function hashCode(str) {
    return Array.from(str)
        .reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)
}

const avatars = new Map() 
const users = new Map()

const backendAddress = "https://"+host+"/api"

const getUri = (url) => {
    return backendAddress + "/" + url
}

export const getServerId = async (username) => {
    const req = await fetch(getUri("auth/id?username="+username))
    return await req.text();
}

export const getIntermediaryToken = async (serverId) => {
    const req = await fetch(getUri("auth/verify?id="+serverId))
    return await req.text()
}

function httpApiRequest(url, token) {
    return fetch(getUri(url), {
        headers: {
            "user-agent": "Figura/4.5",
            token
        }
    })
}
export const getLimits = async (token) => {
    return await (await httpApiRequest("limits", token)).json();
}

export const getVersion = async (token) => {
    return await (await httpApiRequest("version", token)).json();
}

export const getMotd = async (token) => {
    return await (await httpApiRequest("motd", token)).text();
}

export const getCachedUser = async (token, uuid) => {
    if(users.get(uuid)) return users.get(uuid);
    const user = await getUser(token, uuid)
    users.set(uuid, user);
    return user;
}

export const clearCaches = async (uuid, id) => {
    avatars.delete(uuid+"-"+id);
    users.delete(uuid);
}

export const getCachedAvatar = async (token, uuid, id) => {
    if(avatars.get(uuid+"-"+id)) return avatars.get(uuid+"-"+id);
    const rawAvatar = await getAvatar(token, uuid, id)
    let nbs;
    try {
        nbs = await prismarineNbt.parse(new Uint8Array(rawAvatar));
    } catch {
        avatars.set(uuid+"-"+id, {})
        return {}
    }
    const avatar = {
        pings: {},
        metadata: {
            authors: nbs.parsed.value.metadata.value?.authors?.value,
            color: nbs.parsed.value.metadata.value?.color?.value,
            name: nbs.parsed.value.metadata.value?.name?.value,
            ver: nbs.parsed.value.metadata.value?.ver?.value,
        }
    }

    Object.values(nbs.parsed.value.scripts.value).forEach(z => {
        const script = new TextDecoder().decode(new Uint8Array(z.value))
        const parsed = luaparse.parse(script);

        parsed.body.filter(z => z.type == "FunctionDeclaration").forEach(z => {
            if(!z.identifier.base) return;
            if(!z.identifier.identifier) return;
            if(z.identifier.base.name == "pings") {
                // figura magic mandates that
                // - hashCode the identifier pings.*identifier*
                // - add 1 to this, and times it by 31
                // - stuff it into a uint32
                // - obviously, int32 = uint32, but without this convertion
                //  equals signs don't work
                
                avatar.pings[int32touint32((hashCode(z.identifier.identifier.name)+1)*31)] = z.identifier.identifier.name;
            }
        })
    })
    
    avatars.set(uuid+"-"+id, avatar);
    
    return avatar;
}

export const getUser = async (token, uuid) => {
    return await (await httpApiRequest(uuid, token)).json();
}

export const getAvatar = async (token, uuid, id) => {
    return await (await httpApiRequest(uuid+"/"+id, token)).arrayBuffer();
}

export const checkAuth = async (token) => {
    return (await httpApiRequest("", token)).status == 200;
}
