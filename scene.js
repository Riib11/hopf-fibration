const THREE = require('three');
const ConvexGeometry = require('./ConvexGeometry.js');

const defaultPoint = new THREE.Vector3(1, 0, 0);


// Get discretized fiber over the given point
function getFiberPoints(point = defaultPoint, divisions = 256) {
	const alpha = Math.sqrt((1 + point.y)/2);
	const beta = Math.sqrt((1 - point.y)/2);

	const angleSum = Math.atan2(-point.x, point.z);

	const points = [];
	for (var i = 0; i < divisions+1; i++) {
		const theta = 2*Math.PI * i/divisions;
		const phi = angleSum - theta;

		const proj = 0.5 / (1 - alpha * Math.sin(theta));
		const b = -beta * Math.cos(phi);
		const c = alpha * Math.cos(theta);
		const d = -beta * Math.sin(phi);

		points.push(b*proj, c*proj, d*proj);
	}

	return Float32Array.from(points);
}

function get_fiber_vertices(point = defaultPoint, divisions=250) {
	const alpha = Math.sqrt((1 + point.y)/2);
	const beta = Math.sqrt((1 - point.y)/2);

	const angleSum = Math.atan2(-point.x, point.z);

	const vertices = [];
	for (var i = 0; i < divisions+1; i++) {
		const theta = 2*Math.PI * i/divisions;
		const phi = angleSum - theta;

		const proj = 0.5 / (1 - alpha * Math.sin(theta));
		const b = -beta * Math.cos(phi);
		const c = alpha * Math.cos(theta);
		const d = -beta * Math.sin(phi);

		vertices.push( new THREE.Vector3(b*proj, c*proj, d*proj) );
	}

	return vertices;
}

// Get fiber, rendered as torus, over the given point
function getTorus(point = defaultPoint) {
	const alpha = Math.sqrt((1 + point.y)/2);
	const beta = Math.sqrt((1 - point.y)/2);

	const angleSum = Math.atan2(-point.x, point.z);
	const scale = 0.5;

	
	// Maximum a (theta = 90)
	const left = new THREE.Vector3(
		-beta * Math.sin(angleSum),
		0,
		beta * Math.cos(angleSum)
	);
	left.multiplyScalar(scale / (1 - alpha));

	// Minimum a (theta = -90)
	const right = new THREE.Vector3(
		beta * Math.sin(angleSum),
		0,
		-beta * Math.cos(angleSum)
	);
	right.multiplyScalar(scale / (1 + alpha));

	// Arbitrary point in plane (theta = 0)
	const other = new THREE.Vector3(
		-beta * Math.cos(angleSum),
		alpha,
		-beta * Math.sin(angleSum)
	);
	other.multiplyScalar(scale);

	const center = left.clone();
	center.lerp(right, 0.5);

	right.sub(center);
	other.sub(center);

	// Compute normal to plane
	other.cross(right);
	other.normalize();

	const radius = right.length();

	const segments = Math.max(16, Math.ceil(radius * 64));
	const geometry = new THREE.TorusBufferGeometry(radius, 0.02, 8, segments);

	const torusMaterial = new THREE.MeshLambertMaterial({color: fiberMaterial.color});
	const torusObj = new THREE.Mesh(geometry, torusMaterial);

	torusObj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), other);
	torusObj.position.copy(center);

	return torusObj;
}

function pointToColor(point) {
	const hue = Math.atan2(point.x, point.z) / (2 * Math.PI) + 0.5;
	const lightness = 0.15 * point.y + 0.5;

	const color = new THREE.Color();
	color.setHSL((hue + 2 * lightness) % 1, 0.7, lightness);
	return color;
}

// Update the scene based on the given selection of point on S^2
function update(point) {
	visible = (point !== undefined);

	newPoint.visible = visible;
	newFiber.visible = visible;

	if (visible) {
		const color = pointToColor(point);

		newPoint.position.copy(point);
		newPoint.material.color.copy(color);

		newFiber.geometry.attributes.position.copyArray(getFiberPoints(point));
		newFiber.geometry.attributes.position.needsUpdate = true;
		newFiber.material.color.copy(color);
	}
}

