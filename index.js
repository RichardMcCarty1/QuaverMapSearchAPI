var express = require('express')
var cors = require('cors')
const { readFile, writeFile, constants } = require('fs')
var app = express()

const mapsets = 'mapsets.json';
const maps = 'maps.json';

const polling = false;

app.use(cors())

const getMapsetFile = (res, data) => {
    if (data.status == 200) {
        readFile(mapsets, (err, fileData) => {
            if (!err) {
                const fileMapsets = JSON.parse(fileData.toString('utf8'));
                if (fileMapsets.length != data.mapsets.length && !polling) { // Need to update maps
                    polling = true
                    writeMapsetFile(data, async () => {
                        let neededMaps = data.mapsets.filter(x => !fileMapsets.includes(x));
                        if (neededMaps.length) {
                            const newMapData = await getNewMaps(neededMaps);
                            readMapFile((err, mapData) => {
                                if (!err) {
                                    writeMapFile(newMapData, () => {
                                        polling = false;
                                        res.json(newMapData.concat(mapData));
                                    });
                                } else {
                                    polling = false;
                                    res.json("Error updating map file");
                                }
                            })
                        } else {
                            readMapFile((err, mapData) => {
                                if (!err) {
                                    polling = false;
                                    res.json(JSON.parse(mapData.toString('utf8')));
                                } else {    
                                    polling = false;
                                    res.json("Error retrieving map file");
                                }
                            })
                        }
                    });
                } else { //Maps are fully updated
                    getStoredMapData(res, data.mapsets);
                }
            } else {
                writeMapsetFile(data, () => {
                    res.json("No mapset file found. Wrote new mapset file.");
                });
                
            }   
        })
    } else {
        res.json("An error occurred retrieving the mapsets");
    }
}

const readMapFile = (callback) => {
    readFile(maps, callback);
}

const writeMapsetFile = (data, callback) => {
    writeFile(mapsets, JSON.stringify(data.mapsets), 'utf8', callback)
}

const writeMapFile = (data, callback) => {
    writeFile(maps, JSON.stringify(data), 'utf8', callback);
}

const getStoredMapData = async (res, mapsetData) => {
    readFile(maps, async (err, fileData) => {
        if (!err) {
            const mapData = JSON.parse(fileData.toString('utf8'));
            res.json(mapData);
        } else { // Need to retrieve and  write the map file
            let mapArr = await getNewMaps(mapsetData);
            writeMapFile(mapArr, () => {
                res.json(mapArr);
            });
        }
    })
}

const getNewMaps = async (mapsetData) => {
    let mapArr = [];
    for (let mapsetId of mapsetData) {
        const mapData = await fetchMapData(mapsetId);
        mapArr.push(mapData);
    }
    return mapArr;
}

const fetchMapData = async (mapsetId) => {
    const response = await fetch(`https://api.quavergame.com/v1/mapsets/${mapsetId}`);
    const d = await response.json();
    return d.mapset;
}

app.get('/maps', function (req, res, next) {
    fetch('https://api.quavergame.com/v1/mapsets/ranked').then(resp => resp.json().then(data => {
        getMapsetFile(res, data);
    }))
})

app.listen(5000, function () {
    console.log('CORS-enabled web server listening on port 5000')
})