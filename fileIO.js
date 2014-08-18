window.onload = function () {
	document.querySelector('input[type=file]').addEventListener('change', function (e) {
		var reader = new FileReader();

		reader.onload = function(e) {
			loadSysFromJSON(JSON.parse(e.target.result));
		};

		reader.onerror = console.error;
		reader.readAsText(e.target.files[0]);
	});
};

function loadSysFromJSON(jsData) {
	if (jsData.Constants) {
		m.min = jsData.Constants.MINMASS;
		m.max = jsData.Constants.MAXMASS;
		options.tree.g = jsData.Constants.G;
		options.tree.exp = jsData.Constants.GFACTOR;
		options.tree.eta = jsData.Constants.ETA;
	} else {
		m = jsData.m;
		options.tree.g = jsData.g;
		options.tree.exp = jsData.exp;
		options.tree.eta = jsData.eta;
	}

	var bodies, length;
	if (jsData.bodies) {
		bodies = jsData.bodies;
		length = bodies.length;
	} else if (jsData.Bodies && jsData.Bodies.N && jsData.Bodies.BodyData) {
		bodies = jsData.Bodies.BodyData;
		length = jsData.Bodies.N;
	}

	for (var i = 0; i < length; i++) {
		var item = bodies[i];
		Array.isArray(item) ?
			addBody({
				m: item[0],
				x: item[1],
				y: item[2],
				v: { x: item[3], y: item[4] },
				a: { x: 0, y: 0 }
			})
		:
			addBody(item)
		;
	}
	render();
}
