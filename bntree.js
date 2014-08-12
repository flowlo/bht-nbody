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
// var MINMASS = 1e20;
// var MAXMASS = 1e30;
// var G = 6.673e-11; // Gravitational Constant
// var ETA = 0.01; // Softening constant
// var GFACTOR = 1.3; // Higher means distance has more effect (3 is reality)
// var dt; // Global DT set by html
// var MAXDEPTH = 50; // BN tree max depth ( one less than actual, example with maxdepth = 2, the levels are [0 1 2] )
// var BN_THETA = 0.5;
// var DISTANCE_MULTIPLE = 1e9; // # meters per pixel (ex 1, 1 meter per pixel)
// 1e3 = km, 1e6 = Mm, 1e9 = Gm, 149.60e9 = Au, 9.461e15 = LightYear, 30.857e15 = Parsec
var MINMASS = 1e2;
var MAXMASS = 1e10;
var G = 1e-5; // Gravitational Constant
var ETA = 10; // Softening constant
var GFACTOR = 1.3; // Higher means distance has more effect (3 is reality)

var DISTANCE_MULTIPLE = 2;

var INTERACTION_METHOD = "BN"; // BN or BRUTE, type of tree search to use
var MAXDEPTH = 50; // BN tree max depth ( one less than actual, example with maxdepth = 2, the levels are [0 1 2] )
var BN_THETA = 0.5;

var dt; // Global DT set by html
// Bodies struct containing all bodies
var bods;

function resetBodies() {
	bods = [];
}

// Canvas Context
var c;

// Called by HTML with canvasId passed in
function initBN(canvasId) {
	canvasElement = document.getElementById(canvasId);
	c = canvasElement.getContext("2d");

	resetBodies();

	if (DEBUG) {
		console.log('Initialize BN complete.');
	}
}

function addNrandomBodies(n){
	for (var i=0;i<n;i++) {
		addRandomBody();
	}
	refreshGraphics();
}

function addRandomBody() {
	addBody({
		x: Math.random()*canvasElement.width,
		y: Math.random()*canvasElement.height,
		v: {
			x: Math.random()*10-5,
			y: Math.random()*10-5,
		},
		m: Math.random() * (MAXMASS - MINMASS) + MINMASS
	});
}

function addBody(body) {
	bods.push(body);
	
	if (DEBUG) {
	    console.log('Body added: ', body);
	}
	if (bods.length >= 100 && DEBUG > 0) {
		setDEBUG(0); // temp check to keep debug off when too many bodies
	}
	if (!sysRunning) {bnBuildTree();}
}
// BN Tree code ------
var bnDepth=0, bnNumNodes=0, bnNumLeafs=0;
function bnSetTreeStats() {
	bnDepth=0, bnNumNodes=0, bnNumLeafs=0;
	bnSetTreeStatsRecurse(bnRoot,0);
}
function bnSetTreeStatsRecurse(node,depth) {
	// If body in node
	bnNumNodes += 1;
	bnDepth = Math.max(depth,bnDepth);

	if ( node.b.length > 0 ) {
		if (node.b != "PARENT") {
			bnNumLeafs += 1;
		}
		// Draw Children
		for (var i=0;i<4;i++){
			var child = node.nodes[i];
			if (child) { bnSetTreeStatsRecurse(child,depth+1) }
		}
	}
}

function bnDeleteTree() {
	if (bnRoot) {bnRoot = bnDeleteNode(bnRoot);}
}
function bnDeleteNode(node) {
	node.b = null;
	node.box = null;
	// For each child
	for (var i=0;i<4;i++) {
		if (node.nodes[i]) { // If child exists
			node.nodes[i] = bnDeleteNode(node.nodes[i]);
		}
	}
	return null;
}

var bnRoot;
function bnBuildTree() {
	bnDeleteTree(bnRoot); // Delete Tree to clear memory
	bnRoot = {b: [], // Body
		leaf:true,
//		com: null, // center of mass
		nodes:[null,null,null,null],
		// x y x2 y2
		box:[0, 0, canvasElement.width, canvasElement.height]};
	
	// Add each body to tree
	for (var i=0;i<bods.length;i++) {
		if (pointInBBOX(bods[i].x,bods[i].y,bnRoot.box)) {
			bnAddBody(bnRoot,i,0);
		}
		else {
			if (DEBUG>=4) {console.log("Body ",i," has left the BNtree area. Not added");}
		}
	}
	if (DEBUG>=2) {
		console.log("BNtree Built: ",bnRoot);
	}
	bnSetTreeStats(); // Update bn tree stats
}

