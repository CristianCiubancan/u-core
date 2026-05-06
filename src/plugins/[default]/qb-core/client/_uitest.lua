-- u-core: Receivers for the admin-gated UI smoke-test commands declared
-- in server/_uitest.lua. Listed in plugin.json's client_scripts AFTER
-- client/drawtext.lua so the qb-core exports (DrawText/ChangeText/etc.)
-- and QBCore.Functions.Notify are registered before these net handlers
-- can fire.

RegisterNetEvent('qb-core:client:_uitest_notify', function(text, variant, length, icon)
    QBCore.Functions.Notify(text, variant, length, icon)
end)

RegisterNetEvent('qb-core:client:_uitest_notify_all', function()
    local variants = { 'success', 'primary', 'warning', 'error', 'police', 'ambulance' }
    for i, v in ipairs(variants) do
        SetTimeout(i * 250, function()
            QBCore.Functions.Notify('Variant: ' .. v, v, 6000)
        end)
    end
end)

RegisterNetEvent('qb-core:client:_uitest_notify_caption', function()
    QBCore.Functions.Notify({
        text = 'Bank deposit completed',
        caption = 'Receipt #482 · $1,250',
    }, 'success', 6000)
end)

RegisterNetEvent('qb-core:client:_uitest_notify_long', function()
    QBCore.Functions.Notify(
        'This is a very long notification text that should exceed one hundred characters and force the multi-line top-aligned icon layout, mirroring upstream Quasar behavior for messages over the cutoff.',
        'primary',
        8000
    )
end)

RegisterNetEvent('qb-core:client:_uitest_notify_group', function()
    for i = 1, 5 do
        SetTimeout(i * 200, function()
            QBCore.Functions.Notify('Repeated message (group test)', 'primary', 8000)
        end)
    end
end)

RegisterNetEvent('qb-core:client:_uitest_drawtext_draw', function(pos)
    exports['qb-core']:DrawText('Press [E] to interact', pos)
end)

RegisterNetEvent('qb-core:client:_uitest_drawtext_change', function(pos)
    exports['qb-core']:ChangeText('Now press [F] instead', pos)
end)

RegisterNetEvent('qb-core:client:_uitest_drawtext_key', function()
    exports['qb-core']:KeyPressed()
end)

RegisterNetEvent('qb-core:client:_uitest_drawtext_hide', function()
    exports['qb-core']:HideText()
end)

RegisterNetEvent('qb-core:client:_uitest_drawtext_html', function()
    exports['qb-core']:DrawText(
        '<b>Bold line</b><br><span style="color:#22c55e">Green line</span>',
        'top'
    )
end)
