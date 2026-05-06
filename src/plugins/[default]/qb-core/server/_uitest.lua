-- u-core: Admin-gated UI smoke-test commands for the qb-core webview.
-- Each command forwards to a client event in client/_uitest.lua that
-- exercises one Notify or DrawText surface, so the React port can be
-- re-verified after future edits without touching production code.
--
-- Permission: 'admin'. Players need the qbcore.admin ace (or 'god') —
-- in a fresh deploy, mark yourself via `setr qb_useWhitelist false` +
-- `add_ace qbcore.admin <identifier> allow` in server.cfg, or use
-- `/addpermission` from a god-perm console.

QBCore.Commands.Add('notifytest', 'Test qb-core notification variant (admin)', {
    { name = 'variant', help = 'success | primary | warning | error | police | ambulance' },
}, false, function(source, args)
    local variant = args[1] or 'primary'
    local text = table.concat(args, ' ', 2)
    if text == '' then text = 'Hello from variant: ' .. variant end
    TriggerClientEvent('qb-core:client:_uitest_notify', source, text, variant, 5000, nil)
end, 'admin')

QBCore.Commands.Add('notifyall', 'Cycle through all notify variants (admin)', {}, false, function(source)
    TriggerClientEvent('qb-core:client:_uitest_notify_all', source)
end, 'admin')

QBCore.Commands.Add('notifycaption', 'Test caption rendering (admin)', {}, false, function(source)
    TriggerClientEvent('qb-core:client:_uitest_notify_caption', source)
end, 'admin')

QBCore.Commands.Add('notifylong', 'Test multiline notification layout (admin)', {}, false, function(source)
    TriggerClientEvent('qb-core:client:_uitest_notify_long', source)
end, 'admin')

QBCore.Commands.Add('notifyicon', 'Test icon override (admin)', {
    { name = 'icon', help = 'Material name (e.g. check_circle) or FA chain (e.g. fas fa-rocket)' },
}, false, function(source, args)
    local icon = (#args > 0) and table.concat(args, ' ') or 'fas fa-coffee'
    TriggerClientEvent(
        'qb-core:client:_uitest_notify',
        source,
        'Icon override: ' .. icon,
        'primary',
        5000,
        icon
    )
end, 'admin')

QBCore.Commands.Add('notifygroup', 'Test group/repeat dedupe badge (admin)', {}, false, function(source)
    TriggerClientEvent('qb-core:client:_uitest_notify_group', source)
end, 'admin')

QBCore.Commands.Add('drawtest', 'Show drawtext at position (admin)', {
    { name = 'position', help = 'left | right | top' },
}, false, function(source, args)
    local pos = args[1] or 'left'
    TriggerClientEvent('qb-core:client:_uitest_drawtext_draw', source, pos)
end, 'admin')

QBCore.Commands.Add('changetest', 'Animate drawtext to new position (admin)', {
    { name = 'position', help = 'left | right | top' },
}, false, function(source, args)
    local pos = args[1] or 'right'
    TriggerClientEvent('qb-core:client:_uitest_drawtext_change', source, pos)
end, 'admin')

QBCore.Commands.Add('keytest', 'Flash drawtext as if key pressed (admin)', {}, false, function(source)
    TriggerClientEvent('qb-core:client:_uitest_drawtext_key', source)
end, 'admin')

QBCore.Commands.Add('hidetest', 'Hide drawtext (admin)', {}, false, function(source)
    TriggerClientEvent('qb-core:client:_uitest_drawtext_hide', source)
end, 'admin')

QBCore.Commands.Add('drawhtml', 'Test drawtext HTML pass-through (admin)', {}, false, function(source)
    TriggerClientEvent('qb-core:client:_uitest_drawtext_html', source)
end, 'admin')