// Add the currently selected point
function addPoint() {
	if (newPoint.visible) {
		// Add new point
		const addedPointMaterial = new THREE.MeshBasicMaterial({color: newPointMaterial.color});
		const addedPoint = new THREE.Mesh(newPointGeo, addedPointMaterial);
		addedPoint.position.copy(newPoint.position);
		inset.add(addedPoint);

		// Add new torus
		const addedFiber = getTorus(newPoint.position);
		scene.add(addedFiber);
	}
}

function addInsetLine(points, color) {
	var lineGeometry = new THREE.Geometry()
	for (var i = 0; i < points.length; i++) { lineGeometry.vertices.push(points[i]) }
	const lineMaterial = new THREE.LineBasicMaterial({ color: color, linewidth: 10 })
	const line = new THREE.Line(lineGeometry, lineMaterial)
	inset.add(line)
}

function addInsetPointAt(point) {
	// Add new point
	const addedPointMaterial = new THREE.MeshBasicMaterial({color: pointToColor(point)});
	const addedPoint = new THREE.Mesh(newPointGeo, addedPointMaterial);
	addedPoint.position.copy(point);
	inset.add(addedPoint);
}


/***** Main Scene *****/
const scene = new THREE.Scene();

const fiberGeo = new THREE.BufferGeometry();
fiberGeo.addAttribute('position', new THREE.BufferAttribute(getFiberPoints(), 3));
const fiberMaterial = new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 5});
const newFiber = new THREE.Line(fiberGeo, fiberMaterial);
scene.add(newFiber);

var light = new THREE.PointLight( 0xffffff, 0.0, 100 )

var light1 = new THREE.PointLight( 0xffffff, 1, 100);
light1.position.set(-10, 0, 0)
scene.add( light1 );

var light2 = new THREE.PointLight( 0xffffff, 1, 100);
light2.position.set(10, 0, 0)
scene.add( light2 );

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);


/***** Inset Scene *****/
const inset = new THREE.Scene();

const sphereGeo = new THREE.SphereBufferGeometry(1, 64, 32);
const sphereMaterial = new THREE.MeshLambertMaterial({color: 0x444444, transparent: true, opacity: 0.6});
const sphere = new THREE.Mesh(sphereGeo, sphereMaterial);
inset.add(sphere);

const axesGeo = new THREE.BufferGeometry();
const axesGeoPoints = new Float32Array([
	0.0, 0.0, 0.0,
	0.5, 0.0, 0.0,
	0.0, 0.0, 0.0,
	0.0, 0.5, 0.0,
	0.0, 0.0, 0.0,
	0.0, 0.0, 0.5,
]);
axesGeo.addAttribute('position', new THREE.BufferAttribute(axesGeoPoints, 3));
const axesMaterial = new THREE.LineBasicMaterial({color: 0x888888, linewidth: 3});
const axes = new THREE.LineSegments(axesGeo, axesMaterial);
inset.add(axes);

const newPointGeo = new THREE.SphereBufferGeometry(0.02, 32, 16);
const newPointMaterial = new THREE.MeshBasicMaterial();
const newPoint = new THREE.Mesh(newPointGeo, newPointMaterial);
inset.add(newPoint);


// Lighting
const insetAmbientLight = new THREE.AmbientLight(0xffffff);
inset.add(insetAmbientLight);



exports.scene = scene;
exports.inset = inset;

exports.sphere = sphere;
exports.light = light;

exports.update = update;
exports.addPoint = addPoint;


//
// Demo
//


PI = Math.PI
function sin(theta) { return Math.sin(theta) }
function cos(theta) { return Math.cos(theta) }

function spherical_to_cartesian(r, theta, phi) {
	return new THREE.Vector3( r*sin(phi)*cos(theta), r*sin(phi)*sin(theta), r*cos(phi) )
}

function draw_circle(theta, phi0, phi1, steps=100) {
	for (var i = 0; i < steps; i++) {
		const phi = phi0 + (i/steps) * (phi1 - phi0)
		update(spherical_to_cartesian(1, theta, phi))
		addPoint()
	}
}

