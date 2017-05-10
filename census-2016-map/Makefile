build/gz_2010_us_050_00_20m.zip:
	mkdir -p $(dir $@)
	curl -o $@ http://www2.census.gov/geo/tiger/GENZ2010/$(notdir $@)

build/gz_2010_us_050_00_20m.shp: build/gz_2010_us_050_00_20m.zip
	unzip -od $(dir $@) $<
	touch $@

build/counties.json: build/gz_2010_us_050_00_20m.shp COEST2015alldata.csv
	node_modules/.bin/topojson \
		-o $@ \
		--id-property='STATE+COUNTY' \
		--external-properties=COEST2015alldata.csv \
		--properties='name=Geography' \
		--properties='population=+d.properties["NPOPCHG_2015"]' \
		--simplify-proportion=.4 \
		--filter=none \
		-- counties=$<

build/states.json: build/counties.json
	node_modules/.bin/topojson-merge \
		-o build/states.json \
		--in-object=counties \
		--out-object=states \
		--key='d.id.substring(0, 2)' \
		-- $<

build/us.json: build/states.json
	node_modules/.bin/topojson-merge \
		-o build/us.json \
		--in-object=states \
		--out-object=nation \
		-- $<