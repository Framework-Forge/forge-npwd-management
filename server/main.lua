local function registerCallback(name, handler)
    if pr_lib and pr_lib.callback and type(pr_lib.callback.register) == 'function' then
        pr_lib.callback.register(name, handler)
    end
    if lib and lib.callback and type(lib.callback.register) == 'function' then
        pcall(function()
            lib.callback.register(name, handler)
        end)
    end
end

local function isPlayerAdmin(source)
    if not source or source == 0 then return false end

    if IsPlayerAceAllowed(source, 'command.admin') or IsPlayerAceAllowed(source, 'admin') or IsPlayerAceAllowed(source, 'group.admin') or IsPlayerAceAllowed(source, 'group.god') then
        return true
    end

    if exports['qbx_core'] and exports['qbx_core'].HasPermission then
        local ok, hasPerm = pcall(function()
            return exports['qbx_core']:HasPermission(source, 'admin') or exports['qbx_core']:HasPermission(source, 'god')
        end)
        if ok and hasPerm then return true end
    end

    return false
end

-- ── GERENCIADOR DE PERMISSÕES (CARGOS E INDIVIDUAL) ──────────────────────────

local function loadPermissionsFile()
    local resName = GetCurrentResourceName()
    local content = LoadResourceFile(resName, 'data/permissions.json')
    if content and content ~= '' then
        local ok, data = pcall(json.decode, content)
        if ok and type(data) == 'table' then
            return data
        end
    end
    return {}
end

local function savePermissionsFile(data)
    local resName = GetCurrentResourceName()
    local encoded = json.encode(data)
    if encoded then
        return SaveResourceFile(resName, 'data/permissions.json', encoded, -1) == 1
    end
    return false
end

local function getJobPermissions(jobName)
    local all = loadPermissionsFile()
    local clean = string.lower(jobName or '')
    if not all[clean] then
        all[clean] = {
            grades = {},
            individuals = {}
        }
    end
    return all[clean]
end

local function getEffectivePermissions(jobName, gradeLevel, citizenid, isBoss)
    local jobPerms = getJobPermissions(jobName)
    local base = {
        p_members = false,
        p_grades = false,
        p_finance = false,
        p_candidates = false,
    }

    if isBoss then
        base.p_members = true
        base.p_grades = true
        base.p_finance = true
        base.p_candidates = true
        return base, false
    end

    -- 1. Permissões padrão do cargo
    local gLevelStr = tostring(tonumber(gradeLevel) or 0)
    if jobPerms.grades and jobPerms.grades[gLevelStr] then
        for k, v in pairs(jobPerms.grades[gLevelStr]) do
            base[k] = v == true
        end
    end

    -- 2. Permissões individuais personalizadas (sobrepõem o cargo)
    local isOverridden = false
    if citizenid and jobPerms.individuals and jobPerms.individuals[citizenid] then
        for k, v in pairs(jobPerms.individuals[citizenid]) do
            base[k] = v == true
            isOverridden = true
        end
    end

    return base, isOverridden
end

-- ── DEFINIÇÕES DE EMPREGOS E BANCO DE DADOS ──────────────────────────────────

local function loadJobsJson()
    local content = LoadResourceFile('forge-core', 'data/jobs.json')
    if content and content ~= '' then
        local ok, data = pcall(json.decode, content)
        if ok and type(data) == 'table' then
            return data
        end
    end
    return nil
end

local function saveJobsJson(data)
    if type(data) ~= 'table' then return false end
    local encoded = json.encode(data)
    if not encoded then return false end
    return SaveResourceFile('forge-core', 'data/jobs.json', encoded, -1) == 1
end

local function getJobDefinition(jobName)
    if not jobName or jobName == '' or jobName == 'none' or jobName == 'unemployed' then
        return nil
    end

    local cleanName = string.lower(jobName)

    -- 1. JobRegistry em execução no ForgeCore
    if ForgeCore and ForgeCore.JobRegistry and type(ForgeCore.JobRegistry.get) == 'function' then
        local ok, group = pcall(ForgeCore.JobRegistry.get, 'job', jobName)
        if ok and group and (group.grades or group.stashes) then
            return group
        end
    end

    -- 2. Export do qbx_core
    if exports['qbx_core'] and exports['qbx_core'].GetJob then
        local ok, jobData = pcall(function() return exports['qbx_core']:GetJob(jobName) end)
        if ok and jobData and type(jobData) == 'table' and jobData.grades then
            local fileData = loadJobsJson()
            local fileJob = fileData and (fileData[jobName] or fileData[cleanName])
            if fileJob and fileJob.stashes and not jobData.stashes then
                jobData.stashes = fileJob.stashes
            end
            return jobData
        end
    end

    -- 3. Leitura direta de forge-core/data/jobs.json
    local allJobs = loadJobsJson()
    if allJobs then
        local job = allJobs[jobName] or allJobs[cleanName]
        if job then return job end
        for k, v in pairs(allJobs) do
            if string.lower(k) == cleanName then
                return v
            end
        end
    end

    -- 4. Fallback em QBShared / QBX
    if QBShared and QBShared.Jobs and QBShared.Jobs[jobName] then
        return QBShared.Jobs[jobName]
    end

    return nil
end

local function dbQuery(sqlQuery, params)
    if pr_lib and pr_lib.database and type(pr_lib.database.query) == 'function' then
        local ok, res = pcall(pr_lib.database.query, sqlQuery, params)
        if ok and type(res) == 'table' then return res end
    end
    if MySQL and MySQL.query and type(MySQL.query.await) == 'function' then
        local ok, res = pcall(MySQL.query.await, sqlQuery, params)
        if ok and type(res) == 'table' then return res end
    end
    if exports['oxmysql'] and exports['oxmysql'].query_async then
        local ok, res = pcall(function() return exports['oxmysql']:query_async(sqlQuery, params) end)
        if ok and type(res) == 'table' then return res end
    end
    return {}
end

local function getInitials(name)
    local initials = ''
    for part in string.gmatch(name or '', '%S+') do
        initials = initials .. string.upper(string.sub(part, 1, 1))
        if string.len(initials) >= 2 then break end
    end
    return initials ~= '' and initials or 'MB'
end

