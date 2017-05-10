counties.json: /Users/chris/data/geo/tl_2013_us_county/illinois_water_clip.shp senate_join.csv
	node_modules/.bin/topojson \
		-o $@ \
		--id-property='GEOID,fipscode' \
		--external-properties=senate_join.csv \
		--properties\
		--filter=none \
		-- counties=$<