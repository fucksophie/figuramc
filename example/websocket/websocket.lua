function pings.startWs(uri) end -- these do nothing
function pings.sendWs(data) end -- these do nothing

function pings.wsEvent(event, data) 
    if not player:isLoaded() then return end
    if event == "open" then 
        log("[WS] Websocket opened!")
        pings.sendWs("Hello World")
    end
    if event == "data" then 
        log("[WS] Data: ".. data)
    end
end

mainPage:newAction()
    :title("WEBSOCKET")
    :item("minecraft:poppy")
    :onLeftClick(function()
        pings.startWs("wss://ws.postman-echo.com/raw")
    end)

