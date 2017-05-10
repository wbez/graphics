build/wards.json: /Users/chris/data/geo/wards/city_wards_2015_4326.shp
	node_modules/.bin/topojson \
		-o $@ \
		--id-property='WARD,ward' \
		--external-properties='president_turnout_2012_2016_for_map.csv' \
		-p \
		--simplify-proportion=.2 \
		-q 4000 \
		--filter=none \
		-- wards=$<

build/chicago.json: build/wards.json
	node_modules/.bin/topojson-merge \
		-o $@ \
		--in-object=wards \
		--out-object=chicago \
		-- $<