// BBOX = [x y x2 y2]
function pointInBBOX(x,y,BBOX) {
	if (x >= BBOX[0] && x <= BBOX[2] && y >= BBOX[1] && y <= BBOX[3]) {return true;}
	else {return false;}
}

function bnAddBody(node,i,depth) {
	if (DEBUG>=3) {
		console.log("bnAddBody(",node,",",i,",",depth,")");
	}
	// if node has body already
	if ( node.b.length > 0 ) { // not empty
		// Check if hit max depth
		if (depth > MAXDEPTH) {
			if (DEBUG>=3) {console.log('MAX DEPTH B',i);}
			node.b.push(i); // Add body to same node since already at max depth
		} 
		else {
			var subBodies;
			if (!node.leaf) { // Same as saying node.b = "PARENT"
				// Node is a parent with children
				subBodies = [i];
			} else {
				// Node is a leaf node (no children), turn to parent
				subBodies = [node.b,i];
			}
			for (var k=0;k<subBodies.length;k++) {
				// Add body to children too		
				var quad = getQuad(subBodies[k],node.box);
				var child = node.nodes[quad];
				if (child) {
					// if quad has child, recurse with child
					bnAddBody(child,subBodies[k],depth+1);
				} else {
					// else add body to child
					node = bnMakeNode(node,quad,subBodies[k]);
				}
			}
			node.b = ["PARENT"];
			node.leaf = false; // Always going to turn into a parent if not already
		}
		// Update center of mass
		node.com.x = (node.com.x*node.com.m + bods[i].x*bods[i].m)/(node.com.m+bods[i].m);
		node.com.y = (node.com.y*node.com.m + bods[i].y*bods[i].m)/(node.com.m+bods[i].m);
		node.com.m += bods[i].m;
	} else { // else if node empty, add body
		node.b = [ i ];
		node.com = { m: bods[i].m, x: bods[i].x, y: bods[i].y };
	}
}

function getQuad(i,box) {
	return (bods[i].x >= (box[0] + box[2]) / 2) + (bods[i].y >= (box[1] + box[3]) / 2) * 2;
}

function bnMakeNode(parent,quad,child) {
	if (DEBUG>=3) {
		console.log("bnMakeNode(",parent,",",quad,",",child,")");
	}
	var child = {b:[child],
		leaf:true,
		com : { m: bods[child].m, x: bods[child].x, y: bods[child].y }, // Center of Mass set to the position of single body
		nodes:[null,null,null,null],
		box:[0,0,0,0]};

	switch (quad) {
		case 0: // Top Left
			child.box = [parent.box[0],
				parent.box[1],
				(parent.box[0]+parent.box[2])/2, 
				(parent.box[1]+parent.box[3])/2];
			break;
		case 1: // Top Right
			child.box = [(parent.box[0]+parent.box[2])/2,
				parent.box[1],
				parent.box[2], 
				(parent.box[1]+parent.box[3])/2];
			break;
		case 2: // Bottom Left
			child.box = [parent.box[0],
				(parent.box[1]+parent.box[3])/2,
				(parent.box[0]+parent.box[2])/2, 
				parent.box[3]];
			break;
		case 3: // Bottom Right
			child.box = [(parent.box[0]+parent.box[2])/2,
				(parent.box[1]+parent.box[3])/2,
				parent.box[2], 
				parent.box[3]];
			break;
	}
	parent.nodes[quad] = child;
	return parent;
}

function doBNtree(bI) {
	doBNtreeRecurse(bI,bnRoot);
}
function doBNtreeRecurse(bI,node) {
	if (node.leaf) {
		// If node is a leaf node
		for (var k=0;k<node.b.length;k++) {
			if (bI != node.b[k]) { // Skip self
				setAccel(bI,node.b[k],false);
				numChecks += 1;
			}
		}
	}
	else {
		var s = Math.min( node.box[2]-node.box[0] , node.box[3]-node.box[1] ); // Biggest side of box
		var d = getDist(bods[bI].x,bods[bI].y,
			node.com.x,node.com.y);
		if (s/d < BN_THETA) {
			setAccelDirect(bI,node.com)
			numChecks += 1;
		}
		else {
			// Recurse for each child
			for (var k=0;k<4;k++) {
				if (node.nodes[k]) {doBNtreeRecurse(bI,node.nodes[k]);}
			}
		}
	}
}

