window.onload = function () { document.querySelector('input[type=file]').addEventListener('change', function(evt) {
	var files = evt.target.files; // FileList object

	// files is a FileList of File objects. List some properties.
	var output = [];
	for (var i = 0, f; f = files[i]; i++) {
		output.push('<li><strong>', f.name, '</strong> (', f.type || 'n/a', ') - ',
		f.size, ' bytes, last modified: ',
		f.lastModifiedDate.toLocaleDateString(), '</li>');

		var reader = new FileReader();

		reader.onload = function(e) {
			loadSysFromJSON(JSON.parse(e.target.result));
		};

		reader.onerror = errorHandler;
		reader.readAsText(f);
	}
	document.getElementById('fileList').innerHTML = '<ul>' + output.join('') + '</ul>';
}, false);
};

function errorHandler(evt) {
	switch(evt.target.error.code) {
		case evt.target.error.NOT_FOUND_ERR:
			alert('File Not Found!');
			break;
		case evt.target.error.NOT_READABLE_ERR:
			alert('File is not readable');
			break;
		case evt.target.error.ABORT_ERR:
			break; // noop
		case evt.target.error.SECURITY_ERR:
			alert('File Security Error, If running locally (ie. \'file://\' then need --allow-file-access-from-files for browser)');
			break;
		default:
			alert('An error occurred reading this file.');
	};
}

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
