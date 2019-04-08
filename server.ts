'use strict';
import express = require('express');
import fs = require('fs');
import http = require('http');
import socketIo = require('socket.io');
import Zwave = require("openzwave-shared");
import moment = require('moment');
import sqlite = require('better-sqlite3');
import cron = require('node-cron');
import exphbs  = require('express-handlebars');

const db = sqlite('smarthome.sqlite');

setupDatabase();

const app = express();
const server = new http.Server(app);
const io = socketIo(server);

let logger = {
    log: function(msg: string, level: string) {
        console.log(`${moment().format('YYYYMMDD HH:mm:ss')} - ${level}: ${msg}`);
    },
    info: function(msg: string) {
        this.log(msg, 'Info');
    }
};

const port = process.env.PORT || 1337;
const comPort = process.env.ZWAVEPORT || '\\\\.\\COM7';
const BINARY_SWITCH = 37;

const classNames : { [key in number]: string } = {};
classNames[0]='No Operation';
classNames[32]='Basic';
classNames[33]='Controller Replication';
classNames[34]='Application Status';
classNames[35]='Zip Services';
classNames[36]='Zip Server';
classNames[37]='Switch Binary';
classNames[38]='Switch Multilevel';
classNames[38]='Switch Multilevel V2';
classNames[39]='Switch All';
classNames[40]='Switch Toggle Binary';
classNames[41]='Switch Toggle Multilevel';
classNames[42]='Chimney Fan';
classNames[43]='Scene Activation';
classNames[44]='Scene Actuator Conf';
classNames[45]='Scene Controller Conf';
classNames[46]='Zip Client';
classNames[47]='Zip Adv Services';
classNames[48]='Sensor Binary';
classNames[49]='Sensor Multilevel';
classNames[49]='Sensor Multilevel V2';
classNames[50]='Meter';
classNames[51]='Zip Adv Server';
classNames[52]='Zip Adv Client';
classNames[53]='Meter Pulse';
classNames[60]='Meter Tbl Config';
classNames[61]='Meter Tbl Monitor';
classNames[62]='Meter Tbl Push';
classNames[56]='Thermostat Heating';
classNames[64]='Thermostat Mode';
classNames[66]='Thermostat Operating State';
classNames[67]='Thermostat Setpoint';
classNames[68]='Thermostat Fan Mode';
classNames[69]='Thermostat Fan State';
classNames[70]='Climate Control Schedule';
classNames[71]='Thermostat Setback';
classNames[76]='Door Lock Logging';
classNames[78]='Schedule Entry Lock';
classNames[80]='Basic Window Covering';
classNames[81]='Mtp Window Covering';
classNames[89]='Association Grp Info';
classNames[90]='Device Reset Locally';
classNames[91]='Central Scene';
classNames[92]='Ip Association';
classNames[93]='Antitheft';
classNames[94]='Zwaveplus Info';
classNames[96]='Multi Channel V2';
classNames[96]='Multi Instance';
classNames[98]='Door Lock';
classNames[99]='User Code';
classNames[102]='Barrier Operator';
classNames[112]='Configuration';
classNames[112]='Configuration V2';
classNames[113]='Alarm';
classNames[114]='Manufacturer Specific';
classNames[115]='Powerlevel';
classNames[117]='Protection';
classNames[117]='Protection V2';
classNames[118]='Lock';
classNames[119]='Node Naming';
classNames[122]='Firmware Update Md';
classNames[123]='Grouping Name';
classNames[124]='Remote Association Activate';
classNames[125]='Remote Association';
classNames[128]='Battery';
classNames[129]='Clock';
classNames[130]='Hail';
classNames[132]='Wake Up';
classNames[132]='Wake Up V2';
classNames[133]='Association';
classNames[133]='Association V2';
classNames[134]='Version';
classNames[135]='Indicator';
classNames[136]='Proprietary';
classNames[137]='Language';
classNames[138]='Time';
classNames[139]='Time Parameters';
classNames[140]='Geographic Location';
classNames[141]='Composite';
classNames[142]='Multi Channel Association V2';
classNames[142]='Multi Instance Association';
classNames[143]='Multi Cmd';
classNames[144]='Energy Production';
classNames[145]='Manufacturer Proprietary';
classNames[146]='Screen Md';
classNames[146]='Screen Md V2';
classNames[147]='Screen Attributes';
classNames[147]='Screen Attributes V2';
classNames[148]='Simple Av Control';
classNames[149]='Av Content Directory Md';
classNames[150]='Av Renderer Status';
classNames[151]='Av Content Search Md';
classNames[152]='Security';
classNames[153]='Av Tagging Md';
classNames[154]='Ip Configuration';
classNames[155]='Association Command Configuration';
classNames[156]='Sensor Alarm';
classNames[157]='Silence Alarm';
classNames[158]='Sensor Configuration';
classNames[239]='Mark';
classNames[240]='Non Interoperable';



