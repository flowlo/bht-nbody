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
// var BN_THETA = 0.5;
// var DISTANCE_MULTIPLE = 1e9; // # meters per pixel (ex 1, 1 meter per pixel)
// 1e3 = km, 1e6 = Mm, 1e9 = Gm, 149.60e9 = Au, 9.461e15 = LightYear, 30.857e15 = Parsec
var G = 1e-5; // Gravitational Constant
var ETA = 10; // Softening constant
var GFACTOR = 1.3; // Higher means distance has more effect (3 is reality)

var DISTANCE_MULTIPLE = 2;

var INTERACTION_METHOD = "BN"; // BN or BRUTE, type of tree search to use
var BN_THETA = 0.5;

var dt; // Global DT set by html
// Bodies struct containing all bodies
var bods = [];

var root;

var m = { min: 0, max: 1e10 };
var stats = { enabled: true, depth: 0, nodes: 0, leaves: 0, checks: 0 };

function addNrandomBodies(n) {
	for (var i = 0; i < n; i++)
		addRandomBody();

	refreshGraphics();
}

function addRandomBody() {
	addBody({
		x: Math.random() * canvas.width,
		y: Math.random() * canvas.height,
		v: {
			x: Math.random() * 10 - 5,
			y: Math.random() * 10 - 5,
		},
		m: Math.random() * (m.max - m.min) + m.min
	});
}

function addBody(body) {
	if (!body.v || !body.v.x || !body.v.y)
		body.v = { x: 0, y: 0 };

	if (!body.a || !body.a.x || !body.a.y)
		body.a = { x: 0, y: 0 };

	bods.push(body);

	if (!sysRunning) bnBuildTree();
}

function collect(node, depth) {
	if (!node) return;

	stats.nodes++;
	stats.depth = Math.max(depth, stats.depth);

	stats.leaves += node.leaf;

	for (var i = 0; i < 4 && !node.leaf; i++)
		collect(node.elements[i], depth + 1);
}

function free(node) {
	if (!node) return;

	if (!node.leaf) node.elements.forEach(free);

	delete node.elements;
	delete node.box;
}

function bnBuildTree() {
	free(root);

	root = {
		elements: [],
		leaf: true,
		box: {
			x: { min: 0, max: canvas.width },
			y: { min: 0, max: canvas.height }
		}
	};

	for (var i = 0; i < bods.length; i++)
		if (bods[i].x >= root.box.x.min && bods[i].x <= root.box.x.max && bods[i].y >= root.box.y.min && bods[i].y <= root.box.y.max)
			bnAddBody(root, i);

	if (stats.enabled) {
		stats.depth = 0;
		stats.nodes = 0;
		stats.leaves = 0;
		collect(root, 0);
	}
}

function bnAddBody(node, i) {
	if (node.elements.length === 0) {
		node.elements = [ i ];
		node.com = { m: bods[i].m, x: bods[i].x, y: bods[i].y };
		return;
	}

	var quad = (bods[i].x >= (node.box.x.min + node.box.x.max) / 2)
	         + (bods[i].y >= (node.box.y.min + node.box.y.max) / 2) * 2;

	if (node.elements[quad] && !node.leaf) {
		bnAddBody(node.elements[quad], i);
	} else {
		var child = {
			elements: [ i ],
			leaf: true,
			com : { m: bods[i].m, x: bods[i].x, y: bods[i].y }
		};

		if (quad === 0) {
			child.box = {
				x: { min: node.box.x.min, max: (node.box.x.min + node.box.x.max) / 2 },
				y: { min: node.box.y.min, max: (node.box.y.min + node.box.y.max) / 2 }
			};
		} else if (quad === 1) {
			child.box = {
				x: { min: (node.box.x.min + node.box.x.max) / 2, max: node.box.x.max },
				y: { min: node.box.y.min, max: (node.box.y.min + node.box.y.max) / 2 }
			};
		} else if (quad === 2) {
			child.box = {
				x: { min: node.box.x.min, max: (node.box.x.min + node.box.x.max) / 2 },
				y: { min: (node.box.y.min + node.box.y.max) / 2, max: node.box.y.max }
			};
		} else if (quad === 3) {
			child.box = {
				x: { min: (node.box.x.min + node.box.x.max) / 2, max: node.box.x.max },
				y: { min: (node.box.y.min + node.box.y.max) / 2, max: node.box.y.max }
			};
		}

		if (node.leaf) {
			node.leaf = false;
			node.elements = [];
		}
		node.elements[quad] = child;
	}

	node.com.x = (node.com.x * node.com.m + bods[i].x * bods[i].m) / (node.com.m + bods[i].m);
	node.com.y = (node.com.y * node.com.m + bods[i].y * bods[i].m) / (node.com.m + bods[i].m);
	node.com.m += bods[i].m;
}

function doBNtreeRecurse(bI,node) {
	if (!node) return;

	if (node.leaf) {
		stats.checks += node.elements.length;

		for (var k = 0; k < node.elements.length; k++)
			if (bI != node.elements[k])
				setAccel(bI, node.elements[k], false);
	} else {
		var s = Math.min(node.box.x.max - node.box.x.min,
		                 node.box.y.max - node.box.y.min),
		    d = distance(bods[bI], node.com);

		if (s / d < BN_THETA) {
			setAccelDirect(bI, node.com)
			stats.checks++;
		} else {
			for (var k = 0; k < 4; k++)
				doBNtreeRecurse(bI, node.elements[k]);
		}
	}
}

function distance(a, b) {
	return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

// Update accelerations using BN tree
function forceBNtree() {
	bnBuildTree(); // Build BN tree based on current pos
	stats.checks = 0;

	for (var i = 0; i < bods.length; i++)
		doBNtreeRecurse(i, root);
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
	var F = getForceVecDirect(bods[i], other);

	bods[i].a.x += F.x / bods[i].m;
	bods[i].a.y += F.y / bods[i].m;
}

function getForceVecDirect(a, b) {
	var dx = b.x - a.x;
	var dy = b.y - a.y;
	var r = (distance(a, b) + ETA) * DISTANCE_MULTIPLE;
	// F_{x|y} = d_{x|y} / r * G * M * m / r^3
	var F = G * a.m * b.m / Math.pow(r, GFACTOR + 1);

	return { x: F * dx, y: F * dy };
}

function forceBrute() {
	stats.checks = bods.length * (bods.length - 1) / 2;

	for (var i = 0; i < bods.length; i++)
		for (var j = i + 1; j < bods.length; j++)
			setAccel(i, j);
}

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