local function getCallerGroup(source, requestedJob)
    local ownerCitizenId = pr_lib.phone and pr_lib.phone.GetActiveOwnerIdentifier
        and pr_lib.phone.GetActiveOwnerIdentifier(source)
        or nil
    if not ownerCitizenId then return nil end

    local holderCitizenId = pr_lib.framework.GetIdentifier(source)
    local ownerPlayer = pr_lib.framework.GetPlayerFromIdentifier(ownerCitizenId)
    if not ownerPlayer and pr_lib.framework.GetOfflinePlayer then
        ownerPlayer = pr_lib.framework.GetOfflinePlayer(ownerCitizenId)
    end
    local playerData = ownerPlayer and (ownerPlayer.PlayerData or ownerPlayer) or nil
    if not playerData then return nil end

    local isAdmin = ownerCitizenId == holderCitizenId and isPlayerAdmin(source)
    local groupType = 'job'
    local groupObj = playerData.job

    -- Se um emprego específico foi solicitado (multijob), verifica posse
    if requestedJob and type(requestedJob) == 'string' and requestedJob ~= '' and requestedJob ~= 'none' then
        local found = false
        if groupObj and string.lower(groupObj.name or '') == string.lower(requestedJob) then
            found = true
        end

        if not found and ownerCitizenId == holderCitizenId and ForgeCore and ForgeCore.MultiJobService and type(ForgeCore.MultiJobService.getPlayerJobs) == 'function' then
            local ok, res = pcall(ForgeCore.MultiJobService.getPlayerJobs, source)
            if ok and res and res.jobs then
                for _, j in ipairs(res.jobs) do
                    if string.lower(j.name) == string.lower(requestedJob) then
                        groupObj = {
                            name = j.name,
                            label = j.label,
                            grade = {
                                level = tonumber(j.grade) or 0,
                                name = j.gradeLabel,
                            }
                        }
                        groupType = 'job'
                        found = true
                        break
                    end
                end
            end
        end

        if not found and ownerCitizenId == holderCitizenId and pr_lib and pr_lib.framework and pr_lib.framework.GetPlayerMetadata then
            local metaJobs = pr_lib.framework.GetPlayerMetadata(source, 'multijob')
            if type(metaJobs) == 'table' then
                for _, j in ipairs(metaJobs) do
                    if string.lower(j.name or '') == string.lower(requestedJob) then
                        groupObj = {
                            name = j.name,
                            label = j.label,
                            grade = j.grade,
                        }
                        groupType = 'job'
                        found = true
                        break
                    end
                end
            end
        end

        if not found and isAdmin then
            groupObj = {
                name = requestedJob,
                label = requestedJob,
                grade = 99,
            }
            groupType = 'job'
        end
    end

    -- Se desempregado, verifica gangue ativa
    if not groupObj or not groupObj.name or groupObj.name == 'unemployed' then
        if playerData.gang and playerData.gang.name and playerData.gang.name ~= 'none' then
            groupType = 'gang'
            groupObj = playerData.gang
        end
    end

    if not groupObj or not groupObj.name or groupObj.name == 'unemployed' or groupObj.name == 'none' then
        if isAdmin then
            return {
                groupType = 'job',
                name = 'admin',
                label = 'Administração Central',
                motto = 'Serviço. Supervisão. Gestão.',
                badge = 'ADM',
                gradeLevel = 99,
                gradeName = 'Administrador Geral',
                isBoss = true,
                canManage = true,
                effectivePerms = { p_members = true, p_grades = true, p_finance = true, p_candidates = true },
                group = nil,
            }
        end
        return nil
    end

    local group = getJobDefinition(groupObj.name)
    local gradeLevel = 0
    if type(groupObj.grade) == 'table' then
        gradeLevel = tonumber(groupObj.grade.level or groupObj.grade.grade or groupObj.grade.value) or 0
    else
        gradeLevel = tonumber(groupObj.grade) or 0
    end

    local gradeData = nil
    if group and group.grades then
        gradeData = group.grades[gradeLevel] or group.grades[tostring(gradeLevel)]
    end

    local isBoss = false
    local isRecruiter = false

    if gradeData then
        if gradeData.isboss == true or gradeData.bankAuth == true then isBoss = true end
        if gradeData.isrecruiter == true then isRecruiter = true end
    end

    if type(groupObj.grade) == 'table' then
        if groupObj.grade.isboss == true or groupObj.grade.bankAuth == true then isBoss = true end
        if groupObj.grade.isrecruiter == true then isRecruiter = true end
    end

    if groupObj.isboss == true then
        isBoss = true
    end

    -- Maior nível cadastrado recebe comando automaticamente
    if not isBoss and group and group.grades then
        local maxLvl = 0
        for lvl in pairs(group.grades) do
            local numLvl = tonumber(lvl) or 0
            if numLvl > maxLvl then maxLvl = numLvl end
        end
        if gradeLevel >= maxLvl and maxLvl > 0 then
            isBoss = true
        end
    end

    -- Obter permissões efetivas do jogador (cargo + overrides individuais)
    local effPerms = getEffectivePermissions(groupObj.name, gradeLevel, playerData.citizenid, isBoss)
    local canManage = isBoss or isRecruiter or effPerms.p_members or effPerms.p_grades or effPerms.p_finance or effPerms.p_candidates

    return {
        groupType = groupType,
        name = groupObj.name,
        label = (group and (group.label or group.title)) or groupObj.label or groupObj.name,
        motto = group and group.motto or 'Disciplina. Proteção. Serviço.',
        badge = group and group.badge or string.upper(string.sub(groupObj.name, 1, 4)),
        gradeLevel = gradeLevel,
        gradeName = (gradeData and gradeData.name) or (type(groupObj.grade) == 'table' and groupObj.grade.name) or ('Nível ' .. gradeLevel),
        citizenid = playerData.citizenid,
        isBoss = isBoss,
        canManage = canManage,
        effectivePerms = effPerms,
        group = group,
    }
end

local function getEmployeeOnline(citizenid)
    if not citizenid then return false, nil end

    if exports['qbx_core'] and exports['qbx_core'].GetPlayerByCitizenId then
        local p = exports['qbx_core']:GetPlayerByCitizenId(citizenid)
        if p and p.PlayerData and p.PlayerData.source then
            return true, p.PlayerData.source
        end
    end

    if pr_lib.framework and pr_lib.framework.GetPlayerFromIdentifier then
        local p = pr_lib.framework.GetPlayerFromIdentifier(citizenid)
        if p and p.PlayerData and p.PlayerData.source then
            return true, p.PlayerData.source
        end
    end

    return false, nil
