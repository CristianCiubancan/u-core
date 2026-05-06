-- u-core: client-side debug helpers. Lives alongside server/debug.lua.

-- /coords — dump player ped + gameplay-camera state to F8 console.
-- Copy-pasteable vector4 for ped pose, plus camera + zone context for
-- working out spatial relationships.
RegisterCommand('coords', function()
    local ped = PlayerPedId()
    local pedCoords = GetEntityCoords(ped)
    local pedHeading = GetEntityHeading(ped)
    local pedForward = GetEntityForwardVector(ped)

    local camCoords = GetGameplayCamCoord()
    local camRot = GetGameplayCamRot(2) -- 2 = ZXY world rotation order
    local zRad = math.rad(camRot.z)
    local xRad = math.rad(camRot.x)
    local cosX = math.cos(xRad)
    local camForward = vector3(-math.sin(zRad) * cosX, math.cos(zRad) * cosX, math.sin(xRad))

    local interior = GetInteriorFromEntity(ped)
    local roomKey = interior ~= 0 and GetRoomKeyFromEntity(ped) or 0
    local zone = GetNameOfZone(pedCoords.x, pedCoords.y, pedCoords.z) or '?'
    local streetHash = GetStreetNameAtCoord(pedCoords.x, pedCoords.y, pedCoords.z)
    local streetName = streetHash and GetStreetNameFromHashKey(streetHash) or '?'

    print('^3[coords]^0 ----------------------------------------')
    print(('  ^5ped^0    vector4(%.4f, %.4f, %.4f, %.4f)'):format(
        pedCoords.x, pedCoords.y, pedCoords.z, pedHeading
    ))
    print(('  ^5fwd^0    vector3(%.4f, %.4f, %.4f)'):format(
        pedForward.x, pedForward.y, pedForward.z
    ))
    print(('  ^5cam^0    vector3(%.4f, %.4f, %.4f)  rot(%.2f, %.2f, %.2f)'):format(
        camCoords.x, camCoords.y, camCoords.z, camRot.x, camRot.y, camRot.z
    ))
    print(('  ^5camFwd^0 vector3(%.4f, %.4f, %.4f)'):format(
        camForward.x, camForward.y, camForward.z
    ))
    print(('  ^5cam→ped^0 vector3(%.4f, %.4f, %.4f)'):format(
        pedCoords.x - camCoords.x, pedCoords.y - camCoords.y, pedCoords.z - camCoords.z
    ))
    print(('  ^5interior^0 %d  ^5roomKey^0 %d'):format(interior, roomKey))
    print(('  ^5zone^0   %s   ^5street^0 %s'):format(zone, streetName))
    print('^3[coords]^0 ----------------------------------------')
end, false)
