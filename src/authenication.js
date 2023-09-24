import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs"

import prismarineAuth from 'prismarine-auth';
import { getIntermediaryToken, getServerId } from "./http.js";

const userIdentifier = 'figura-ws-rev'
const cacheDir = './'
const flow = new prismarineAuth.Authflow(userIdentifier, cacheDir)

const joinServer = async (accessToken, selectedProfile, serverId) => {
    await fetch("https://sessionserver.mojang.com/session/minecraft/join", {
        body: JSON.stringify({
            accessToken, selectedProfile, serverId
        }),
        headers: {
            "Content-Type": "application/json"
        },
        method: "POST"
    })
}

export async function invalidateCache() {
    unlinkSync("figura-token")
    unlinkSync("figura-uuid")
}

export async function getToken() {
    if(!existsSync("figura-token") || !existsSync("figura-uuid")) {
        console.log("[AUTH] Cache missing or expired, regenerating token.")

        const mcpcProfile = await flow.getMinecraftJavaToken({ fetchProfile: true })
        console.log("[AUTH] Asking Figura for ServerID")
        const serverId = await getServerId(mcpcProfile.profile.name)
        console.log("[AUTH] Telling Yggdrasil we've joined a server")
        await joinServer(mcpcProfile.token, mcpcProfile.profile.id, serverId)
        console.log("[AUTH] Fetching token..")
        let token = await getIntermediaryToken(serverId);
        
        writeFileSync("figura-uuid", mcpcProfile.profile.id)
        writeFileSync("figura-token", token)
        console.log("[AUTH] Auth finished! Authenicating with token", token, "and UUID", mcpcProfile.profile.id, "!");
        return [mcpcProfile.profile.id, token]
    } else {
        return [readFileSync("figura-uuid").toString(), readFileSync("figura-token").toString()]
    }
}