end

-- Consulta completa de funcionários: ONLINE (memória ativa/multijob) e OFFLINE (banco de dados)
local function fetchJobEmployees(jobName, group)
    local targetJobLower = string.lower(jobName)
    local employeesByCitizenId = {}

    local function getGradeName(lvl)
        local num = tonumber(lvl) or 0
        if group and group.grades then
            local g = group.grades[num] or group.grades[tostring(num)]
            if g and g.name then return g.name end
        end
        return 'Nível ' .. num
    end

    -- 1. Varrer todos os jogadores ONLINE conectados no servidor
    local onlineSources = {}
    if exports['qbx_core'] and exports['qbx_core'].GetQBPlayers then
        local qbPlayers = exports['qbx_core']:GetQBPlayers()
        for s, p in pairs(qbPlayers or {}) do
            local srcNum = p.PlayerData and p.PlayerData.source or tonumber(s)
            if srcNum then
                onlineSources[srcNum] = p.PlayerData or p
            end
        end
    end

    if not next(onlineSources) and pr_lib.framework and pr_lib.framework.GetPlayers then
        local allP = pr_lib.framework.GetPlayers()
        for _, s in ipairs(allP or {}) do
            local p = pr_lib.framework.GetPlayerData(s)
            if p then onlineSources[s] = p end
        end
    end

    if not next(onlineSources) then
        local raw = GetPlayers()
        for _, s in ipairs(raw or {}) do
            local srcNum = tonumber(s)
            if srcNum then
                local p = pr_lib.framework.GetPlayerData(srcNum)
                if p then onlineSources[srcNum] = p end
            end
        end
    end

    for src, pData in pairs(onlineSources) do
        local isMember = false
        local gradeLvl = 0

        -- Verifica emprego ativo atual
        if pData.job and pData.job.name and string.lower(pData.job.name) == targetJobLower then
            isMember = true
            if type(pData.job.grade) == 'table' then
                gradeLvl = tonumber(pData.job.grade.level or pData.job.grade.grade) or 0
            else
                gradeLvl = tonumber(pData.job.grade) or 0
            end
        end

        -- Verifica multijob se não for o ativo
        if not isMember and ForgeCore and ForgeCore.MultiJobService and type(ForgeCore.MultiJobService.getPlayerJobs) == 'function' then
            local ok, mJobs = pcall(ForgeCore.MultiJobService.getPlayerJobs, src)
            if ok and mJobs and mJobs.jobs then
                for _, mj in ipairs(mJobs.jobs) do
                    if string.lower(mj.name) == targetJobLower then
                        isMember = true
                        gradeLvl = tonumber(mj.grade) or 0
                        break
                    end
                end
            end
        end

        if not isMember and pData.metadata and pData.metadata.multijob then
            local metaJ = pData.metadata.multijob
            if type(metaJ) == 'table' then
                for _, mj in ipairs(metaJ) do
                    if string.lower(mj.name or '') == targetJobLower then
                        isMember = true
                        gradeLvl = tonumber(type(mj.grade) == 'table' and (mj.grade.level or mj.grade.grade) or mj.grade) or 0
                        break
                    end
                end
            end
        end

        if isMember and pData.citizenid then
            local name = ''
            if pData.charinfo then
                local fn = pData.charinfo.firstname or ''
                local ln = pData.charinfo.lastname or ''
                name = string.gsub(fn .. ' ' .. ln, '^%s*(.-)%s*$', '%1')
            end
            if name == '' or name == ' ' then name = pData.name or GetPlayerName(src) or ('ID ' .. tostring(src)) end

            employeesByCitizenId[pData.citizenid] = {
                citizenid = pData.citizenid,
                id = src,
                name = name,
                grade = getGradeName(gradeLvl),
                level = gradeLvl,
                online = true,
                initials = getInitials(name),
                joinedAt = 'Online / Em Serviço',
            }
        end
    end

    -- 2. Consultar tabela player_groups do banco (membros registrados offline e online)
    local groupRows = dbQuery('SELECT citizenid, grade FROM player_groups WHERE LOWER(`group`) = ? AND type = ?', { targetJobLower, 'job' })
    if type(groupRows) == 'table' then
        for _, row in ipairs(groupRows) do
            local cid = row.citizenid
            if cid then
                local gLvl = tonumber(row.grade) or 0
                if employeesByCitizenId[cid] then
                    if employeesByCitizenId[cid].level == 0 and gLvl > 0 then
                        employeesByCitizenId[cid].level = gLvl
                        employeesByCitizenId[cid].grade = getGradeName(gLvl)
                    end
                else
                    employeesByCitizenId[cid] = {
                        citizenid = cid,
                        id = cid,
                        name = cid,
                        grade = getGradeName(gLvl),
                        level = gLvl,
                        online = false,
                        initials = 'MB',
                        joinedAt = 'Cadastrado',
                    }
                end
            end
        end
    end

    -- 3. Consultar tabela players do banco (armazenamento padrão QBX/QBCore na coluna job)
    local playerRows = dbQuery('SELECT citizenid, name, charinfo, job FROM players WHERE job LIKE ?', { '%' .. targetJobLower .. '%' })
    if type(playerRows) == 'table' then
        for _, row in ipairs(playerRows) do
            local cid = row.citizenid
            if cid and not employeesByCitizenId[cid] then
                local okJob, jobObj = pcall(json.decode, row.job or '{}')
                if okJob and type(jobObj) == 'table' and string.lower(jobObj.name or '') == targetJobLower then
                    local gLvl = 0
                    if type(jobObj.grade) == 'table' then
                        gLvl = tonumber(jobObj.grade.level or jobObj.grade.grade) or 0
                    else
                        gLvl = tonumber(jobObj.grade) or 0
                    end
                    local charName = row.name or cid
                    if row.charinfo then
                        local okCi, ci = pcall(json.decode, row.charinfo)
                        if okCi and type(ci) == 'table' then
                            local fn = ci.firstname or ''
                            local ln = ci.lastname or ''
                            local fullName = string.gsub(fn .. ' ' .. ln, '^%s*(.-)%s*$', '%1')
                            if fullName ~= '' then charName = fullName end
                        end
                    end
                    employeesByCitizenId[cid] = {
                        citizenid = cid,
                        id = cid,
                        name = charName,
                        grade = getGradeName(gLvl),
                        level = gLvl,
                        online = false,
                        initials = getInitials(charName),
                        joinedAt = 'Cadastrado',
                    }
                end
            end
        end
    end

    -- 4. Resolver nomes de personagens pendentes a partir da tabela players
    local needNames = {}
    for cid, emp in pairs(employeesByCitizenId) do
        if emp.name == cid or emp.name == '' then
            needNames[#needNames + 1] = cid
        end
    end
    if #needNames > 0 then
        for _, cid in ipairs(needNames) do
            local pRow = dbQuery('SELECT charinfo, name FROM players WHERE citizenid = ? LIMIT 1', { cid })
            if type(pRow) == 'table' and pRow[1] then
                local row = pRow[1]
                local charName = row.name or cid
                if row.charinfo then
                    local okCi, ci = pcall(json.decode, row.charinfo)
                    if okCi and type(ci) == 'table' then
                        local fn = ci.firstname or ''
                        local ln = ci.lastname or ''
                        local fullName = string.gsub(fn .. ' ' .. ln, '^%s*(.-)%s*$', '%1')
                        if fullName ~= '' then charName = fullName end
                    end
                end
                employeesByCitizenId[cid].name = charName
                employeesByCitizenId[cid].initials = getInitials(charName)
            end
        end
    end

    -- Montar lista final: online primeiro, seguido de maior cargo
    local list = {}
    for _, emp in pairs(employeesByCitizenId) do
        list[#list + 1] = emp
    end
    table.sort(list, function(a, b)
        if a.online ~= b.online then
            return a.online == true
        end
        return a.level > b.level
    end)

    return list
end

-- Callback principal: Obter dados de gestão da organização
registerCallback('forge-npwd:management:getData', function(source, requestedJob)
    local caller = getCallerGroup(source, requestedJob)
    local isAdmin = isPlayerAdmin(source)

    -- Mapear empregos com permissão de gestão do jogador (multijob)
    local availableJobs = {}
    local seenJobs = {}

    if caller then
        local activeCaller = caller
        if activeCaller then
            availableJobs[#availableJobs + 1] = {
                name = activeCaller.name,
                label = activeCaller.label,
                gradeLevel = activeCaller.gradeLevel,
                gradeName = activeCaller.gradeName,
                isBoss = activeCaller.isBoss,
                active = true,
            }
            seenJobs[activeCaller.name] = true
        end
    end

    local holderCitizenId = pr_lib.framework.GetIdentifier(source)
    if caller and caller.citizenid == holderCitizenId and ForgeCore and ForgeCore.MultiJobService and type(ForgeCore.MultiJobService.getPlayerJobs) == 'function' then
        local ok, res = pcall(ForgeCore.MultiJobService.getPlayerJobs, source)
        if ok and res and res.jobs then
            for _, j in ipairs(res.jobs) do
                if not seenJobs[j.name] then
                    local jobDef = getJobDefinition(j.name)
                    local gData = jobDef and jobDef.grades and (jobDef.grades[j.grade] or jobDef.grades[tostring(j.grade)])
                    local isBoss = (gData and (gData.isboss == true or gData.bankAuth == true)) == true
                    availableJobs[#availableJobs + 1] = {
                        name = j.name,
                        label = j.label or (jobDef and jobDef.label) or j.name,
                        gradeLevel = tonumber(j.grade) or 0,
                        gradeName = (gData and gData.name) or j.gradeLabel or ('Nível ' .. tostring(j.grade)),
                        isBoss = isBoss == true,
                        active = j.active == true,
                    }
                    seenJobs[j.name] = true
                end
            end
        end
    end

    local safeOrg = {
        name = caller and caller.name or 'none',
        label = caller and caller.label or 'Sem Organização',
        motto = caller and caller.motto or 'Disciplina. Proteção. Serviço.',
        badge = caller and caller.badge or 'FORGE',
        balance = 0,
        playerGradeLevel = caller and caller.gradeLevel or 0,
        playerGradeName = caller and caller.gradeName or 'Civil',
        playerCitizenId = caller and caller.citizenid or '',
        isBoss = caller and caller.isBoss or false,
        canManage = caller and caller.canManage or false,
        totalMembers = 0,
        onlineMembers = 0,
    }

    if not caller then
        return {
            authorized = false,
            reason = 'Você não possui nenhum emprego ou organização corporativa associada.',
            organization = safeOrg,
            members = {},
            grades = {},
            candidates = {},
            transactions = {},
            registers = {},
            permissions = { currentUser = {}, byGrade = {}, byIndividual = {}, items = {} },
            availableJobs = availableJobs,
        }
    end

    local group = caller.group or getJobDefinition(caller.name)

    -- 1. Membros: Consulta unificada online + offline
    local membersList = fetchJobEmployees(caller.name, group)
    local onlineCount = 0
    for _, m in ipairs(membersList) do
        if m.online then onlineCount = onlineCount + 1 end
    end

    -- 2. Cargos e Salários: Carregados da definição do emprego (jobs.json / QBX)
    local gradesList = {}
    local gradesCountMap = {}
    for _, m in ipairs(membersList) do
        gradesCountMap[m.level] = (gradesCountMap[m.level] or 0) + 1
    end

    if group and group.grades then
        for lvl, g in pairs(group.grades) do
            local numLvl = tonumber(lvl) or 0
            gradesList[#gradesList + 1] = {
                name = g.name or ('Nível ' .. numLvl),
                level = numLvl,
                count = gradesCountMap[numLvl] or 0,
                salary = tonumber(g.payment or g.salary) or 0,
                isboss = g.isboss == true,
                isrecruiter = g.isrecruiter == true,
            }
        end
        table.sort(gradesList, function(a, b) return a.level > b.level end)
    end

    -- 3. Cofres Físicos da Organização (estritamente leitura do saldo dos registradores em group.stashes)
    local registersList = {}
    local totalSafeBalance = 0
    local transactions = {}

    if group and group.stashes then
        for _, station in ipairs(group.stashes) do
            local stationTitle = station.title or station.label or station.id or 'Unidade'
            for _, reg in ipairs(station.registers or {}) do
                local regBal = tonumber(reg.balance) or 0
                totalSafeBalance = totalSafeBalance + regBal
                local regLabel = reg.label or reg.targetLabel or 'Cofre'
                registersList[#registersList + 1] = {
                    id = reg.id,
                    label = regLabel,
                    stationTitle = stationTitle,
                    balance = regBal,
                }
                transactions[#transactions + 1] = {
                    id = 'tx_' .. tostring(reg.id),
                    title = regLabel .. ' (' .. stationTitle .. ')',
                    date = 'Saldo em Cofre Físico',
                    amount = regBal,
                    isDeposit = true,
                }
            end
        end
    end

    if #transactions == 0 then
        transactions[1] = {
            id = 'tx_none',
            title = 'Nenhum cofre físico cadastrado',
            date = 'Hoje',
            amount = 0,
            isDeposit = true,
        }
    end

    -- 4. Candidaturas: Carregadas diretamente dos stashes da organização (applications)
    local candidatesList = {}
    if group and group.stashes then
        for _, station in ipairs(group.stashes) do
            local stationTitle = station.title or station.label or station.id or 'Unidade'
            for _, app in ipairs(station.applications or {}) do
                local appLabel = app.label or app.targetLabel or 'Candidatura'
                for _, sub in ipairs(app.submissions or {}) do
                    local subDate = 'Recente'
                    if sub.createdAt and tonumber(sub.createdAt) then
                        subDate = os.date('%d/%m/%Y %H:%M', math.floor(tonumber(sub.createdAt)))
                    elseif sub.submittedAt then
                        subDate = tostring(sub.submittedAt)
                    end

                    candidatesList[#candidatesList + 1] = {
                        id = sub.id or (sub.citizenid .. '_' .. tostring(sub.createdAt or 1)),
                        citizenid = sub.citizenid,
                        name = sub.name or sub.citizenid,
                        phone = sub.phone,
                        score = tonumber(sub.score) or 0,
                        passed = sub.passed == true,
                        status = sub.status or 'pending',
                        submittedAt = subDate,
                        stationId = station.id,
                        stationTitle = stationTitle,
                        applicationId = app.id,
                        applicationLabel = appLabel,
                        answers = sub.answers or {},
                    }
                end
            end
        end
    end

    -- 5. Permissões: por cargo e individual
    local jobPerms = getJobPermissions(caller.name)
    local permissionsPayload = {
        currentUser = caller.effectivePerms or {},
        byGrade = caller.isBoss and (jobPerms.grades or {}) or {},
        byIndividual = caller.isBoss and (jobPerms.individuals or {}) or {},
        items = {
            { id = 'p_members', name = 'Gerenciar membros', description = 'Contratar, demitir e gerenciar funcionários.' },
            { id = 'p_grades', name = 'Visualizar hierarquia', description = 'Acessar cargos e salários cadastrados.' },
            { id = 'p_finance', name = 'Auditar cofres', description = 'Visualizar saldo físico dos cofres.' },
            { id = 'p_candidates', name = 'Avaliar candidaturas', description = 'Aprovar ou rejeitar formulários.' },
        }
    }

    return {
        authorized = true,
        organization = {
            name = caller.name,
            label = caller.label,
            groupType = 'job',
            motto = caller.motto,
            badge = caller.badge,
            balance = (caller.isBoss or (caller.effectivePerms and caller.effectivePerms.p_finance == true)) and totalSafeBalance or 0,
            playerGradeLevel = caller.gradeLevel,
            playerGradeName = caller.gradeName,
            playerCitizenId = caller.citizenid or '',
            isBoss = caller.isBoss,
            canManage = caller.canManage,
            totalMembers = #membersList,
            onlineMembers = onlineCount,
        },
        members = membersList,
        grades = gradesList,
        candidates = (caller.isBoss or (caller.effectivePerms and caller.effectivePerms.p_candidates == true)) and candidatesList or {},
        transactions = (caller.isBoss or (caller.effectivePerms and caller.effectivePerms.p_finance == true)) and transactions or {},
        registers = (caller.isBoss or (caller.effectivePerms and caller.effectivePerms.p_finance == true)) and registersList or {},
        permissions = permissionsPayload,
        availableJobs = availableJobs,
    }
end)

-- Callback: Obter dados dos jogadores próximos (para contratação fácil)
registerCallback('forge-npwd:management:getNearbyPlayersData', function(source, nearbyList)
    local result = {}
    if type(nearbyList) == 'table' then
        for _, item in ipairs(nearbyList) do
            local sId = tonumber(item.id)
            if sId and sId > 0 then
                local pData = pr_lib.framework.GetPlayerData(sId)
                local name = ''
                local citizenid = ''
                if pData then
                    citizenid = pData.citizenid or ''
                    if pData.charinfo then
                        local fn = pData.charinfo.firstname or ''
                        local ln = pData.charinfo.lastname or ''
                        name = string.gsub(fn .. ' ' .. ln, '^%s*(.-)%s*$', '%1')
                    end
                    if name == '' then name = pData.name end
                end
                if name == '' or name == ' ' then name = GetPlayerName(sId) or ('ID ' .. sId) end
                result[#result + 1] = {
                    id = sId,
                    name = name,
                    citizenid = citizenid,
                    distance = item.distance or 0,
                }
            end
        end
    end
    return { status = 'ok', players = result }
end)

-- Callback: Contratar jogador + Enviar E-mail via Forge NPWD Forge Mail
registerCallback('forge-npwd:management:hireEmployee', function(source, data)
    local caller = getCallerGroup(source, data and data.job)
    if not caller or (not caller.isBoss and not (caller.effectivePerms and caller.effectivePerms.p_members)) then
        return { success = false, message = 'Você não possui permissão para contratar.' }
    end

    local target = tostring(data and data.target or '')
    local grade = tonumber(data and data.grade) or 0

    local targetCitizenId = nil
    local targetServerId = tonumber(target)

    if targetServerId and targetServerId > 0 then
        local targetPlayer = pr_lib.framework.GetPlayerData(targetServerId)
        if targetPlayer and targetPlayer.citizenid then
            targetCitizenId = targetPlayer.citizenid
        end
    else
        targetCitizenId = target
    end

    if not targetCitizenId or targetCitizenId == '' then
        return { success = false, message = 'Jogador não encontrado ou CitizenID inválido.' }
    end

    local jobName = string.lower(caller.name)
    local groupDef = getJobDefinition(jobName)
    if not groupDef or not groupDef.grades then
        return { success = false, message = 'Organização não encontrada.' }
    end

    local validGrade = groupDef.grades[grade] or groupDef.grades[tostring(grade)]
    if not validGrade then
        return { success = false, message = 'Cargo de contratação inválido ou inexistente.' }
    end

    if not caller.isBoss and grade >= caller.gradeLevel then
        return { success = false, message = 'Você não pode contratar alguém para um cargo igual ou superior ao seu.' }
    end
    if exports['qbx_core'] and exports['qbx_core'].SetJob then
        pcall(function()
            exports['qbx_core']:SetJob(targetCitizenId, jobName, grade)
        end)
    elseif exports['qbx_core'] and exports['qbx_core'].AddPlayerToJob then
        pcall(function()
            exports['qbx_core']:AddPlayerToJob(targetCitizenId, jobName, grade)
        end)
    elseif pr_lib and pr_lib.framework and pr_lib.framework.AddPlayerToJob then
        pcall(pr_lib.framework.AddPlayerToJob, targetCitizenId, jobName, grade)
    end

    -- Se online, sincroniza imediatamente o jogador
    local isOnline, pSource = getEmployeeOnline(targetCitizenId)
    if isOnline and pSource then
        pcall(function()
            if exports['qbx_core'] and exports['qbx_core'].GetPlayer then
                local p = exports['qbx_core']:GetPlayer(pSource)
                if p and p.Functions and p.Functions.SetJob then
                    p.Functions.SetJob(jobName, grade)
                end
            end
        end)
    end

    -- Garante persistência em player_groups
    dbQuery('INSERT INTO player_groups (`citizenid`, `group`, `type`, `grade`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE grade = ?',
        { targetCitizenId, jobName, 'job', grade, grade })

    -- Obter nome do cargo atribuído
    local group = caller.group or getJobDefinition(caller.name)
    local gradeName = 'Nível ' .. grade
    if group and group.grades then
        local g = group.grades[grade] or group.grades[tostring(grade)]
        if g and g.name then gradeName = g.name end
    end

    -- Enviar e-mail de contratação via Forge NPWD Forge Mail
    if exports['forge-npwd-mail'] and exports['forge-npwd-mail'].SendMailToCitizen then
        local customMsg = data and data.message
        local welcomeText = (type(customMsg) == 'string' and customMsg ~= '') and customMsg
            or string.format('Parabéns! Você foi contratado pela organização %s para o cargo de %s. Apresente-se ao seu comandante para orientações e fardamento.', caller.label or 'Corporação', gradeName)

        pcall(function()
            exports['forge-npwd-mail']:SendMailToCitizen(targetCitizenId, {
                sender = caller.label or 'Gestão Corporativa',
                subject = 'Contratação - ' .. (caller.label or 'Organização'),
                message = welcomeText,
            })
        end)
    end

    -- Notificar jogador se estiver online
    if isOnline and pSource then
        pcall(function()
            if pr_lib.notify and pr_lib.notify.show then
                pr_lib.notify.show(pSource, {
                    title = caller.label,
                    description = 'Você foi admitido como ' .. gradeName .. '!',
                    type = 'success',
                })
            end
        end)
    end

    return { success = true, message = 'Jogador contratado com sucesso e e-mail corporativo enviado!' }
end)

-- Callback: Demitir funcionário
registerCallback('forge-npwd:management:fireEmployee', function(source, data)
    local caller = getCallerGroup(source, data and data.job)
    if not caller or (not caller.isBoss and not (caller.effectivePerms and caller.effectivePerms.p_members)) then
        return { success = false, message = 'Apenas o chefe/comandante pode demitir funcionários.' }
    end

    local citizenid = tostring(data and data.citizenid or '')
    if citizenid == '' then
        return { success = false, message = 'CitizenID inválido.' }
    end

    if caller.citizenid and citizenid == caller.citizenid then
        return { success = false, message = 'Você não pode demitir a si mesmo.' }
    end

    local jobName = string.lower(caller.name)

    if not caller.isBoss then
        local currentTargetGrade = nil
        local targetRows = dbQuery('SELECT grade FROM player_groups WHERE citizenid = ? AND LOWER(`group`) = ? LIMIT 1', { citizenid, jobName })
        if type(targetRows) == 'table' and targetRows[1] then
            currentTargetGrade = tonumber(targetRows[1].grade) or 0
        end
        if currentTargetGrade and currentTargetGrade >= caller.gradeLevel then
            return { success = false, message = 'Você não pode demitir alguém com patente superior ou igual à sua.' }
        end
    end

    -- 1. Remove do qbx_core
    if exports['qbx_core'] and exports['qbx_core'].RemovePlayerFromJob then
        pcall(function()
            exports['qbx_core']:RemovePlayerFromJob(citizenid, jobName)
        end)
    end

    -- 2. Define como unemployed no qbx_core
    if exports['qbx_core'] and exports['qbx_core'].SetJob then
        pcall(function()
            exports['qbx_core']:SetJob(citizenid, 'unemployed', 0)
        end)
    end

    -- 3. Se online, atualiza o ped em tempo real
    local isOnline, pSource = getEmployeeOnline(citizenid)
    if isOnline and pSource then
        pcall(function()
            if exports['qbx_core'] and exports['qbx_core'].GetPlayer then
                local p = exports['qbx_core']:GetPlayer(pSource)
                if p and p.Functions and p.Functions.SetJob then
                    p.Functions.SetJob('unemployed', 0)
                end
            end
            if pr_lib.notify and pr_lib.notify.show then
                pr_lib.notify.show(pSource, {
                    title = caller.label,
                    description = 'Você foi desligado da corporação.',
                    type = 'error',
                })
            end
        end)
    end

    -- 4. Deleta de player_groups
    dbQuery('DELETE FROM player_groups WHERE citizenid = ? AND LOWER(`group`) = ?', { citizenid, jobName })

    -- 5. Atualiza tabela players se o emprego principal era este
    local pRows = dbQuery('SELECT job FROM players WHERE citizenid = ? LIMIT 1', { citizenid })
    if type(pRows) == 'table' and pRows[1] and pRows[1].job then
        local okJ, jobObj = pcall(json.decode, pRows[1].job)
        if okJ and type(jobObj) == 'table' and string.lower(jobObj.name or '') == jobName then
            local unemployedObj = {
                name = 'unemployed',
                label = 'Civil',
                payment = 10,
                onduty = false,
                isboss = false,
                grade = { name = 'Civil', level = 0 }
            }
            dbQuery('UPDATE players SET job = ? WHERE citizenid = ?', { json.encode(unemployedObj), citizenid })
        end
    end

    -- 6. Limpa permissões individuais órfãs se existirem
    local allPerms = loadPermissionsFile()
    if allPerms[jobName] and allPerms[jobName].individuals and allPerms[jobName].individuals[citizenid] then
        allPerms[jobName].individuals[citizenid] = nil
        savePermissionsFile(allPerms)
    end

    return { success = true, message = 'Funcionário desligado da organização com sucesso.' }
end)

-- Callback: Alterar cargo
registerCallback('forge-npwd:management:setEmployeeGrade', function(source, data)
    local caller = getCallerGroup(source, data and data.job)
    if not caller or (not caller.isBoss and not (caller.effectivePerms and caller.effectivePerms.p_members)) then
        return { success = false, message = 'Você não possui permissão para alterar cargos.' }
    end

    local citizenid = tostring(data and data.citizenid or '')
    local grade = tonumber(data and data.grade) or 0

    if citizenid == '' then
        return { success = false, message = 'CitizenID inválido.' }
    end

    if caller.citizenid and citizenid == caller.citizenid then
        return { success = false, message = 'Você não pode alterar seu próprio cargo.' }
    end

    local jobName = string.lower(caller.name)
    local groupDef = getJobDefinition(jobName)
    if not groupDef or not groupDef.grades then
        return { success = false, message = 'Organização não encontrada.' }
    end

    local validGrade = groupDef.grades[grade] or groupDef.grades[tostring(grade)]
    if not validGrade then
        return { success = false, message = 'Cargo inválido ou inexistente nesta organização.' }
    end

    if not caller.isBoss then
        if grade >= caller.gradeLevel then
            return { success = false, message = 'Você não pode promover para um cargo igual ou superior ao seu.' }
        end
        local currentTargetGrade = nil
        local targetRows = dbQuery('SELECT grade FROM player_groups WHERE citizenid = ? AND LOWER(`group`) = ? LIMIT 1', { citizenid, jobName })
        if type(targetRows) == 'table' and targetRows[1] then
            currentTargetGrade = tonumber(targetRows[1].grade) or 0
        end
        if currentTargetGrade and currentTargetGrade >= caller.gradeLevel then
            return { success = false, message = 'Você não pode alterar o cargo de alguém com patente superior ou igual à sua.' }
        end
    end
    if exports['qbx_core'] and exports['qbx_core'].SetJob then
        pcall(function()
            exports['qbx_core']:SetJob(citizenid, jobName, grade)
        end)
    elseif exports['qbx_core'] and exports['qbx_core'].AddPlayerToJob then
        pcall(function()
            exports['qbx_core']:AddPlayerToJob(citizenid, jobName, grade)
        end)
    end

    if pr_lib and pr_lib.framework and pr_lib.framework.AddPlayerToJob then
        pcall(pr_lib.framework.AddPlayerToJob, citizenid, jobName, grade)
    end

    -- 2. Se online, atualiza live PlayerData
    local isOnline, pSource = getEmployeeOnline(citizenid)
    if isOnline and pSource then
        pcall(function()
            if exports['qbx_core'] and exports['qbx_core'].GetPlayer then
                local p = exports['qbx_core']:GetPlayer(pSource)
                if p and p.Functions and p.Functions.SetJob then
                    p.Functions.SetJob(jobName, grade)
                end
            end
        end)
    end

    -- 3. Atualizar player_groups
    dbQuery('INSERT INTO player_groups (`citizenid`, `group`, `type`, `grade`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE grade = ?',
        { citizenid, jobName, 'job', grade, grade })

    -- 4. Atualizar players table JSON
    local pRows = dbQuery('SELECT job FROM players WHERE citizenid = ? LIMIT 1', { citizenid })
    if type(pRows) == 'table' and pRows[1] and pRows[1].job then
        local okJ, jobObj = pcall(json.decode, pRows[1].job)
        if okJ and type(jobObj) == 'table' and string.lower(jobObj.name or '') == jobName then
            local groupDef = getJobDefinition(jobName)
            local gName = 'Nível ' .. grade
            if groupDef and groupDef.grades then
                local gData = groupDef.grades[grade] or groupDef.grades[tostring(grade)]
                if gData and gData.name then gName = gData.name end
            end
            jobObj.grade = { level = grade, name = gName }
            dbQuery('UPDATE players SET job = ? WHERE citizenid = ?', { json.encode(jobObj), citizenid })
        end
    end

    -- Obter nome do cargo
    local groupDef = getJobDefinition(jobName)
    local gradeName = 'Nível ' .. grade
    if groupDef and groupDef.grades then
        local g = groupDef.grades[grade] or groupDef.grades[tostring(grade)]
        if g and g.name then gradeName = g.name end
    end

    if isOnline and pSource then
        pcall(function()
            if pr_lib.notify and pr_lib.notify.show then
                pr_lib.notify.show(pSource, {
                    title = caller.label,
                    description = 'Seu cargo foi alterado para ' .. gradeName .. '!',
                    type = 'info',
                })
            end
        end)
    end

    return { success = true, message = 'Cargo alterado para ' .. gradeName .. ' com sucesso!' }
end)

-- Callback: Avaliar / responder candidatura + E-mail
registerCallback('forge-npwd:management:reviewCandidate', function(source, data)
    local caller = getCallerGroup(source, data and data.job)
    if not caller or (not caller.isBoss and not (caller.effectivePerms and caller.effectivePerms.p_candidates)) then
        return { success = false, message = 'Sem permissão para avaliar candidatos.' }
    end

    local candidateId = data and data.candidateId
    local status = tostring(data and data.status or 'pending')

    if not candidateId or (status ~= 'accepted' and status ~= 'rejected') then
        return { success = false, message = 'Parâmetros de candidatura inválidos.' }
    end

    local allJobs = loadJobsJson()
    local matchedSub = nil
    if allJobs then
        local jobObj = allJobs[caller.name] or allJobs[string.lower(caller.name)]
        if jobObj and jobObj.stashes then
            for _, station in ipairs(jobObj.stashes) do
                for _, app in ipairs(station.applications or {}) do
                    for _, sub in ipairs(app.submissions or {}) do
                        local subId = sub.id or (sub.citizenid .. '_' .. tostring(sub.createdAt or 1))
                        if tostring(subId) == tostring(candidateId) or tostring(sub.id) == tostring(candidateId) or sub.citizenid == candidateId then
                            sub.status = status
                            matchedSub = sub
                            break
                        end
                    end
                    if matchedSub then break end
                end
                if matchedSub then break end
            end
        end
        if matchedSub then
            saveJobsJson(allJobs)
        end
    end

    if not matchedSub then
        return { success = false, message = 'Candidatura não encontrada.' }
    end

    if status == 'accepted' then
        local jobName = string.lower(caller.name)
        if exports['qbx_core'] and exports['qbx_core'].SetJob then
            exports['qbx_core']:SetJob(matchedSub.citizenid, jobName, 0)
        elseif pr_lib.framework and pr_lib.framework.AddPlayerToJob then
            pr_lib.framework.AddPlayerToJob(matchedSub.citizenid, jobName, 0)
        end
        dbQuery('INSERT INTO player_groups (`citizenid`, `group`, `type`, `grade`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE grade = 0',
            { matchedSub.citizenid, jobName, 'job', 0 })
    end

    if exports['forge-npwd-mail'] and exports['forge-npwd-mail'].SendMailToCitizen then
        pcall(function()
            local emailSubject = status == 'accepted' and ('Aprovado - ' .. (caller.label or 'Processo Seletivo')) or ('Processo Seletivo - ' .. (caller.label or 'Corporação'))
            local emailText = status == 'accepted'
                and string.format('Parabéns, %s! Sua candidatura para a organização %s foi APROVADA. Você foi contratado e adicionado ao quadro oficial.', matchedSub.name or '', caller.label or '')
                or string.format('Prezado(a) %s, informamos que sua candidatura para a organização %s foi analisada e NÃO foi aceita neste momento.', matchedSub.name or '', caller.label or '')

            exports['forge-npwd-mail']:SendMailToCitizen(matchedSub.citizenid, {
                sender = caller.label or 'Recrutamento',
                subject = emailSubject,
                message = emailText,
            })
        end)
    end

    return {
        success = true,
        message = status == 'accepted' and 'Candidato aprovado e contratado com sucesso!' or 'Candidatura rejeitada com sucesso.'
    }
end)

-- ── CALLBACKS DE CONFIGURAÇÃO DE PERMISSÕES ───────────────────────────────────

-- Callback: Configurar permissão de um cargo
registerCallback('forge-npwd:management:setGradePermission', function(source, data)
    local caller = getCallerGroup(source, data and data.job)
    if not caller or not caller.isBoss then
        return { success = false, message = 'Apenas o chefe/comandante pode configurar permissões de cargo.' }
    end

    local gradeStr = tostring(tonumber(data and data.grade) or 0)
    local permId = tostring(data and data.permId or '')
    local value = data and data.value == true

    if permId == '' then
        return { success = false, message = 'Permissão inválida.' }
    end

    local all = loadPermissionsFile()
    local jobKey = string.lower(caller.name)
    all[jobKey] = all[jobKey] or { grades = {}, individuals = {} }
    all[jobKey].grades = all[jobKey].grades or {}
    all[jobKey].grades[gradeStr] = all[jobKey].grades[gradeStr] or {}
    all[jobKey].grades[gradeStr][permId] = value

    savePermissionsFile(all)
    return { success = true, message = 'Permissão do cargo atualizada!', permissions = all[jobKey].grades[gradeStr] }
end)

-- Callback: Configurar permissão individual de um membro
registerCallback('forge-npwd:management:setMemberPermission', function(source, data)
    local caller = getCallerGroup(source, data and data.job)
    if not caller or not caller.isBoss then
        return { success = false, message = 'Apenas o chefe/comandante pode configurar permissões individuais.' }
    end

    local citizenid = tostring(data and data.citizenid or '')
    local permId = tostring(data and data.permId or '')
    local value = data and data.value == true

    if citizenid == '' or permId == '' then
        return { success = false, message = 'Parâmetros inválidos.' }
    end

    if caller.citizenid and citizenid == caller.citizenid then
        return { success = false, message = 'Você não pode alterar suas próprias permissões.' }
    end

    local all = loadPermissionsFile()
    local jobKey = string.lower(caller.name)
    all[jobKey] = all[jobKey] or { grades = {}, individuals = {} }
    all[jobKey].individuals = all[jobKey].individuals or {}
    all[jobKey].individuals[citizenid] = all[jobKey].individuals[citizenid] or {}
    all[jobKey].individuals[citizenid][permId] = value

    savePermissionsFile(all)
    return { success = true, message = 'Permissão individual atualizada!', permissions = all[jobKey].individuals[citizenid] }
end)

-- Callback: Redefinir permissões individuais (restaurar padrão do cargo)
registerCallback('forge-npwd:management:resetMemberPermissions', function(source, data)
    local caller = getCallerGroup(source, data and data.job)
    if not caller or not caller.isBoss then
        return { success = false, message = 'Apenas o chefe/comandante pode redefinir permissões.' }
    end

    local citizenid = tostring(data and data.citizenid or '')
    if citizenid == '' then
        return { success = false, message = 'CitizenID inválido.' }
    end

    if caller.citizenid and citizenid == caller.citizenid then
        return { success = false, message = 'Você não pode alterar suas próprias permissões.' }
    end

    local all = loadPermissionsFile()
    local jobKey = string.lower(caller.name)
    if all[jobKey] and all[jobKey].individuals and all[jobKey].individuals[citizenid] then
        all[jobKey].individuals[citizenid] = nil
        savePermissionsFile(all)
    end

    return { success = true, message = 'Permissões individuais redefinidas para o padrão do cargo.' }
end)

-- Depósito e Saque (Aviso de operação física no local)
registerCallback('forge-npwd:management:depositMoney', function(source, data)
    return { success = false, message = 'Operações de depósito devem ser feitas fisicamente no cofre no local da estação.' }
end)

registerCallback('forge-npwd:management:withdrawMoney', function(source, data)
    return { success = false, message = 'Operações de saque devem ser feitas fisicamente no cofre no local da estação.' }
end)
