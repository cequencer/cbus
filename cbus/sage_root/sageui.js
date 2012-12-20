/*
 * sageui.js - UI controller for sage jquerymobile client
 * Copyright 2012 Michael Farrell <micolous+git@gmail.com>
 *
 * This library is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library.  If not, see <http://www.gnu.org/licenses/>.
 */


var sage = null;
var project = null;

function wireEvents() {
	$('[data-widget-type=switch]').on('change', function(e) {
		if ($(this).hasClass('suspended')) return;
		if (this.value == 0) {
			sage.lightingGroupOff([this.dataset.groupAddress]);
			setLevel(this.dataset.groupAddress, 0);
		} else {
			sage.lightingGroupOn([this.dataset.groupAddress]);
			setLevel(this.dataset.groupAddress, 1);
		}
	});
	
	$('[data-widget-type=slider]').on('change', function(e) {
		if ($(this).hasClass('suspended')) return;
		
		oldtimer = $(this).data('timer');
		if (oldtimer != null) {
			clearTimeout(oldtimer);
			$(this).data('timer', null);
		}
		
		$(this).data('timer', setTimeout('setLevel(' + this.dataset.groupAddress + ',' + (this.value/100) + ');sage.lightingGroupRamp(' + this.dataset.groupAddress + ', 0, ' + (this.value / 100) + ');$(this).data(\'timer\', null);', 500));
	});
}

$('#pgMain').live('pageinit', function(evt) {
	$.mobile.loading('show', {text: 'Connecting to server...', textVisible: true});
	
	// load up project definition
	project_req = $.ajax('./project.json', { async: false });

	project = JSON.parse(project_req.responseText);
	
	// now iterate through groups and set them up in the UI
	$('#locations').empty().trigger('destroy');
	$.each(project.locations, function(k, v) {
		$('#locations').append(
			$('<button>')
				.text(v)
				.attr('data-location-id', k)
				.data('location-id', k)
				.on('click', function() { changeLocation($(this).data('location-id')); })
			
		)
	});
	
	$('#locations').trigger('create');
	
	

	// do some websockets connection here.
	var first_connect = true;
	sage = new SageClient(project.saged);
	sage.onConnect = function() {
		$.mobile.loading('hide');
		if (first_connect) {
			changeLocation(0);
			first_connect = false;
		} else {
			// update lights from while we were gone
			sage.getLightStates(Object.keys(project.widgets));
		}
	};
	
	sage.onLightingGroupOff = function (src, ga) {
		setLevel(ga, 0);
	};
	
	sage.onLightingGroupOn = function (src, ga) {
		setLevel(ga, 1);
	};
	
	sage.onLightingGroupRamp = function (src, ga, duration, level) {
		setLevel(ga, level);
	};
	
	sage.onLightStates = function(states) {
		$.each(states, function(k, v) {
			setLevel(k, v);
		});
	};
	
	sage.onDisconnect = function (e) {
		$.mobile.loading('show', {text: 'Reconnecting...', textVisible: true});
		console.log('Connection failed (' + e.code + '), reconnecting...');
		setTimeout('sage.connect()', 1000);
	}
	
	sage.connect();
});


function changeLocation(location_id) {
	location_id = parseInt(location_id);
	console.log('changing to location ' + location_id);
	// clear old fields
	$('#switchContainer').empty();
	
	// populate fields
	$.each(project.widgets, function(k, v) {
		if (v.locations.indexOf(location_id) >= 0) {
			// this is a location for me, populate!
			fieldcontainer = $('<div data-role="fieldcontain">');
			
			// add label
			fieldcontainer.append($('<label for="w' + k + '">').text(v.name));
			
			// add widget
			if (v.type == 'slider') {
				fieldcontainer.append($('<input type="range">')
					.attr('name', 'w' + k)
					.attr('id', 'w' + k)
					.attr('data-highlight', 'true')
					.attr('data-group-address', k)
					.attr('data-widget-type', 'slider')
					.attr('value', '0')
					.attr('min', '0')
					.attr('max', '100')
				);
			
			} else if (v.type == 'switch') {
				fieldcontainer.append($('<select>')
					.attr('data-role', 'slider')
					.attr('data-group-address', k)
					.attr('data-widget-type', 'switch')
					.attr('id', 'w' + k)
					.attr('name', 'w' + k)
					.append(
						$('<option>').attr('value', 0).text('Off'),
						$('<option>').attr('value', 1).text('On')
					)
				);
			} else if (v.type == 'switch_slider') {
				var slider = 
					
				fieldcontainer.append($('<select>')
					.attr('data-role', 'slider')
					.attr('data-group-address', k)
					.attr('data-widget-type', 'switch')
					.attr('id', 'w' + k)
					.attr('name', 'w' + k)
					.append(
						$('<option>').attr('value', 0).text('Off'),
						$('<option>').attr('value', 1).text('On')
					)
				).append($('<input type="range">')
					.attr('name', 'w' + k)
					.attr('id', 'w' + k)
					.attr('data-highlight', 'true')
					.attr('data-group-address', k)
					.attr('data-widget-type', 'slider')
					.attr('value', '0')
					.attr('min', '0')
					.attr('max', '100')
				);
			
			} else {
				console.log('unknown widget type ' + v.type + '!');
			}
			
			
			
			$('#switchContainer').append(fieldcontainer);
		}
	});
	
	// get current lighting state from server
	sage.getLightStates(Object.keys(project.widgets));
	
	// change footer bar
	$('#locations ul li').removeClass('ui-btn-active');
	$('#locations ul li[data-location-id=' + location_id + ']').addClass('ui-btn-active');
	//$('#locations ul li').button('refresh');
	
	$('#switchContainer').trigger('create');
	wireEvents();
}

function setLevel(ga, level) {
	ga = parseInt(ga);
	
	// stop updates first
	$('[data-group-address=' + ga + ']').each(function(i, d) {
		$(this).addClass('suspended');
	});

	$('[data-group-address=' + ga + '][data-widget-type=slider]').each(function(i, d) {
		// is a slider
		this.value = level * 100;
		$(this).slider('refresh');
	
	});

	$('[data-group-address=' + ga + '][data-widget-type=switch]').each(function(i, d) {
		// is a switch	
		this.selectedIndex = (level > 0) ? 1 : 0;
		$(this).slider('refresh');
	
	});
	
	// resume updates
	$('[data-group-address=' + ga + ']').each(function(i, d) {
		$(this).removeClass('suspended');
	});
}

