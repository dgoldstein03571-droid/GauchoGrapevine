window.onload = init
function init(){
    var map = new ol.Map({
        view: new ol.View({
            center:[0,0],
            zoom:4
        }),
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        target: 'web-map'
    })
}