function getDist(x,y,x2,y2) {
	return Math.sqrt(Math.pow(x2-x,2)+Math.pow(y2-y,2));
}

// Update accelerations using BN tree
function forceBNtree() {
	bnBuildTree(); // Build BN tree based on current pos
	numChecks = 0;
	for (var i=0;i<bods.length;i++) {
		// For each body
		doBNtree(i);
	}
}
// ------
// do_Both defaults true: Updates acceleration of bods[j] also (negative of bods[i])

function setAccel(i,j,do_Both) {
	do_Both = typeof(do_Both) != 'undefined' ? do_Both : true;
	
	// Get Force Vector between bodies i, j
	var F = getForceVec(i,j);

	// a = F/m
	// Body i
	bods[i].a.x += F.x/bods[i].m;
	bods[i].a.y += F.y/bods[i].m;
	
	if (do_Both) {
		// Body j, equal and opposite force
		bods[j].a.x -= F.x/bods[j].m;
		bods[j].a.y -= F.y/bods[j].m;
	}
}
function setAccelDirect(i, other) {
	// Set's accel according to given mass

	// get Force Vector between body i
	// and a virtual mass
	//   with mass m, at position cx,cy
	var F = getForceVecDirect(bods[i], other);
	
	// Update acceleration of body
	bods[i].a.x += F.x/bods[i].m;
	bods[i].a.y += F.y/bods[i].m;
}

function getForceVec(i,j) {
	if (DEBUG>=10) {
		console.log("B",i," <-> B",j," : ",F);
	}
	return getForceVecDirect(bods[i], bods[j]);
}

function getForceVecDirect(a, b) {
	// Determines force interaction between
	// bods[i] and bods[j], an adds to bods[i]
	var dx = b.x - a.x;
	var dy = b.y - a.y;
	var r = (getDist(a.x, a.y, b.x, b.y) + ETA) * DISTANCE_MULTIPLE;
	// F_{x|y} = d_{x|y}/r * G*M*m/r.^3;
	var F = G * a.m * b.m / Math.pow(r, GFACTOR + 1);

	return { x: F * dx, y: F * dy };
}

// Update accels by checking every body to each other
function forceBrute() {
	numChecks = 0;
	// Brute force O(n^2) comparisons
	for (var i=0;i<bods.length;i++) {
		for (var j=i+1;j<bods.length;j++) {
			setAccel(i,j);
			numChecks += 1;
		}
	}
}


var numChecks;
// Set accelerations of bodies based on gravity
function doForces() {
	// Zero accelerations
	for (var i=0;i<bods.length;i++) {
		bods[i].a = { x: 0, y: 0 };
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
	
	if (DEBUG>=2) {
		console.log("# Force Checks: ",numChecks);
	}
}

// Basic update system step by time step dt
var T = 0; // current system time
var dt = 0.01;
var stepTime;
function step() {
	var startTime = (new Date()).getTime();

	// Use integration method to step once by global dt
	leapfrog();

	stepTime = (new Date()).getTime()-startTime;

	T += dt;
	if (DEBUG>=2) {
	    console.log("STEP");
	}
	if (!sysRunning) {refreshGraphics();} // Refresh graphics if paused
	
}
function forwardEuler() {
	doForces(); // Set/Update accelerations
	updatePos(dt); // Move full step
	updateVel(dt); // Move Velocities full step
}

function leapfrog() {
	updatePos(0.5*dt); // Move half step
	doForces(); // Set/Update accelerations
	updateVel(dt); // Move Velocities full step
	updatePos(0.5*dt); // Move half step
}

function updatePos(dt_step) {
	// Update body positions based on velocities
	for (var i=0;i<bods.length;i++) {
		bods[i].x += bods[i].v.x*dt_step;
		bods[i].y += bods[i].v.y*dt_step;
	}
}
function updateVel(dt_step) {
	// Update body velocities based on accelerations
	for (var i=0;i<bods.length;i++) {
		bods[i].v.x += bods[i].a.x*dt_step;
		bods[i].v.y += bods[i].a.y*dt_step;
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
