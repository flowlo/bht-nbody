/*
Copyright (c) 2012, Sameer Ansari - elucidation@gmail.com
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies, 
either expressed or implied, of the FreeBSD Project.
*/
////////////
var DEBUG = 0; // Extra info in console (0=Off,1=Low,2=Absurd, 3=BNtree)
var DEBUGMAX = 5; // Levels of DEBUG

// Reality
// var m = { min: 1e20, max: 1e30 };
// var G = 6.673e-11; // Gravitational Constant
// var ETA = 0.01; // Softening constant
// var GFACTOR = 1.3; // Higher means distance has more effect (3 is reality)
// var dt; // Global DT set by html
// var MAXDEPTH = 50; // BN tree max depth ( one less than actual, example with maxdepth = 2, the levels are [0 1 2] )
// var BN_THETA = 0.5;
// var DISTANCE_MULTIPLE = 1e9; // # meters per pixel (ex 1, 1 meter per pixel)
// 1e3 = km, 1e6 = Mm, 1e9 = Gm, 149.60e9 = Au, 9.461e15 = LightYear, 30.857e15 = Parsec
var G = 1e-5; // Gravitational Constant
var ETA = 10; // Softening constant
var GFACTOR = 1.3; // Higher means distance has more effect (3 is reality)

var DISTANCE_MULTIPLE = 2;

var INTERACTION_METHOD = "BN"; // BN or BRUTE, type of tree search to use
var MAXDEPTH = 50; // BN tree max depth ( one less than actual, example with maxdepth = 2, the levels are [0 1 2] )
var BN_THETA = 0.5;

var dt; // Global DT set by html
// Bodies struct containing all bodies
var bods = [];

// Canvas Context
var c;

var root;

var m = { min: 0, max: 1e10 };

function initBN(id) {
	canvasElement = document.getElementById(id);
	c = canvasElement.getContext("2d");
}

function addNrandomBodies(n) {
	for (var i = 0; i < n; i++)
		addRandomBody();

	refreshGraphics();
}

function addRandomBody() {
	addBody({
		x: Math.random() * canvasElement.width,
		y: Math.random() * canvasElement.height,
		v: {
			x: Math.random() * 10 - 5,
			y: Math.random() * 10 - 5,
		},
		m: Math.random() * (m.max - m.min) + m.min
	});
}

function addBody(body) {
	body.a = { x: 0, y: 0 };
	bods.push(body);

	if (!sysRunning) bnBuildTree();
}
// BN Tree code ------
var bnDepth=0, bnNumNodes=0, bnNumLeafs=0;
function bnSetTreeStats() {
	bnDepth=0, bnNumNodes=0, bnNumLeafs=0;
	bnSetTreeStatsRecurse(root, 0);
}

function bnSetTreeStatsRecurse(node, depth) {
	if (!node) return;

	// If body in node
	bnNumNodes += 1;
	bnDepth = Math.max(depth, bnDepth);

	if (!node.b.length) return;

	if (node.b != "PARENT")
		bnNumLeafs += 1;

	for (var i = 0; i < 4; i++)
		bnSetTreeStatsRecurse(node.nodes[i], depth + 1);
}

function bnDeleteNode(node) {
	if (!node) return;

	delete node.b;
	delete node.box;
	node.nodes.forEach(bnDeleteNode);
	delete node.nodes;
}

function bnBuildTree() {
	bnDeleteNode(root);

	root = {
		b: [],
		leaf: true,
		nodes: [],
		box: {
			x: { min: 0, max: canvasElement.width },
			y: { min: 0, max: canvasElement.height }
		}
	};
	
	// Add each body to tree
	for (var i = 0; i < bods.length; i++)
		if (bods[i].x >= root.box.x.min && bods[i].x <= root.box.x.max && bods[i].y >= root.box.y.min && bods[i].y <= root.box.y.max)
			bnAddBody(root, i, 0);

	bnSetTreeStats(); // Update bn tree stats
}

