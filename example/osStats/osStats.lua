function pings.osStats(stats)
    nameplate.ENTITY:setText("(RAM "..stats["ram"]["total"].."GB/"..stats["ram"]["free"].."GB)")
end
