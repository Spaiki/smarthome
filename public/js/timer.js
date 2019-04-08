$(function() {

    const urlParams = new URLSearchParams(window.location.search);
    const timerId = urlParams.get('id');
    const socket = io();

    $('#hour-field').dropdown();
    $('#minute-field').dropdown();
    $('#scene-field').dropdown();
    $('#save-button').click(() => {

        let name = $('#name-field').val();
        let minute = $('#minute-field').dropdown('get value');
        let hour = $('#hour-field').dropdown('get value');
        let sceneId = $('#scene-field').dropdown('get value');

        socket.emit('controller save', {
            id: timerId,
            name: name,
            sceneId: sceneId,
            hour: hour,
            minute: minute,
            type: 'timer'
        });

        history.back();
    });
});