function bnAddBody(node,i,depth) {
	if (!node.b.length) {
		node.b = [ i ];
		node.com = { m: bods[i].m, x: bods[i].x, y: bods[i].y };
		return;
	}

	// Check if hit max depth
	if (depth > MAXDEPTH) {
		node.b.push(i); // Add body to same node since already at max depth
	} else {
		var subBodies;
		if (!node.leaf) { // Same as saying node.b = "PARENT"
			// Node is a parent with children
			subBodies = [ i ];
		} else {
			// Node is a leaf node (no children), turn to parent
			subBodies = [ node.b, i ];
		}
		for (var k = 0; k < subBodies.length; k++) {
			// Add body to children too		
			var quad = getQuad(subBodies[k], node.box);
			var child = node.nodes[quad];
			if (child) {
				// if quad has child, recurse with child
				bnAddBody(child, subBodies[k], depth + 1);
			} else {
				// else add body to child
				node = bnMakeNode(node, quad, subBodies[k]);
			}
		}
		node.b = [ "PARENT" ];
		node.leaf = false; // Always going to turn into a parent if not already
	}
	// Update center of mass
	node.com.x = (node.com.x * node.com.m + bods[i].x * bods[i].m) / (node.com.m + bods[i].m);
	node.com.y = (node.com.y * node.com.m + bods[i].y * bods[i].m) / (node.com.m + bods[i].m);
	node.com.m += bods[i].m;
}

function getQuad(i, box) {
	return (bods[i].x >= (box.x.min + box.x.max) / 2) + (bods[i].y >= (box.y.min + box.y.max) / 2) * 2;
}

function bnMakeNode(parent, quad, child) {
	var child = {
		b: [ child ],
		leaf: true,
		com : { m: bods[child].m, x: bods[child].x, y: bods[child].y }, // Center of Mass set to the position of single body
		nodes: [],
	};

	switch (quad) {
		case 0: // Top Left
			child.box = {
				x: { min: parent.box.x.min, max: (parent.box.x.min + parent.box.x.max) / 2 },
				y: { min: parent.box.y.min, max: (parent.box.y.min + parent.box.y.max) / 2 }
			};
			break;
		case 1: // Top Right
			child.box = {
				x: { min: (parent.box.x.min + parent.box.x.max) / 2, max: parent.box.x.max },
				y: { min: parent.box.y.min, max: (parent.box.y.min + parent.box.y.max) / 2 }
			};
			break;
		case 2: // Bottom Left
			child.box = {
				x: { min: parent.box.x.min, max: (parent.box.x.min + parent.box.x.max) / 2 },
				y: { min: (parent.box.y.min + parent.box.y.max) / 2, max: parent.box.y.max }
			};
			break;
		case 3: // Bottom Right
			child.box = {
				x: { min: (parent.box.x.min + parent.box.x.max) / 2, max: parent.box.x.max },
				y: { min: (parent.box.y.min + parent.box.y.max) / 2, max: parent.box.y.max }
			};
			break;
	}
	parent.nodes[quad] = child;
	return parent;
}

function doBNtreeRecurse(bI,node) {
	if (!node) return;

	if (node.leaf) {
		// If node is a leaf node
		for (var k = 0; k < node.b.length; k++) {
			if (bI != node.b[k]) {
				setAccel(bI, node.b[k], false);
				numChecks += 1;
			}
		}
	} else {
		var s = Math.min(node.box.x.max-node.box.x.min, node.box.y.max-node.box.y.min); // Biggest side of box
		var d = distance(bods[bI], node.com);
		if (s / d < BN_THETA) {
			setAccelDirect(bI,node.com)
			numChecks += 1;
		} else {
			// Not performant:
			// node.nodes.forEach(doBNtreeRecurse.bind(this, bI));

			for (var k = 0; k < 4; k++)
				doBNtreeRecurse(bI, node.nodes[k]);
		}
	}
}

