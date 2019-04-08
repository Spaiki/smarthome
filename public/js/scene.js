$(function(){

    var urlParams = new URLSearchParams(window.location.search);
    var sceneId = urlParams.get('id');

    var socket = io();

    var valueDictionary = {};

    socket.on('scene changed', function(scene){
        $('#name-field').text(scene.name);
        renderValueItems(scene.values);
    });

    socket.on('scene value list', function(values){
        $('#value-select').empty();

        console.log(values);
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            valueDictionary[value.value_id] = value;
            $(`<option value="${value.value_id}">${value.node_name} - ${ value.label }${ value.index > 0 ? "#" + value.index : "" }</option>`)
                .appendTo('#value-select');
        }

        renderValueInput();
    });

    $('#value-select').change(function(){
        renderValueInput();
    });

    socket.emit('scene value list');
    socket.emit('scene request', { sceneId: sceneId});

    $('#name-field').change(function(){
        socket.emit('scene')
    });

    $('#add-value-btn').click(function() {
        $('#add-value-modal').modal({
            onApprove: function(){

                var model = valueDictionary[$('#value-select').val()];

                let setValueMsg = { 
                    sceneId: sceneId,
                    nodeId: model.node_id, 
                    classId: model.class_id, 
                    instance: model.instance, 
                    index: model.index, 
                    value: model.value
                };

                socket.emit('scene value add', setValueMsg);
            }
        }).modal('show');
    });

    

    function renderValueItems(values) {
        var valueGrid = $('#value-grid');
        valueGrid.find('.ui.card').remove();

        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            let html = `
            
            <div class="ui card" style="width: unset;margin: 0px;">
                <div class="content">
                    <a class="header">${ value.node_name }</a>
                    <div class="meta">${ value.class_name }</div>
                    <div>${ value.value }</div>
                </div>
                <div class="extra content">
                    <div name="switch controll" class="right floated">
                        <button class="ui red button remove-button">Remove</button>
                    </div>
                </div>
            </div>`;

            $(html).insertBefore('.ui.placeholder.segment')
                .find('.remove-button').click(function(){
                    socket.emit('scene value remove', {
                        sceneId: sceneId,
                        nodeId: value.node_id, 
                        classId: value.class_id, 
                        instance: value.instance, 
                        index: value.index,
                        value: value.value
                    });
                });
        }
    }

    function renderValueInput() {

        var model = valueDictionary[$('#value-select').val()];

        var valueField = $('#value-field');
        valueField.empty();

        if(!model) {
            return;
        }

        let html = '';
        let disabled = model.read_only ? 'disabled' : '';
    
        switch(model.type) {
            case 'list':
                let options = model.values
                    .map(v => `<option class="item" ${ v === model.value ? "selected" : "" }>${ v }</option>`)
                    .join('');
                
                html = `<select class="ui ${ disabled } dropdown">${options}</select>`;
                break;
            case 'button':
                html = `<button type="button" class="ui button">${model.label}</button>`;
                break;
            case 'bool':
                html = `
                <div class="ui toggle checkbox">
                    <input type="checkbox" ${ model.value ? 'checked' : '' }>
                </div>`;
                break;
            default:
    
                if(model.units) {
                    html = `
                    <div class="ui ${ disabled } right labeled input">
                        <input value="${ model.value }"></input>
                        <div class="ui basic label">${model.units}</div>
                    </div>`;
                } else {
                    html = `
                    <div class="ui ${ disabled } input">
                        <input value="${ model.value }"></input>
                    </div>`;
                }
                break;
        }
    
        var view = $(`<div class="field"><label>Value</label>${html}</div>`).appendTo(valueField);
    
        switch(model.type){
            case 'bool':
                view.find('.ui.checkbox').checkbox({
                    onChecked: function() {
                        model.value = 1;
                    },
                    onUnchecked: function() {
                        model.value = 0;
                    }
                });
                break;
        }
    }

});