const nodes : { [key in number]: DeviceInfo } = {};

const timerTasks : { [key in number]: cron.ScheduledTask } = {};


interface DeviceInfo {
    nodeId: number;
    manufacturer: string;
    manufacturerId: string;
    product: string;
    productType: string;
    productId: string;
    type: string;
    name: string;
    location: string;
    ready: boolean;
    isSwitch: boolean;
    isSwitchOn: boolean;
    classes: { [key in number] : { [key in number] : Value } }
}

interface Value extends Zwave.Value {
    class_name: string;
    node_name: string;
}

const zwave = new Zwave({
    Logging: true,
    ConsoleOutput: true,
    SaveConfiguration: true,
    UserPath: 'config'
});

zwave.on('driver ready', function (homeid) {
    logger.info(`Scanning homeid=0x${homeid.toString(16)}...`);
});

zwave.on('driver failed', function () {
    logger.info('Failed to start driver');
    zwave.disconnect(comPort);
    process.exit();
});

zwave.on('node added', function (nodeid) {
    let node = {
        nodeId: nodeid,
        manufacturer: '',
        manufacturerId: '',
        product: '',
        productType: '',
        productId: '',
        type: '',
        name: `Ny enhet #${nodeid}`,
        location: '',
        classes: {},
        ready: false,
        isSwitch: false,
        isSwitchOn: false
    };

    const result = db.prepare('INSERT OR IGNORE INTO node (id, [name]) VALUES (?, ?)')
        .run(nodeid, node.name);

    if(result.changes === 0) {
        const nodeName = db.prepare('SELECT name FROM node WHERE id = ?')
            .get(nodeid);
        node.name = nodeName.name;
    }

    nodes[nodeid] = node;
});

zwave.on('node removed', function (nodeid) {
    if (nodes[nodeid]) {
        delete nodes[nodeid];
    }

    io.emit('node list', nodes);
});

zwave.on('value added', function (nodeid, comclass, value : Value) {

    value.class_name = classNames[comclass];

    let node = nodes[nodeid];
    let classes = node.classes;

    if (!classes[comclass]) {
        classes[comclass] = {};
    }

    classes[comclass][value.index] = value;

    if (comclass === BINARY_SWITCH) {
        node.isSwitch = true;
    }
});

zwave.on('value changed', function (nodeid, comclass, value : Value) {

    value.class_name = classNames[comclass];

    let node = nodes[nodeid];
    node.classes[comclass][value.index] = value;

    if (comclass === BINARY_SWITCH && typeof value.value === 'boolean') {
        node.isSwitchOn = value.value;
    }

    io.emit('node value', node);
});

zwave.on('value removed', function (nodeid, comclass, index) {
    let node = nodes[nodeid];
    let classes = node.classes;

    if (classes[comclass] &&
        classes[comclass][index])
        delete classes[comclass][index];
});

zwave.on('node ready', function (nodeid, nodeinfo) {
    let node = nodes[nodeid];

    node.manufacturer = nodeinfo.manufacturer;
    node.manufacturerId = nodeinfo.manufacturerid;
    node.product = nodeinfo.product;
    node.productType = nodeinfo.producttype;
    node.productId = nodeinfo.productid;
    node.type = nodeinfo.type;
    node.location = nodeinfo.loc;
    node.ready = true;

    let manufacturer = nodeinfo.manufacturer || 'id=' + nodeinfo.manufacturerid;
    let product = nodeinfo.product ? nodeinfo.product: 'product=' + nodeinfo.productid +', type=' + nodeinfo.producttype;

    logger.info(`Node ready ${nodeid} ${manufacturer} ${product}`);

    io.emit('node list', nodes);
});

zwave.on('notification', function (nodeid, notification) {

});

