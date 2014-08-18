function initUI() {
	canvas.onmousedown = function mouseDown(e) {
		drag.is = true;

		drag.from = drag.to = coordinates(e);

		render();
	};
	canvas.onmouseup = function mouseUp(e) {
		if (!drag.is) return;

		drag.is = false;
		
		drag.to = coordinates(e);

		drag.to.x = (drag.to.x - drag.from.x) / arrowLengthRatio;
		drag.to.y = (drag.to.y - drag.from.y) / arrowLengthRatio;
	
		drag.v = { x: drag.to.x, y: drag.to.y };

		drag.to.x += drag.from.x;
		drag.to.y += drag.from.y;

		addBody(drag);

		render();
	};
	canvas.onmousemove = function mouseMove(e) {
		if (!drag.is) return;

		drag.to = coordinates(e);
		drag.to.x = (drag.to.x - drag.from.x) / arrowLengthRatio + drag.x;
		drag.to.y = (drag.to.y - drag.from.y) / arrowLengthRatio + drag.y;

		render();
	};

	setDT(-2);
}

function coordinates(e) {
	return e.offsetX ? {x: e.offsetX, y: e.offsetY } :
	       e.layerX  ? {x: e.layerX, y: e.layerY } :
	                   {}
}

var drag = { is: false, m: (m.min + m.max) / 2 };

// Update mass by arrow keys while dragging
window.addEventListener('keydown', doKeyDown, true);
var MASS_STEP = (m.max - m.min) / 10;
function doKeyDown(evt){
	switch (evt.keyCode) {
		case 69:  /* e was pressed */
			if (drag.is && drag.m + MASS_STEP <= m.max){
				drag.m += MASS_STEP;
			}
			break;
		case 68:  /* d key was pressed */
			if (drag.is && drag.m-MASS_STEP >= m.min){
				drag.m -= MASS_STEP;
			}
			break;
		case 80:  /* p key was pressed */
			if (sysRunning){ pauseSys(); } 
			else { startSys(); }
			break;
		case 83:  /* s key was pressed */
			step();
			break;
		// case 37:  /* Left arrow was pressed */
		// 	if (x - dx > 0){
		// 		x -= dx;
		// 	}
		// 	break;
		// case 39:  /* Right arrow was pressed */
		// 	if (x + dx < WIDTH){
		// 		x += dx;
		// 	}
		// 	break;
	}
}
function setDT(v) {
	document.getElementById('dtSliderVal').innerHTML = (dt = Math.pow(10, v)).toFixed(4);
}

function toggleArrows() {
	options.rendering.arrows = !options.rendering.arrows;
	render();
}

function toggleShowBNtree() {
	options.rendering.tree = !options.rendering.tree;
	render();
}

function resetSys() {
	bodies = [];
	T = 0;
	render();
	sysRunning = false;
}
