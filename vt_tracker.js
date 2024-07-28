import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import { ArcballControls } from "three/examples/jsm/controls/ArcballControls.js";
import { Holistic } from "@mediapipe/holistic";
import { Camera } from "@mediapipe/camera_utils";

const scene = new THREE.Scene();
const loader = new GLTFLoader();
let model = null;

loader.register((parser) => new VRMLoaderPlugin(parser));
loader.load(
	"aya_.vrm",
	(gltf) => {
		const vrm = gltf.userData.vrm;
		scene.add(vrm.scene);
		model = vrm;
	},
	(progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
	(error) => console.error(error),
);

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer();
const controls = new ArcballControls( camera, renderer.domElement );

renderer.setSize( window.innerWidth, window.innerHeight );
window.addEventListener("resize", (e) => {
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
});


const light = new THREE.AmbientLight( 0x404040, 10.0); // soft white light
scene.add( light );

document.body.appendChild( renderer.domElement );

camera.position.set( 0, 1, 1 );
controls.update();
const geometry = new THREE.BoxGeometry( 0.01, 0.01, 0.01 );


let cubes = [];
for(let i = 0; i < 33; i++){
	const material = new THREE.MeshBasicMaterial( { color: (i + 1) * 7 * 255 } );
	const cube = new THREE.Mesh(geometry, material);
	scene.add(cube);
	cubes.push(cube);
}



function animate() {
	renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );

/*
controls.addEventListener( 'change', function () { //TODO make on demand?
	renderer.render( scene, camera );
} );*/



let tovec3 = ({x, y, z}) => new THREE.Vector3(x, y, z);
let vec3 = (x, y, z) => new THREE.Vector3(x, y, z);
let rfv = (v1, v2) => (new THREE.Quaternion()).setFromUnitVectors(v1, v2);
let rfaa = (axis, angle) => (new THREE.Quaternion()).setFromAxisAngle(axis, angle); 

let onResults = (res) => {
	console.log(res);

	if(model){
		/*
		model.humanoid.setRawPose({
			"spine": {"rotation": [
				0, Math.random(), 0, 1.0
			]}
		});*/

		if(res.poseLandmarks){
			let lm = res.za.map(tovec3).map(v => (v.x *= -1, v));;
			//console.log(lm);
			//obj.setFromUnitVectors(vec3(1.0, 0, 0), lm[16].sub(lm[14]).normalize());
			

			let joints = [
				//[pivot, pt, left, right, direction, offset, name]
				[vec3(0, 1, 0), 14, 16, 12, 1, Math.PI, "leftLowerArm"],
				[vec3(0, 1, 0), 13, 15, 11, -1, Math.PI, "rightLowerArm"],
				[vec3(1, 0, 0), 26, 24, 28, 1, Math.PI, "leftLowerLeg"],
				[vec3(1, 0, 0), 25, 23, 27, 1, Math.PI, "rightLowerLeg"],
			]

			let pose = {};
			joints.map(([pivot, pt, l, r, d, offset, name]) => {
				let v1 = lm[l].sub(lm[pt]).normalize();
				let v2 = lm[r].sub(lm[pt]).normalize();
				let bend = rfaa(pivot, d * (Math.acos(v1.dot(v2)) - offset));
				pose[name] =  {"rotation": bend.toArray()};
			});

			model.humanoid.setRawPose(pose);

			//model.humanoid.setRawPose({"leftUpperArm": {"rotation": obj.toArray()}});
		}



		res.poseLandmarks?.map((v, i) => {
			cubes[i].position.set(v.x, 1.0 - v.y, v.z);
		});
	}
}

let holistic = new Holistic({
	runtime: "tfjs",
	locateFile: (path) => {
		return `node_modules/@mediapipe/holistic/${path}`;
	}
});

holistic.setOptions({
	modelComplexity: 1,
	smoothLandmarks: false,
	minDetectionConfidence: 0.7,
	minTrackingConfidence: 0.5,
});

holistic.onResults(onResults);

let video_element = document.createElement("video");
video_element.width = 1280;
video_element.height = 720;

const mpcamera = new Camera(video_element, {
  onFrame: async () => {
    await holistic.send({image: video_element});
  },
  width: 1280,
  height: 720
});

mpcamera.start();
