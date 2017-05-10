build/zip.json: /Users/chris/data/geo/Boundaries_-_ZIP_Codes/zip_codes_4326.shp
	CSV_FILE=$(shell pwd)/chicago_since_2015_pct_matrix.csv
	node_modules/.bin/topojson \
		-o $@ \
		--id-property=ZIP,recv_zip \
		--external-properties=/Users/chris/projects/graphics/dating/chicago_since_2015_pct_matrix.csv \
		-p \
		--simplify-proportion=.4 \
		--filter=none \
		-- zips=$<

build/cta.json: /Users/chris/data/geo/CTA_RailLines/CTA_RailLines_4326.shp
	node_modules/.bin/topojson \
		-o $@ \
		--id-property='OBJECTID' \
		-p \
		--simplify-proportion=.4 \
		--filter=none \
		-- cta=$<

build/chicago_border.json: build/zip.json
	node_modules/.bin/topojson-merge \
		-o $@ \
		--in-object=zips \
		--out-object=chicago \
		-- $<

build/chicago.json: build/chicago_border.json build/zip.json build/cta.json
	node_modules/.bin/topojson \
		-o $@ \
		-p \
		-- build/chicago_border.json build/zip.json build/cta.json