zwave.on('scan complete', function () {
    logger.info('Scan Complete');
    var result = zwave.getNodeNeighbors(2);
});

app.use(express.static('public'));
app.use('/lib', express.static('node_modules'));
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

app.get('/timer', (req, res) => {

    let timer = getTimer(req.query.id);

    const hours = [];

    for(var hour = 0; hour < 24; hour++) {
        hours.push({
            name: hour < 10 ? '0' + hour : '' + hour,
            value: hour,
            selected: hour === 12
        });
    }

    const minutes = [];

    for(var minute = 0; minute < 59; minute++) {
        minutes.push({
            name: minute < 10 ? '0' + minute : '' + minute,
            value: minute,
            selected: minute === 0
        });
    }

    const scenes = getScenes().map((scene) => {
        return {
            name: scene.name,
            value: scene.id
        };
    });

    res.render('timer', {
        scripts: ['/js/timer.js'],
        styles: ['/css/timer.css'],
        timer: timer,
        hours: hours,
        minutes: minutes,
        scenes: scenes
    });
});

app.get('/device', (req, res) => {
    res.render('device', {
        scripts: ['/js/device.js'],
        styles: ['/css/device.css']
    });
});

app.get('/scene', (req, res) => {
    res.render('scene', {
        scripts: ['/js/scene.js'],
        styles: ['/css/scene.css']
    });
});

app.get('/', (req, res) => {
    res.render('index', {
        scripts: ['/js/index.js'],
        styles: ['/css/timer.css']
    });
});

server.listen(port, () => {
    console.log(`listening on port ${port}...`);
});

io.on('connection', function (socket) {

    socket.on('set switch', function (msg) {
        zwave.setValue(msg.nodeId, 37, 1, 0, msg.value);
    });

    socket.on('set value', function (msg) {
        zwave.setValue(msg.nodeId, msg.classId, msg.instance, msg.index, msg.value);
    });

    socket.on('node name', function(msg) {
        let node = nodes[msg.nodeId];
        if(node) {
            db.prepare('UPDATE node SET [name] = ? WHERE id = ?')
                .run(msg.name, msg.nodeId);
            node.name = msg.name;
        }
    });

    socket.on('node add', function(msg){
        zwave.addNode();
    });

    socket.on('scene activate', function(msg){

        activateScene(msg.sceneId);
    });

    socket.on('scene remove', function(msg) {
        zwave.removeScene(msg.sceneId);
        zwave.writeConfig();
        var scenes = zwave.getScenes();
        socket.emit('scene list', scenes);
    });

    socket.on('scene request', function(msg) {
        const scene = getScene(msg.sceneId);
        socket.emit('scene changed', scene);
    });

    socket.on('scene value list', function(msg) {
        var values = [];

        for(var nodeId in nodes){
            var node = nodes[nodeId];
            for(var classId in node.classes){
                var classItem = node.classes[classId];
                for(var index in classItem){
                    var value = classItem[index];
                    if(value.genre == 'user' && !value.read_only) {
                        value.node_name = node.name || node.product;
                        values.push(value);
                    }
                }
            }
        }

        socket.emit('scene value list', values);
    });

    socket.on('scene create', function(msg) {

        const result = db.prepare('INSERT INTO scene (name) VALUES (?)')
            .run(msg.name);

        socket.emit('scene created', { sceneId: result.lastInsertRowid });
    });

    socket.on('scene list', function(msg) {
        socket.emit('scene list', getScenes());
    });

    socket.on('node list', function(msg){
        socket.emit('node list', nodes);
    });

    socket.on('controller list', (msg) => {
        const controllers = getControllers();
        socket.emit('controller list', controllers);
    });

    socket.on('controller save', (msg) => {

        switch(msg.type) {
            case 'timer':
                
                if(!msg.minute){
                    msg.minute = 0;
                }

                db.prepare(`
                    UPDATE timer
                    SET 
                        name = ?,
                        scene_id = ?,
                        hour = ?,
                        minute = ?
                    WHERE id = ?
                `).run(msg.name, msg.sceneId, msg.hour, msg.minute, msg.id);

                scheduleTimer(msg.id);

                break;
        }
    });

    socket.on('controller create', (msg) => {

        switch(msg.type) {
            case 'timer':
                const result = db.prepare('INSERT INTO timer (name) VALUES (?)')
                    .run(msg.name);

                socket.emit('controller created', {
                    url: `timer?id=${result.lastInsertRowid}`
                });
                break;
        }
    });

    socket.on('scene value add', function(msg){
        try {

            if(typeof msg.value === 'boolean') {
                msg.value = msg.value ? 1 : 0;
            }

            db.prepare(`
            INSERT INTO scene_value (
                scene_id,
                node_id,
                class_id,
                instance,
                [index],
                value)
            VALUES (?, ?, ?, ?, ?, ?)`).run(
                msg.sceneId,
                msg.nodeId,
                msg.classId,
                msg.instance,
                msg.index,
                msg.value
            );

            const scene = getScene(msg.sceneId);
            io.emit('scene changed', scene);
        } catch(err) {
            console.log(err.stack || err);
        }
    });

    socket.on('scene value remove', function(msg) {
        db.prepare(`
            DELETE FROM scene_value
            WHERE scene_id = ? AND node_id = ? AND class_id = ? AND instance = ? AND [index] = ?
        `).run(
            msg.sceneId,
            msg.nodeId,
            msg.classId,
            msg.instance,
            msg.index
        );

        const scene = getScene(msg.sceneId);
        io.emit('scene changed', scene);
    });

    socket.on('node get', function(msg) {
        socket.emit('node get', nodes[msg.nodeId]);
    });
});