function make_band_geometry(vertices1, vertices2) {
	const vs = vertices1.concat(vertices2)
	const m = vertices1.length;
	const n = vertices2.length;
	
	// create geometry
	var geometry = new THREE.Geometry();
	
	// add all vertices
	for (var i = 0; i < vs.length; i++) { geometry.vertices.push(vs[i]); }

	// geometry.faces.push( new THREE.Face3(0,m,m+1))
	
	// add all faces
	for (var i = 0; i < m-1; i++) {
		// geometry.faces.push( new THREE.Face3(0,1,2) );
		geometry.faces.push( new THREE.Face3(i, i+m  , i+m+1) )
		geometry.faces.push( new THREE.Face3(i, i+m+1, i+1  ) )
		/*
     .      .
		 .      .
		 |      |
		i+1 -- m+1
		 |   /  |
		 i /--- m
		 |      |
		 .      .
		 .      .
		*/
	}

	geometry.computeFaceNormals();
	geometry.computeVertexNormals();
	return geometry;
}

function index_to_color(i, i_max) {
	var color = new THREE.Color();
	color.setHSL(i/i_max/2, 0.5, 0.5);
	return color
}

// gets surface of fibers at theta spanning from phi0 to phi1
function make_fibers_surface_at_theta(theta, phi0, phi1, color, steps=100) {
	var fibers = [];
	var inset_points = [];
	for (var i = 0; i < steps; i++) {
		const phi = phi0 + (i/steps) * (phi1 - phi0);
		const point = spherical_to_cartesian(1, theta, phi);
		const fiber_vertices = get_fiber_vertices(point);

		fibers.push(fiber_vertices);
		inset_points.push(point);
	}

	addInsetLine(inset_points, color); // draw inset line

	for (var i = 0; i < fibers.length-1; i++) {
		const fiber0 = fibers[i];
		const fiber1 = fibers[(i+1)%fibers.length];

		const meshMaterial = new THREE.MeshLambertMaterial({ color: color, emissive: 0x222222 });
		const meshGeometry = make_band_geometry(fiber0, fiber1);
		var mesh = new THREE.Mesh( meshGeometry, meshMaterial );
		mesh.material.side = THREE.DoubleSide;
		scene.add( mesh );
	}
}

function make_fibers_surface_at_phi(phi, theta0, theta1, steps=100) {
	var fibers = [];
	var fibers_colors = [];
	for (var i = 0; i < steps; i++) {
		const phi = phi0 + (i/steps) * (phi1 - phi0);
		const point = spherical_to_cartesian(1, theta, phi);
		const color = pointToColor(point);
		const fiber_vertices = get_fiber_vertices(point);
		
		fibers.push(fiber_vertices);
		fibers_colors.push(color);
		
		inset_points.push(point);
	}

	addInsetLine(inset_points, color); // draw inset line

	for (var i = 0; i < fibers.length-1; i++) {
		const fiber0 = fibers[i];
		const fiber1 = fibers[(i+1)%fibers.length];
		const color  = fibers_colors[i];

		const meshMaterial = new THREE.MeshLambertMaterial({ color: color});
		const meshGeometry = make_band_geometry(fiber0, fiber1);
		const mesh = new THREE.Mesh( meshGeometry, meshMaterial );
		mesh.material.side = THREE.BackSide; // back faces
		mesh.renderOrder = 0;
		scene.add( mesh );

		mesh = new THREE.Mesh( meshGeometry, meshMaterial.clone() );
		mesh.material.side = THREE.FrontSide; // front faces
		mesh.renderOrder = 1;
		scene.add( mesh );
	}
}

const thetas  = [0, 1/8, 2/8, 3/8];
const offsets = [0, 1/8, 2/8, 3/8];
for (var i = 0; i < offsets.length; i++) {
	const theta = PI*thetas[i];
	const phi0  = -PI*offsets[i];
	const phi1  = -PI*offsets[i] + PI;
	const color = index_to_color(i, offsets.length);
	make_fibers_surface_at_theta(theta, phi0, phi1, color, steps=40);
}

// draw_circle(  PI/4  , 0 , PI )
// draw_circle( -PI/4  , 0 , PI )

// for (var i = 0; i < 32; i++) {
// 	const theta = 2*Math.PI * i/32;
//     update(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
// 	addPoint();
// }

// for (var i = 10; i < 32; i++) {
// 	const theta = 2*Math.PI * i/32;
//     update(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
// 	addPoint();

//     update(new THREE.Vector3(0.5 * Math.cos(theta), -Math.sqrt(3) / 2, 0.5 * Math.sin(theta)));
// 	addPoint();
// }
