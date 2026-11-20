local APP_ID = 'forge-npwd-management'
local PHONE_RESOURCE = 'forge-npwd'

local function phoneCall(method, ...)
    if GetResourceState(PHONE_RESOURCE) ~= 'started' then return false end
    -- Missing exports throw during lookup, so lookup and invocation must be protected.
    return pcall(function(...)
        local phone = exports[PHONE_RESOURCE]
        return phone[method](phone, ...)
    end, ...)
end

local function awaitServerCallback(eventName, ...)
    if pr_lib and pr_lib.callback and type(pr_lib.callback.await) == 'function' then
        local ok, res = pcall(function(...)
            return pr_lib.callback.await(eventName, 8000, ...)
        end, ...)
        if ok and res ~= nil then return res end
    end

    if lib and lib.callback and type(lib.callback.await) == 'function' then
        local ok, res = pcall(function(...)
            return lib.callback.await(eventName, false, ...)
        end, ...)
        if ok and res ~= nil then return res end
    end

    return nil
end

-- Obter dados completos de gestão da organização
RegisterNUICallback('getManagementData', function(data, cb)
    local selectedJob = (type(data) == 'table' and data.job) or nil
    local res = awaitServerCallback('forge-npwd:management:getData', selectedJob)
    if res then
        cb({ status = 'ok', data = res })
    else
        cb({ status = 'error', message = 'Servidor indisponível' })
    end
end)

-- Buscar jogadores próximos para contratação rápida (raio de 15m)
RegisterNUICallback('getNearbyPlayers', function(_, cb)
    local nearbyList = {}
    local myPed = PlayerPedId()
    local myCoords = GetEntityCoords(myPed)
    local activePlayers = GetActivePlayers()
    for _, player in ipairs(activePlayers) do
        local targetPed = GetPlayerPed(player)
        if targetPed and targetPed ~= myPed then
            local targetCoords = GetEntityCoords(targetPed)
            local dist = #(myCoords - targetCoords)
            if dist <= 15.0 then
                nearbyList[#nearbyList + 1] = {
                    id = GetPlayerServerId(player),
                    distance = math.floor(dist * 10) / 10,
                }
            end
        end
    end
    table.sort(nearbyList, function(a, b) return a.distance < b.distance end)

    local res = awaitServerCallback('forge-npwd:management:getNearbyPlayersData', nearbyList)
    if res and res.players then
        cb({ status = 'ok', players = res.players })
    else
        cb({ status = 'ok', players = {} })
    end
end)

-- Contratar novo membro
RegisterNUICallback('hireEmployee', function(data, cb)
    local res = awaitServerCallback('forge-npwd:management:hireEmployee', data)
    if type(res) == 'table' then
        cb(res)
    else
        cb({ status = res and 'ok' or 'error', success = res == true })
    end
end)

-- Demitir membro
RegisterNUICallback('fireEmployee', function(data, cb)
    local res = awaitServerCallback('forge-npwd:management:fireEmployee', data)
    if type(res) == 'table' then
        cb(res)
    else
        cb({ status = res and 'ok' or 'error', success = res == true })
    end
end)

-- Alterar cargo de membro
RegisterNUICallback('setEmployeeGrade', function(data, cb)
    local res = awaitServerCallback('forge-npwd:management:setEmployeeGrade', data)
    if type(res) == 'table' then
        cb(res)
    else
        cb({ status = res and 'ok' or 'error', success = res == true })
    end
end)

-- Avaliar / responder candidatura
RegisterNUICallback('reviewCandidate', function(data, cb)
    local res = awaitServerCallback('forge-npwd:management:reviewCandidate', data)
    if type(res) == 'table' then
        cb(res)
    else
        cb({ status = res and 'ok' or 'error', success = res == true })
    end
end)

-- Configurar permissão de patente / cargo
RegisterNUICallback('setGradePermission', function(data, cb)
    local res = awaitServerCallback('forge-npwd:management:setGradePermission', data)
    if type(res) == 'table' then
        cb(res)
    else
        cb({ status = res and 'ok' or 'error', success = res == true })
    end
end)

-- Configurar permissão individual de membro
RegisterNUICallback('setMemberPermission', function(data, cb)
    local res = awaitServerCallback('forge-npwd:management:setMemberPermission', data)
    if type(res) == 'table' then
        cb(res)
    else
        cb({ status = res and 'ok' or 'error', success = res == true })
    end
end)

-- Redefinir permissões individuais de membro para o padrão do cargo
RegisterNUICallback('resetMemberPermissions', function(data, cb)
    local res = awaitServerCallback('forge-npwd:management:resetMemberPermissions', data)
    if type(res) == 'table' then
        cb(res)
    else
        cb({ status = res and 'ok' or 'error', success = res == true })
    end
end)

-- Fechar o celular
RegisterNUICallback('closePhone', function(_, cb)
    phoneCall('setPhoneVisible', false)
    cb({ status = 'ok' })
end)

-- Envio unificado de atualização para o aplicativo no celular
local function sendRefresh()
    phoneCall('sendForgeNPWDMessage', APP_ID, 'refreshManagement', {})
    SendNUIMessage({
        app = APP_ID,
        method = 'refreshManagement',
        action = 'refreshManagement',
        data = {}
    })
end

-- Sincronização em tempo real quando o cargo/emprego do jogador mudar
RegisterNetEvent('QBCore:Client:OnJobUpdate', function()
    sendRefresh()
end)

RegisterNetEvent('qbx_core:client:onJobUpdate', function()
    sendRefresh()
end)

RegisterNetEvent('QBCore:Client:SetPlayerData', function()
    sendRefresh()
end)

RegisterNetEvent('forge-core:client:jobPoints:refresh', function()
    sendRefresh()
end)

RegisterNetEvent('forge-core:client:multijob:jobChanged', function()
    sendRefresh()
end)

-- Monitor de visibilidade do celular: sincroniza dados sempre que o jogador abrir o celular
CreateThread(function()
    local lastVisible = false
    while true do
        Wait(500)
        local ok, res = phoneCall('isPhoneVisible')
        local isVisible = ok and res == true
        if isVisible and not lastVisible then
            sendRefresh()
        end
        lastVisible = isVisible
    end
end)

exports('refreshManagement', sendRefresh)
