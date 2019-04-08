class DeviceItem {
    
    constructor(parent, model) {
        this.model = model;
        let template = document.getElementById("device-template");
        let clone = document.importNode(template.content, true);
        this.headerLabel = clone.querySelector(".header");
        this.secondaryHeaderLabel = clone.querySelector(".meta");
        this.descriptionLabel = clone.querySelector(".description");
        this.switchControllPanel = clone.querySelector("div[name='switch controll']");
        this.switchControllButton = clone.querySelector("button[name='switch controll button']");
        this.placeHolderPanel = clone.querySelector("div[name='placeholder panel']");
        this.mainPanel = clone.querySelector("div[name='main panel']");
        this.editLink = clone.querySelector('.edit-link');
        parent.insertBefore(clone, parent.childNodes[parent.childElementCount - 1]);
    }

    apply(model) {
        this.model = model;
        this.headerLabel.textContent = `${ model.name ? model.name : model.product }`;
        this.secondaryHeaderLabel.textContent = `#${ model.nodeId }, ${model.manufacturer}`;
        this.descriptionLabel.textContent = model.type;
        this.editLink.href = "/device?id=" + model.nodeId;


        if(model.isSwitch){
            this.switchControllPanel.style.visibility = "visible";
        } else {
            this.switchControllPanel.style.visibility = "hidden";
        }

        if(model.isSwitchOn){
            this.switchControllButton.classList.add("positive");
            this.switchControllButton.classList.remove("negative");
        } else {
            this.switchControllButton.classList.remove("positive");
            this.switchControllButton.classList.add("negative");
        }

        if(model.ready){
            this.mainPanel.style.display = "";
            this.placeHolderPanel.style.display = "none";
        } else {
            this.mainPanel.style.display = "none";
            this.placeHolderPanel.style.display = "";
        }
    }
}

$(function () {

    let devicePanel = $("#device-panel");
    let triggerPanel = $("#trigger-panel");
    let scenePanel = $("#scene-panel");

    let sceneGrid = $('#scene-grid');
    let controllerGrid = $('#trigger-grid');

    let deviceGrid = document.getElementById("device-grid");

    let deviceListItems = {};

    var devicesMenuItem = $("#devices-menu-item").click(() => {
        devicesMenuItem.addClass("active");
        triggersMenuItem.removeClass("active");
        sceneMenuItem.removeClass("active");

        devicePanel.show();
        triggerPanel.hide();
        scenePanel.hide();
    });

    var sceneMenuItem = $("#scene-menu-item").click(() => {
        devicesMenuItem.removeClass("active");
        triggersMenuItem.removeClass("active");
        sceneMenuItem.addClass("active");

        devicePanel.hide();
        triggerPanel.hide();
        scenePanel.show();
    });

    var triggersMenuItem = $("#triggers-menu-item").click(() => {
        devicesMenuItem.removeClass("active");
        triggersMenuItem.addClass("active");
        sceneMenuItem.removeClass("active");

        devicePanel.hide();
        triggerPanel.show();
        scenePanel.hide();
    });



    let addingScene = false;

    $('#add-new-scene-btn').click(() => {
        $('#create-scene-modal').modal({
            onApprove: function() {
                socket.emit('scene create', { name: $('#scene-label').val() });
            }
        }).modal('show');
    });

    $('#add-controller-btn').click(() => {
        $('#create-controller-modal').modal({
            onApprove: function() {
                socket.emit('controller create', { 
                    name: $('#controller-name').val(),
                    type: $('#controller-type').val()
                });
            }
        }).modal('show');
    });

    var socket = io();

    $('#add-new-device-btn').click(() => {
        socket.emit('node add', {});
    });

    socket.on('node list', function (devices) {

        for(let deviceId in devices) {
            let device = devices[deviceId];
            updateDevice(device);
        }
    });

    socket.on('controller list', (controllers) => {
        renderControllers(controllers);
    });

    socket.on('scene list', function(scenes) {
        renderScenes(scenes);
    });

    socket.on('node value', function(msg) {
        updateDevice(msg);
    });

    socket.on('scene created', function(msg){
        window.location.href = 'scene?id=' + msg.sceneId;
    });
    socket.on('controller created', function(msg) {
        window.location.href = msg.url;
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.emit('node list');
    socket.emit('scene list');
    socket.emit('controller list');

    function renderControllers(controllers) {
        controllerGrid.find('.ui.card').remove();
        controllers.forEach(renderController);
    }

    function renderController(controller) {
        let html = `
        <div class="ui card" style="width: unset;margin: 0px;">
            <div class="content">
                <a class="header">${controller.name}</a>
                <div class="meta">#${controller.id}</div>
                <div class="description"></div>
            </div>
            <div class="extra content">
                <div name="switch controll" class="right floated">
                    <button class="ui red button remove-controller-button">Remove</button>
                </div>
                <a href="${controller.url}" class="ui primary small button"><i class="edit icon"></i>Open</a>
            </div>
        </div>`;

        var view = $(html).insertBefore('#trigger-grid .ui.placeholder.segment');
        view.find('.remove-controller-button')
            .click(function() {
                socket.emit('controller remove', { controllerId: controller.id });
            });
    }

    function renderScenes(scenes){
        sceneGrid.find('.ui.card').remove();
        scenes.forEach(renderScene);
    }

    function renderScene(scene) {
        let html = `
        <div class="ui card" style="width: unset;margin: 0px;">
            <div class="content">
                <a class="header">${scene.name}</a>
                <div class="meta">#${scene.id}</div>
                <div class="description"></div>
            </div>
            <div class="extra content">
                <div name="switch controll" class="right floated">
                    <button class="ui red button remove-scene-button">Remove</button>
                    <button class="ui button activate-scene-button">Activate</button>
                </div>
                <a href="scene?id=${scene.id}" class="ui primary small button"><i class="edit icon"></i>Open</a>
            </div>
        </div>`;

        var view = $(html).insertBefore('#scene-grid .ui.placeholder.segment');
        view.find('.activate-scene-button')
            .click(function(){
                socket.emit('scene activate', { sceneId: scene.id });
            });
        view.find('.remove-scene-button')
            .click(function() {
                socket.emit('scene remove', { sceneId: scene.id });
            });
    }

    function updateDevice(device){
        let item = deviceListItems[device.nodeId];
        if(!item) {
            item = new DeviceItem(deviceGrid);
            item.switchControllButton.addEventListener('click', () => {
                socket.emit("set switch", {
                    nodeId: item.model.nodeId,
                    value: !item.model.isSwitchOn
                });
            });
            deviceListItems[device.nodeId] = item;
        }
        item.apply(device);
    }
});

