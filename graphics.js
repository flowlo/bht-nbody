// Arrow Length Multipliers
drawArrows = false; // Button edit
arrowLengthRatio = 2;
ARROWHEADSIZE = 5;

// Circle Sizes
var MINRADIUS = 1;
var MAXRADIUS = 5;

// Barnes-Hut Tree Graphics
var SHOW_BN_TREE = false;
var BN_DRAW_DEPTH = 10; // Depth to draw tree out to
var BN_DRAW_TEXT_DEPTH = 4; // Depth to draw text of node bbox

// Canvas Context
var c;
// Graphics refresh timer
var gfxTimer=0;
var displayStepTime;

function initGraphics(){
	timeDisp = document.getElementById('timeDisp');
	bodyCounter = document.getElementById('bodyCount');
}

function drawBNtree() {
	return;
	//if (root && SHOW_BN_TREE) drawBNnode(root,0);
}
function drawBNnode(node, depth) {
	if (node.elements && depth <= BN_DRAW_DEPTH) {
		// Draw Node
		drawBBOX(node.box.x.min, node.box.y.min, node.box.x.max, node.box.y.max);
		c.textBaseline = 'top';
		
		if (DEBUG >= 1) {
			// Draw Center of Mass
			c.strokeStyle = 'red';
			c.lineWidth = 0.2;
			drawCross(node.com.x, node.com.y, 5);
		}

		/*if (!node.leaf && depth <= BN_DRAW_TEXT_DEPTH) {
			c.font = "8pt Courier New";
			c.fillStyle = "#090";
			c.fillText(JSON.stringify(node.elements), node.box.x.min + 1, node.box.y.min + 1)
		}*/
		for (var i = 0; i < 4; i++){
			var child = node.elements[i];
			if (child) drawBNnode(child, depth + 1);
		}
	}
}


// Updates text on html page
function updateData() {
	timeDisp.value = T.toFixed(2); // Update time output form
	var bruteHalfChecks = bodies.length*(bodies.length-1)/2; // what efficient Brute Force checks would be
	bodyCounter.innerHTML = bodies.length;

	data.innerHTML = "<p><b>System "+(sysRunning?"Running":"Paused")+"</b><br/>\n\
		Bodies: "+bodies.length+"<br/>\n\
		Force calculations per step: "+stats.checks+"<br/>\n\
		</p>";

	if (INTERACTION_METHOD === "BN") {
		data.innerHTML += "\n\
			<p>\n\
			<b>BN Tree</b>\n\
			Depth: " + stats.depth + "<br />\n\
			Nodes: " + stats.nodes + "<br />\n\
			Leaves: " + stats.leaves + "<br />\n\
			</p>\n\
			<p>\n\
			<b>Number of Calculations</b><br/>\n\
			BH-Tree: "+ stats.checks + " O(nlogn)<br/>\n\
			Brute force: "+bruteHalfChecks+" O(n&sup2;)<br/>\n\
			</p>\n\
			<p>\n\
			Speedup : "+(100*(1-stats.checks/bruteHalfChecks)).toFixed(2)+"%<br/>\n\
			</p>"
	}

	data.innerHTML += "\n\
		<p>\n\
		<b>Time per step</b><br/>\n\
		Compute : "+stepTime+"ms<br/>\n\
		Display : "+displayStepTime+"6ms<br/>\n\
		</p>";

	
	if (DEBUG>=1) {
		data.innerHTML += "<ul>";
		var i;
		for(i=0;i<bodies.length;i++){
			data.innerHTML += "<li> B"+i+" : Pos "+
				bodies[i].x.toFixed(2)+", "+bodies[i].y.toFixed(2)+
				" </li>";
		}
		data.innerHTML += "</ul>";
	}
}

// Updates graphics in Canvas
function refreshGraphics(stats) {
	var startTime = new Date().getTime();

	c.clearRect(0, 0, canvas.width, canvas.height);

	if (drag.is) {
		drawCircle(drag.x, drag.y, massToRadius(drag.m));
		drawArrow(drag.x, drag.y, drag.x2, drag.y2);
	}

	var com = {x: 0, y: 0, m: 0}; // Center of mass of sys

	for(var i = 0; i < bodies.length; i++){
		drawCircle(bodies[i].x,bodies[i].y,massToRadius(bodies[i].m));
		// Velocity arrow (Green)
		if (drawArrows) {
			drawArrow(bodies[i].x,
				bodies[i].y,
				bodies[i].x+bodies[i].v.x,
				bodies[i].y+bodies[i].v.y,'',"#0f0");
			// Acceleration arrow (Red)
			drawArrow(bodies[i].x,
				bodies[i].y,
				bodies[i].x+bodies[i].a.x,
				bodies[i].y+bodies[i].a.y,5,"#f00");
		}
		com.x += bodies[i].x*bodies[i].m;
		com.y += bodies[i].y*bodies[i].m;
		com.m += bodies[i].m;
	}

	// Draw Center of Mass
	com.x /= com.m;
	com.y /= com.m;

	c.strokeStyle = 'blue';
	c.lineWidth = 1;
	drawCross(com.x, com.y);

	// Draw BNtree
	drawBNtree();

	updateData(stats);

	displayStepTime = new Date().getTime() - startTime;
}

function massToRadius(mass) {
	return MINRADIUS+(mass-m.min)/(m.max-m.min)*(MAXRADIUS-MINRADIUS);
}

// Simple Shapes --------------------------
function drawBBOX(x,y,x2,y2) {
	drawBox(x,y,x2-x,y2-y);
}
function drawBox(x,y,w,h) {
	c.strokeStyle = '#00f';
	c.lineWidth = "1";
	c.strokeRect(x,y,w,h);	
}

// x,y center with radius r
function drawCircle(x,y,r) {
	c.strokeStyle = 'rgba(255, 0, 0, 0.8)';
	c.fillStyle = 'transparent';
	c.lineWidth = "1";
	c.beginPath();
	c.arc(x,y,r,0,Math.PI*2,true); 
	c.closePath();
	c.stroke();
	//c.fill();
}

// Arrow
// x,y start to x2,y2 end
// h = Arrow Head size
function drawArrow(x,y,x2,y2,h,color) {
	h = (typeof(h) != 'undefined' && h != '') ? h : ARROWHEADSIZE; // Default h
	color = typeof(color) != 'undefined' ? color : '#0f0'; // Default color

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
	c.lineWidth = "0";

	
	// Line
	c.beginPath();
	c.moveTo(x,y);
	c.lineTo(x2,y2);
	c.closePath();
    c.stroke();

	// Arrow head
	var angle = Math.atan2(y2-y,x2-x);
	c.beginPath();
	c.moveTo(x2,y2);
    c.lineTo(x2-h*Math.cos(angle-Math.PI/8),y2-h*Math.sin(angle-Math.PI/8));
    c.lineTo(x2-h*Math.cos(angle+Math.PI/8),y2-h*Math.sin(angle+Math.PI/8));
    c.lineTo(x2,y2);
    c.closePath();
    c.fill();
}

// h = cross line width
function drawCross(x,y,h) {
	h = typeof(h) != 'undefined' ? h : 10; // Default h
	// Lines
	c.beginPath();
	c.moveTo(x-h/2,y);
	c.lineTo(x+h/2,y);
	c.moveTo(x,y-h/2);
	c.lineTo(x,y+h/2);
	c.closePath();
    c.stroke();
}
