$(function(){

    $('#time-grid').on('click', 'button', function(ev) {
        var timeSlot = $(ev.target).data('timeSlot');
        timeSlot.selected = !timeSlot.selected;

        if(timeSlot.selected){
            $(ev.target).addClass('positive');
        } else {
            $(ev.target).removeClass('positive');
        }
    });

    var timeSlots = [];

    for (let i = 0; i < 96; i++) {
        timeSlots.push({
            startMinute: i * 15,
            endMinute: (i + 1) * 15,
            timeOfDay: moment().startOf('day').add(i * 15, 'minutes'),
            selected: false,
        });
    }

    timeSlots.forEach(t => {
        $(`<button type="button" class="ui small ${t.selected ? "positive" : ""} button">${t.timeOfDay.format('HH:mm')}</button>`).appendTo('#time-grid').data('timeSlot', t);
    });

    
});