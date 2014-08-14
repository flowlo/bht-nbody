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

var dt;
var m = { min: 0, max: 1e10 };

DEBUG = 0;

function BHTree(width, height, bodies, stats) {
	this.stats = { enabled: true, depth: 0, nodes: 0, leaves: 0, checks: 0 };
	this.root = {
		elements: [],
		leaf: true,
		box: {
			x: { min: 0, max: width },
			y: { min: 0, max: height }
		}
	};

	for (var i = 0; i < bodies.length; i++)
		if (bodies[i].x >= 0 && bodies[i].x <= width && bodies[i].y >= 0 && bodies[i].y <= height)
			this.bnAddBody(this.root, i);

	for (var i = 0; i < bodies.length; i++)
		this.doBNtreeRecurse(i, this.root);

	if (stats) this.collect(this.root, 0);
};

BHTree.prototype.collect = function(node, depth) {
	if (!node) return;

	this.stats.nodes++;
	this.stats.depth = Math.max(depth, this.stats.depth);

	this.stats.leaves += node.leaf;

	for (var i = 0; i < 4 && !node.leaf; i++)
		this.collect(node.elements[i], depth + 1);
};

BHTree.prototype.free = function(node) {
	if (!node) return;

	if (!node.leaf) node.elements.forEach(free);

	delete node.elements;
	delete node.box;
};

BHTree.prototype.bnAddBody = function(node, i) {
	if (node.elements.length === 0) {
		node.elements = [ i ];
		node.com = { m: bodies[i].m, x: bodies[i].x, y: bodies[i].y };
		return;
	}

	var quad = (bodies[i].x >= (node.box.x.min + node.box.x.max) / 2)
		 + (bodies[i].y >= (node.box.y.min + node.box.y.max) / 2) * 2;

	if (node.elements[quad] && !node.leaf) {
		this.bnAddBody(node.elements[quad], i);
	} else {
		var child = {
			elements: [ i ],
			leaf: true,
			com : { m: bodies[i].m, x: bodies[i].x, y: bodies[i].y }
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

	node.com.x = (node.com.x * node.com.m + bodies[i].x * bodies[i].m) / (node.com.m + bodies[i].m);
	node.com.y = (node.com.y * node.com.m + bodies[i].y * bodies[i].m) / (node.com.m + bodies[i].m);
	node.com.m += bodies[i].m;
};

BHTree.prototype.doBNtreeRecurse = function(bI, node) {
	if (!node) return;

	if (node.leaf) {
		stats.checks += node.elements.length;

		for (var k = 0; k < node.elements.length; k++)
			if (bI != node.elements[k])
				this.setAccel(bI, node.elements[k], false);
	} else {
		var s = Math.min(node.box.x.max - node.box.x.min,
			         node.box.y.max - node.box.y.min),
		    d = this.distance(bodies[bI], node.com);

		if (s / d < BN_THETA) {
			this.setAccelDirect(bI, node.com)
			stats.checks++;
		} else {
			for (var k = 0; k < 4; k++)
				this.doBNtreeRecurse(bI, node.elements[k]);
		}
	}
};

BHTree.prototype.setAccel = function(i, j, both) {
	if (arguments.length < 3)
		both = true;

	var F = this.getForceVecDirect(bodies[i], bodies[j]);

	bodies[i].a.x += F.x / bodies[i].m;
	bodies[i].a.y += F.y / bodies[i].m;

	if (both) {
		bodies[j].a.x -= F.x / bodies[j].m;
		bodies[j].a.y -= F.y / bodies[j].m;
	}
};

BHTree.prototype.setAccelDirect = function(i, other) {
	var F = this.getForceVecDirect(bodies[i], other);

	bodies[i].a.x += F.x / bodies[i].m;
	bodies[i].a.y += F.y / bodies[i].m;
};

BHTree.prototype.getForceVecDirect = function(a, b) {
	var dx = b.x - a.x;
	var dy = b.y - a.y;
	var r = (this.distance(a, b) + ETA) * DISTANCE_MULTIPLE;
	// F_{x|y} = d_{x|y} / r * G * M * m / r^3
	var F = G * a.m * b.m / Math.pow(r, GFACTOR + 1);

	return { x: F * dx, y: F * dy };
};

BHTree.prototype.distance = function(a, b) {
	return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
};

BHTree.prototype.getStats = function() {
	return this.stats;
};
