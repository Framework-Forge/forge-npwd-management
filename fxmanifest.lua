fx_version 'cerulean'
game 'gta5'

name 'forge-npwd-management'
author 'ForgeBox - PierreMoraes'
description 'Boss & Management App for Forge NPWD Phone'
version '1.0.2'

shared_scripts {
    '@ox_lib/init.lua',
    '@pr_bridge/init.lua',
    '@forge-npwd/compat/app.lua'
}

-- Legacy dependency names; export routing remains inside forge-npwd.
provide 'npwd-forge-management'
provide 'npwd_forge_management'

client_script 'client/main.lua'
server_script 'server/main.lua'

ui_page 'web/dist/index.html'

files {
    'web/dist/index.html',
    'web/dist/**/*',
}

escrow_ignore {
    '**'
}

use_experimental_fxv2_oal 'yes'
lua54 'yes'

dependencies {
    'pr_bridge',
    'forge-npwd'
}

server_script 'server/version.lua'
