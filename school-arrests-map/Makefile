build/schools.json: schools.geojson
	node_modules/.bin/topojson \
		-o $@ \
		--id-property='name' \
		-p \
		-- schools=$<

build/ca.json: /Users/chris/data/geo/Comm_Areas/commareas4326.shp
	node_modules/.bin/topojson \
		-o $@ \
		--id-property='COMMUNITY' \
		--simplify-proportion=.4 \
		--filter=none \
		-- cas=$<

build/chicago_border.json: build/ca.json
	node_modules/.bin/topojson-merge \
		-o $@ \
		--in-object=cas \
		--out-object=chicago \
		-- $<

build/chicago.json: build/chicago_border.json build/schools.json
	node_modules/.bin/topojson \
		-o $@ \
		-p \
		-- build/ca.json build/chicago_border.json build/schools.json