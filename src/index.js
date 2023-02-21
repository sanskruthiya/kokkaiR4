import * as maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const init_coord = [0.0, 1.5];
const init_zoom = 4.5;
const init_bearing = 0;
const init_pitch = 0;

const map = new maplibregl.Map({
    container: 'map',
    style: {"version":8,"name":"blank","center":[0,0],"zoom":1,"bearing":0,"pitch":0,"sources":{"plain":{"type":"vector","url":""}},"sprite":"","glyphs":"https://glyphs.geolonia.com/{fontstack}/{range}.pbf","layers":[{"id":"background","type":"background","paint":{"background-color":"#f5fffa"},'text-font':["Noto Sans Regular"]}],"id":"blank"},
    localIdeographFontFamily: ['sans-serif'],
    center: init_coord,
    zoom: init_zoom,
    minZoom: 4,
    maxZoom: 15,
    maxBounds: [[-50.0000, -10.0000],[50.0000, 25.0000]],
    bearing: init_bearing,
    pitch: init_pitch,
    interactive: true,
    dragRotate: false,
    touchPitch: false,
    pitchWithRotate: false,
    doubleClickZoom: false,
    maplibreLogo: false,
    attributionControl:false
});

map.touchZoomRotate.disableRotation();
map.zoomIn({duration: 1000});

const attCntl = new maplibregl.AttributionControl({
    customAttribution: '<p class="remark"><a href="https://kokkai.ndl.go.jp/" target="_blank">国会会議録検索システム</a>から取得した2022年の全ての会議録を解析。議論（発言数）が集中したトピックほど 緑 < 黄 < 赤 の順で色づきます。個々の会議録は5発言＝1セットで内容に沿って配置し、クリックで詳細を確認可能。(<a href="https://github.com/sanskruthiya/kokkaiR4" target="_blank">Github</a>）</p>',
    compact: true
});

map.addControl(attCntl, 'bottom-right');
map.addControl(new maplibregl.NavigationControl({showCompass:false}, 'top-left'));

const partyNames = ["2022年国会議事録全て","自由民主党","立憲民主党","日本維新の会","公明党","日本共産党","国民民主党","れいわ新選組","NHK党","各派に属しない議員"];
const gridNames = ["jenks_all","jenks_P01","jenks_P02","jenks_P03","jenks_P04","jenks_P05","jenks_P06","jenks_P07","jenks_P08","jenks_P09"];
let targetParty = 0;
let filter_id = '';
let grid_id = 'jenks_all';

