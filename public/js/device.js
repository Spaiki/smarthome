$(function() {

    var nameInput = $('#name-field').change(function(){
        socket.emit('node name', { nodeId: nodeId, name: nameInput.val() })
    });

    var urlParams = new URLSearchParams(window.location.search);

    var nodeId = urlParams.get('id');

    var socket = io();

    var valueGrid = $('#value-grid').masonry({
        columnWidth: 350,
        itemSelector: '.grid-item',
    });

    socket.on('node get', function(node) {
        $('#name-field').val(node.name).attr('placeholder', node.product);
        

        console.log(node);

        renderNode(node);
    });

    socket.on('node value', function(node){

        renderNode(node);
    });

    socket.emit('node get', { nodeId: nodeId });

    function renderNode(node) {
        valueGrid.masonry('destroy');
        $('#value-grid').empty();

        for(var classId in node.classes) {
            renderClass($('#value-grid'), classId, node.classes[classId]);
        }

        valueGrid = $('#value-grid').masonry({
            columnWidth: 350,
            itemSelector: '.grid-item',
        });
    }

    function renderClass(parent, classId, model) {

        let firstValue = null;
        for(let index in model){
            firstValue = model[index];
            break;
        }

        let html = `
        <div class="grid-item" style="width: 350px;">
            <div class="ui card" style="width: unset;margin: 5px;">
                <div class="content">
                    <a class="header">${ firstValue && firstValue.class_name } </a>
                    <div class="meta">#${ classId }</div>
                    <div class="value-list"></div>
                </div>
            </div>
        </div>
        `;

        let view = $(html).appendTo(parent);

        for(let index in model){
            let valueItem = model[index];
            renderValue(view.find('.value-list'), valueItem);
        }
    }

    function renderValue(parent, model) {

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
                    <input type="checkbox" name="public" ${ model.value ? 'checked' : '' }>
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

        var view = $(`<div class="field"><label>${model.label}</label>${html}</div>`).appendTo(parent);

        let setValueMsg = { 
            nodeId: model.node_id, 
            classId: model.class_id, 
            instance: model.instance, 
            index: model.index, 
            value: 1 
        };

        switch(model.type){
            case 'bool':
                view.find('.ui.checkbox').checkbox({
                    onChecked: function() {
                        setValueMsg.value = 1;
                        socket.emit('set value', setValueMsg);
                    },
                    onUnchecked: function() {
                        setValueMsg.value = 0;
                        socket.emit('set value', setValueMsg);
                    }
                });
                break;
        }
    }
});