function distance(a, b) {
	return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

// Update accelerations using BN tree
function forceBNtree() {
	bnBuildTree(); // Build BN tree based on current pos
	numChecks = 0;
	for (var i = 0; i < bods.length; i++) {
		// For each body
		doBNtreeRecurse(i, root);
	}
}

function setAccel(i, j, both) {
	if (arguments.length < 3)
		both = true;

	var F = getForceVecDirect(bods[i], bods[j]);

	bods[i].a.x += F.x / bods[i].m;
	bods[i].a.y += F.y / bods[i].m;
	
	if (both) {
		bods[j].a.x -= F.x / bods[j].m;
		bods[j].a.y -= F.y / bods[j].m;
	}
}
function setAccelDirect(i, other) {
	// Set's accel according to given mass

	// get Force Vector between body i
	// and a virtual mass
	//   with mass m, at position cx,cy
	var F = getForceVecDirect(bods[i], other);
	
	// Update acceleration of body
	bods[i].a.x += F.x / bods[i].m;
	bods[i].a.y += F.y / bods[i].m;
}

function getForceVecDirect(a, b) {
	// Determines force interaction between
	// bods[i] and bods[j], an adds to bods[i]
	var dx = b.x - a.x;
	var dy = b.y - a.y;
	var r = (distance(a, b) + ETA) * DISTANCE_MULTIPLE;
	// F_{x|y} = d_{x|y}/r * G*M*m/r.^3;
	var F = G * a.m * b.m / Math.pow(r, GFACTOR + 1);

	return { x: F * dx, y: F * dy };
}

function forceBrute() {
	// This should be asymptotically close enough.
	numChecks = Math.pow(bods.length, 2) / 2;

	for (var i = 0; i < bods.length; i++)
		for (var j = i + 1; j < bods.length; j++)
			setAccel(i, j);
}


var numChecks;
// Set accelerations of bodies based on gravity
function doForces() {
	// Zero accelerations
	for (var i = 0; i < bods.length; i++) {
		bods[i].a.x = 0;
		bods[i].a.y = 0;
	}

	// Determine accelerations on all bodies
	switch (INTERACTION_METHOD) {
		case "BRUTE":
			forceBrute();
			break;
		case "BN":
			bnBuildTree(); // REMOVE WHEN doing forceBNtree!
			forceBNtree();
			break;
	}
}

// Basic update system step by time step dt
var T = 0; // current system time
var dt = 0.01;
var stepTime;
function step() {
	var now = new Date().getTime();

	// Use integration method to step once by global dt
	leapfrog();

	stepTime = new Date().getTime() - now;

	T += dt;

	if (!sysRunning) refreshGraphics(); // Refresh graphics if paused
}

function forwardEuler() {
	doForces(); // Set/Update accelerations
	move(dt); // Move full step
	accelerate(dt); // Move Velocities full step
}

function leapfrog() {
	move(0.5 * dt); // Move half step
	doForces(); // Set/Update accelerations
	accelerate(dt); // Move Velocities full step
	move(0.5 * dt); // Move half step
}

function move(dt) {
	for (var i = 0; i < bods.length; i++) {
		bods[i].x += bods[i].v.x * dt;
		bods[i].y += bods[i].v.y * dt;
	}
}

function accelerate(dt) {
	for (var i = 0; i < bods.length; i++) {
		bods[i].v.x += bods[i].a.x * dt;
		bods[i].v.y += bods[i].a.y * dt;
	}
}

var sysTimer;
var sysRunning = false;

function startSys() {
	sysTimer = setInterval(step,10);
	gfxTimer = setInterval(refreshGraphics,1/60.0*1000);
	sysRunning = true;
	if (DEBUG) {
	    console.log("START SYSTEM ",T,"s");
	}
	refreshGraphics();
}

function pauseSys() {
	clearInterval(sysTimer);
	clearInterval(gfxTimer);
	sysRunning = false;
	if (DEBUG) {
	    console.log("STOP SYSTEM ",T,"s");
	}
	refreshGraphics();
}
