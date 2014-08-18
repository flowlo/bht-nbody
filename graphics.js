// Arrow Length Multipliers
arrowLengthRatio = 2;
ARROWHEADSIZE = 5;

var displayStepTime;

// var recording = [];

var output = {
	bodies: undefined,
	depth: undefined,
	checks: undefined,
	leaves: undefined,
	nodes: undefined,
	brute: undefined,
	speedup: undefined,
	step: undefined,
	display: undefined
};

function initGraphics(){
	timeDisp = document.getElementById('timeDisp');

	for (var id in output)
		output[id] = document.getElementById(id);
		
	canvas.width = window.innerWidth - 20;
	canvas.height = window.innerHeight / 1.3;

	options.tree.width = canvas.width;
	options.tree.height = canvas.height;
}

function drawBNnode(node, depth) {
	if (!node.box) return;

	drawBox(node.box);

	for (var i = 0; i < 4; i++)
		if (node.elements[i]) drawBNnode(node.elements[i], depth + 1);
}

function updateData(stats) {
	timeDisp.value = T.toFixed(2); // Update time output form

	output.bodies.value = bodies.length;
	output.checks.value = stats.checks;
	output.depth.value = stats.depth;
	output.nodes.value = stats.nodes;
	output.leaves.value = stats.leaves;
	output.brute.value = bruteHalfChecks;
	output.speedup.value = (100 * (1 - stats.checks / bruteHalfChecks)).toFixed(2);
	output.step.value = stepTime;
	output.display.value = displayStepTime;
}

function render(tree, force) {
	var now = new Date().getTime();

	c.clearRect(0, 0, canvas.width, canvas.height);

	if (drag.is) {
		drawBody(drag);
		drawArrow(drag.from.x, drag.from.y, drag.to.x, drag.to.y);
	}

	var com = { x: 0, y: 0, m: 0 };

	for (var i = 0; i < bodies.length; i++){
		drawBody(bodies[i]);
		if (options.rendering.arrows) {
			drawArrow(bodies[i].x,
				  bodies[i].y,
				  bodies[i].x + bodies[i].v.x,
				  bodies[i].y + bodies[i].v.y,
				  'green');

			drawArrow(bodies[i].x,
				  bodies[i].y,
				  bodies[i].x + bodies[i].a.x,
				  bodies[i].y + bodies[i].a.y,
				  'red');
		}
		com.x += bodies[i].x * bodies[i].m;
		com.y += bodies[i].y * bodies[i].m;
		com.m += bodies[i].m;
	}

	com.x /= com.m;
	com.y /= com.m;

	c.strokeStyle = '#333';
	c.lineWidth = 0.5;
	drawCross(com);

	if (tree) {
		if (options.rendering.tree) drawBNnode(tree.root, 0);

		updateData(tree.stats);
	}

	displayStepTime = new Date().getTime() - now;
	
	// recording.push(canvas.toDataURL());
}

function drawBox(box) {
	var height = box.y.max - box.y.min,
	     width = box.x.max - box.x.min;

	c.strokeStyle = 'blue';
	c.lineWidth = 1;
	c.strokeRect(box.x.min, box.y.min, width, height);	
}

function drawBody(body) {
	var tmp = Math.min(canvas.width, canvas.height);

	var min = tmp / 100,
	    max = tmp / 10;

	var r = min + (body.m - m.min) / (m.max - m.min) * (max - min);

	// FIXME This is not very nice
	if (bodies.length > 5) {
		var ratio = (body.v.magnitude - v.min) / (v.max - v.min);
		var color = 320 - (ratio * 320);

		c.fillStyle = 'hsla(' + color + ', 100%, 50%, ' + ratio + ')';
	} else {
		c.strokeStyle = 'red';
	}
	c.lineWidth = 1;
	c.beginPath();
	c.arc(body.x, body.y, r, 0, Math.PI * 2, true); 
	c.closePath();
	bodies.length > 5 ? c.fill() : c.stroke();
}

function drawArrow(x, y, x2, y2, color, h) {
	h = h || 5;
	color = color || 'green';

	// Resize arrow based on arrowLengthRatio
	// v = [x2-x,y2-y];
	// vMag = Math.sqrt(v[0]*v[0]+v[1]*v[1]);
	// if (vMag==0) {vMag = 1;}
	// console.log(vMag);

	// x2 = x + v[0]*arrowLengthRatio/vMag;
	// y2 = y + v[1]*arrowLengthRatio/vMag;
	
	// Linear Ratio
	x2 = x + (x2-x)/arrowLengthRatio;
	y2 = y + (y2-y)/arrowLengthRatio;

	// Logarithmic Ratio
	// var d = getDist(x,y,x2,y2);
	// var arrowLength = (Math.log(2+d)-Math.log(2))/Math.log(1.1);
	// x2 = x + (x2-x)/d * arrowLength;
	// y2 = y + (y2-y)/d * arrowLength;

	c.strokeStyle = color;
	c.fillStyle = color;
	c.lineWidth = '0';
	
	// Line
	c.beginPath();
	c.moveTo(x,y);
	c.lineTo(x2,y2);
	c.closePath();
	c.stroke();

	// Arrow head
	var angle = Math.atan2(y2 - y, x2 - x);
	c.beginPath();
	c.moveTo(x2, y2);
	c.lineTo(x2 - h * Math.cos(angle - Math.PI / 8), y2 - h * Math.sin(angle - Math.PI / 8));
	c.lineTo(x2 - h * Math.cos(angle + Math.PI / 8), y2 - h * Math.sin(angle + Math.PI / 8));
	c.lineTo(x2, y2);
	c.closePath();
	c.fill();
}

function drawCross(pos, h) {
	h = h || 5;

	c.beginPath();
	c.moveTo(pos.x - h / 2, pos.y);
	c.lineTo(pos.x + h / 2, pos.y);
	c.moveTo(pos.x, pos.y - h / 2);
	c.lineTo(pos.x, pos.y + h / 2);
	c.closePath();
	c.stroke();
}