zwave.on('controller command', function(nodeId, ctrlState, ctrlError, helpmsg) {
    logger.info(`Node${nodeId} ${ ctrlState } ${ctrlError} ${helpmsg}`);
});

zwave.connect(comPort);

startup();

interface Timer {
    id: number;
    scene_id: number;
    name: string;
    cron: string;
}

function startup() {
    const timers = getTimers();
    for(let timer of timers) {
        scheduleTimer(timer.id);
    }
}

function scheduleTimer(id: number) {

    let task = timerTasks[id];
    if(task) {
        task.destroy();
        delete timerTasks[id];
    }

    var timer = db.prepare(`
        SELECT
            scene_id,
            hour,
            minute
        FROM timer
        WHERE id = ?
    `).get(id);

    if(timer.scene_id && timer.hour && timer.minute) {
        const cronDefintion = `${timer.minute} ${timer.hour} * * *`;
        timerTasks[id] = cron.schedule(cronDefintion, () => {
            activateScene(timer.scene_id);
        });
    }
}

function getTimers() : Timer[] {
    return db.prepare(`
        SELECT
            id,
            scene_id,
            [name],
            hour,
            minute
        FROM timer
    `).all();
}

function getTimer(id: number) : Timer {
    return db.prepare(`
        SELECT
            id,
            scene_id,
            [name],
            hour,
            minute
        FROM timer
        WHERE id = ?
    `).get(id);
}

interface Scene {
    id: number;
    name: string;
    values: Value[];
}

function getScenes() : Scene[] {
    return db.prepare('SELECT id, [name] FROM scene')
            .all();
}

function getScene(sceneId: number) : Scene {
    const scene = db.prepare(`
        SELECT
            id,
            name
        FROM scene
        WHERE id = ?
    `).get(sceneId);

    const values : Value[] = db.prepare(`
        SELECT
            scene_value.scene_id,
            scene_value.node_id,
            scene_value.class_id,
            scene_value.instance,
            scene_value.[index],
            scene_value.[value],
            node.name as node_name
        FROM scene_value
        INNER JOIN node ON node.id = scene_value.node_id
        WHERE scene_value.scene_id = ?`).all(sceneId);

    for(let value of values) {
        value.class_name = classNames[value.class_id];
    }

    scene.values = values;
    return scene;
}

function getControllers() {
    return db.prepare(`
        SELECT
            timer.id,
            timer.scene_id,
            timer.name,
            'timer?id=' || timer.id as url
        FROM timer
    `).all();
}

function activateScene(sceneId: number) {
    const scene = getScene(sceneId);

    for(let value of scene.values) {
        zwave.setValue(value, value.value);
    }
}

function setupDatabase() {
    let version = db.pragma('user_version')[0].user_version;

    if(version === 0) {
        db.exec(fs.readFileSync('database_migrations/init.sql', 'utf8'));
        db.pragma('user_version=1');
        version++;
    }
}

