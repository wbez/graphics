 var mymap = L.map('mapid').setView([42.19, -88.09], 12);

    var geojsonMarkerOptions = {
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
    };

    //tile layer
    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', 
    {
        maxZoom: 18, 
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy;<a href="https://carto.com/attribution">CARTO</a>'
    }).addTo(mymap);



//add geoJSON layer

     $.getJSON("lake_zurich_map_places_1.geojson",function(data){

    // add markers
    
        L.geoJson(data, {

            pointToLayer: function(feature,latlng){
                var marker = L.marker(latlng, geojsonMarkerOptions);
                marker.bindPopup('<h2>' + feature.properties.name + '</h2>' + '<br>' + feature.properties.type);
                return marker; 
        }
        }).addTo(mymap);
    });