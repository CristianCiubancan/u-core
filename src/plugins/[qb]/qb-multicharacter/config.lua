Config = {}
Config.Interior = vector3(-763.2816, 330.0418, 199.4865)              -- Interior to load where characters are previewed
Config.DefaultSpawn = vector3(-1035.71, -2731.87, 12.86)              -- Default spawn coords if you have start apartments disabled
Config.PedCoords = vector4(-763.2816, 330.0418, 199.4865, 177.7942)   -- Create preview ped at these coordinates
Config.HiddenCoords = vector4(-779.0154, 326.1801, 196.0860, 91.0454) -- Hides your actual ped while you are in selection
-- u-core: rotated ~15° clockwise from upstream's 357.0954° heading so
-- the preview ped sits in the LEFT half of the frame instead of dead
-- center. Our React character-select panel is right-aligned and would
-- otherwise overlap the ped.
Config.CamCoords = vector4(-763.1219, 326.8112, 200, 342.0954)        -- Camera coordinates for character preview screen
Config.EnableDeleteButton = true                                      -- Define if the player can delete the character or not
Config.customNationality = false                                      -- Defines if Nationality input is custom of blocked to the list of Countries
Config.SkipSelection = false                                          -- Skip the spawn selection and spawns the player at the last location

Config.DefaultNumberOfCharacters = 5                                  -- Define maximum amount of default characters (maximum 5 characters defined by default)
Config.PlayersNumberOfCharacters = {                                  -- Define maximum amount of player characters by rockstar license (you can find this license in your server's database in the player table)
    { license = 'license:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', numberOfChars = 2 },
}
