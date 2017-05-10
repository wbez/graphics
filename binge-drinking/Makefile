build/ca.json: chicago_census_tracts_2010/chicago_census_tracts_2010.shp
	node_modules/.bin/topojson \
		-o $@ \
		--id-property=geoid10,TractFIPS \
		--external-properties=cdc_500_cities_illinois_binge_no_chicago.csv \
		-p \
		--simplify-proportion=.4 \
		--filter=none \
		-- cas=$<

build/chicago.json: build/ca.json
	node_modules/.bin/topojson-merge \
		-o $@ \
		--in-object=cas \
		--out-object=chicago \
		-- $<