map.on('load', function () {
    map.addSource('docs', {
        'type': 'vector',
        'tiles': [location.href+"/app/tile/{z}/{x}/{y}.pbf"],
        "minzoom": 0,
        "maxzoom": 8,
    });

    const gd = {'type': 'FeatureCollection','features': []}
    const doc_paint = {'circle-radius': 10, 'circle-color':['interpolate',['linear'],['zoom'],5,'#abdda4',7,'#ffcedb'],'circle-opacity': ['interpolate',['linear'],['zoom'],5,0,10,0.8],};

    map.addLayer({
        'id': 'tree',
        'type': 'fill',
        'source': {'type':'geojson', 'data': './app/tree.geojson'},
        'maxzoom': 10,
        'layout': {'visibility': 'visible'},
        'paint': {
            'fill-color': 
            [
                'interpolate',
                ['linear'],
                ['zoom'],
                5,'#cd853f',10,'#f5deb3'
            ]
        },
        'fill-opacity': 0.5
    });

    map.addLayer({
        'id': 'doc_point',
        'type': 'circle',
        'source': 'docs',
        'source-layer': 'Kokkai_R4',
        'filter': ['in', filter_id, ["get", "speakers_list"]],
        'minzoom': 5,
        'layout': {
            'visibility': 'visible',
        },
       'paint': doc_paint
    });

    map.addLayer({
        'id': 'doc_grid',
        'type': 'fill',
        'source': {
            'type':'geojson',
            'data':gd,
        },
        'maxzoom': 15,
        'layout': {
            'visibility': 'visible',
        },
        'paint': {
            'fill-color': [
                'let',
                'density',
                ['get', grid_id],
                [
                    'interpolate',
                    ['linear'],
                    ['var', 'density'],
                    0,
                    ['to-color', 'transparent'], 
                    1,
                    ['to-color', '#d5eeb2'],
                    3,
                    ['to-color', '#b4dcb4'],
                    5,
                    ['to-color', '#ffffbf'],
                    7,
                    ['to-color', '#ffcedb'],
                    9,
                    ['to-color', '#ea633e']
                ]
            ],
        'fill-opacity': ['interpolate',['linear'],['zoom'],5,1,10,0.1],
        }
    });

    let fgb_src_gd = map.getSource('doc_grid');
    
    let loadFGB_gd = async (url, updateCount) => {
        const response = await fetch(url);
        let meta, iter = flatgeobuf.deserialize(response.body, null, m => meta = m)
        for await (let feature of iter) {
          gd.features.push(feature)
          if (gd.features.length == meta.featuresCount || (gd.features.length % updateCount) == 0) {
            fgb_src_gd.setData(gd);
          }
        }
      }
    loadFGB_gd('./app/grid.fgb', 512);

    map.addLayer({
        'id': 'area_label',
        'type': 'symbol',
        'source': {'type':'geojson', 'data': './app/label.geojson'},
        'maxzoom':9.5,
        'layout': {
            'icon-image': '',
            'visibility': 'visible',
            'text-field': '{label}',
            'text-font': ["Noto Sans Regular"],
            'text-size': 12,
            'text-offset': [0, 0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false
        },
        'paint':{
            'text-color': '#111',
            'text-halo-color': '#fff',
            'text-halo-width': 1
        }
    });
    map.addLayer({
        'id':'doc_label',
        'type':'symbol',
        'source':'docs',
        'source-layer': 'Kokkai_R4',
        'filter': ['in', filter_id, ["get", "speakers_list"]],
        'minzoom':9,
        'layout':{
            'icon-image':'',
            'visibility': 'visible',
            'text-field': '{keywords}',
            'text-font': ["Noto Sans Regular"],
            'text-size': 11,
            'text-offset': [0, 0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false
        },
        'paint':{
            'text-color': '#555'
        }
    });
});

const partyLength = partyNames.length;
for (let i = 0; i < partyLength; i++) {
    const selectParty = document.getElementById('party-id');
    const optionName = document.createElement('option');
    optionName.value = partyNames[i];
    optionName.textContent = partyNames[i];
    selectParty.appendChild(optionName);
}

const selectedParty = document.querySelector('.party-select');

selectedParty.addEventListener('change', function(){
    targetParty = selectedParty.selectedIndex;
    filter_id = (targetParty === 0 ? '' : partyNames[targetParty]);
    grid_id = gridNames[targetParty];
    map.setFilter('doc_label', ['in', filter_id, ["get", "speakers_list"]]);
    map.setFilter('doc_point', ['in', filter_id, ["get", "speakers_list"]]);
    map.setPaintProperty('doc_grid', 'fill-color', ['let','density',['get', grid_id],['interpolate',['linear'],['var', 'density'],0,['to-color', 'transparent'],1,['to-color', '#d5eeb2'],3,['to-color', '#b4dcb4'],5,['to-color', '#ffffbf'],7,['to-color', '#ffcedb'],9,['to-color', '#ea633e']]]);
});

map.on('click', 'doc_point', function (e){
    let query_point = map.queryRenderedFeatures(e.point, { layers: ['doc_point']})[0] !== undefined ? map.queryRenderedFeatures(e.point, { layers: ['doc_point']})[0].properties : "no-layer";
    let popupContent;
    let zoomSet = map.getZoom() + 1;
    if (query_point !==  "no-layer") {
        popupContent = '<p class="tipstyle02">' + query_point['date_text'] + '、' + query_point['speakers_list'] + 'の「<span class="style01">' + query_point['keywords'] + '</span>」についての議論<br><a href="https://kokkai.ndl.go.jp/txt/' + query_point['url_flag'] + '" target="_blank">会議録を見る（リンク先より'+ query_point["size"] +'発言が対象）</a></p>'
        new maplibregl.Popup({closeButton:true, focusAfterOpen:false, anchor:"bottom", offset:[0,-5], className:"t-popup", maxWidth:"280px"})
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
    } else if (zoomSet < 10) {
        //map.flyTo({center: e.lngLat, zoom: zoomSet, speed: 0.2});
        map.flyTo({center: e.lngLat, zoom: 9.5, speed: 0.4});
    } else {
        map.panTo(e.lngLat,{duration: 1000});
    }
});
