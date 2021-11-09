import './style.css'

import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let camera, scene, renderer;
let controls, water, sun;

const loader = new GLTFLoader();

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Boat {
  constructor(){
    loader.load("https://github.com/0shuvo0/ocean-cleaner/raw/main/assets/boat/scene.gltf", (gltf) => {
      scene.add( gltf.scene )
      gltf.scene.scale.set(3, 3, 3)
      gltf.scene.position.set(5,13,50)
      gltf.scene.rotation.y = 1.5

      this.boat = gltf.scene
      this.speed = {
        vel: 0,
        rot: 0
      }
    })
  }

  stop(){
    this.speed.vel = 0
    this.speed.rot = 0
  }

  update(){
    if(this.boat){
      this.boat.rotation.y += this.speed.rot
      this.boat.translateX(this.speed.vel)
    }
  }
}

const boat = new Boat()


class Trash{
  constructor(_scene){
    scene.add( _scene )
    _scene.scale.set(1.5, 1.5, 1.5)
    if(Math.random() > .6){
      _scene.position.set(random(-100, 100), -.5, random(-100, 100))
    }else{
      _scene.position.set(random(-500, 500), -.5, random(-1000, 1000))
    }

    this.trash = _scene
  }
}

async function loadModel(url){
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      resolve(gltf.scene)
    })
  })
}

let boatModel = null
async function createTrash(){
  if(!boatModel){
    boatModel = await loadModel("https://github.com/0shuvo0/ocean-cleaner/raw/main/assets/trash/scene.gltf")
  }
  return new Trash(boatModel.clone())
}

let trashes = []
const TRASH_COUNT = 500

init();
animate();

async function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild( renderer.domElement );

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 20000 );
  camera.position.set( 30, 30, 100 );

  sun = new THREE.Vector3();

  // Water

  const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load( "https://github.com/0shuvo0/ocean-cleaner/blob/main/assets/waternormals.jpg?raw=true", function ( texture ) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      } ),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = - Math.PI / 2;

  scene.add( water );

  // Skybox

  const sky = new Sky();
  sky.scale.setScalar( 10000 );
  scene.add( sky );

  const skyUniforms = sky.material.uniforms;

  skyUniforms[ 'turbidity' ].value = 10;
  skyUniforms[ 'rayleigh' ].value = 2;
  skyUniforms[ 'mieCoefficient' ].value = 0.005;
  skyUniforms[ 'mieDirectionalG' ].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  const pmremGenerator = new THREE.PMREMGenerator( renderer );

  function updateSun() {

    const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
    const theta = THREE.MathUtils.degToRad( parameters.azimuth );

    sun.setFromSphericalCoords( 1, phi, theta );

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

    scene.environment = pmremGenerator.fromScene( sky ).texture;

  }

  updateSun();

  controls = new OrbitControls( camera, renderer.domElement );
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set( 0, 10, 0 );
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();

  const waterUniforms = water.material.uniforms;

  for(let i = 0; i < TRASH_COUNT; i++){
    const trash = await createTrash()
    trashes.push(trash)
  }

  window.addEventListener( 'resize', onWindowResize );

  window.addEventListener( 'keydown', function(e){
    if(e.key == "ArrowUp"){
      boat.speed.vel = 1
    }
    if(e.key == "ArrowDown"){
      boat.speed.vel = -1
    }
    if(e.key == "ArrowRight"){
      boat.speed.rot = -0.1
    }
    if(e.key == "ArrowLeft"){
      boat.speed.rot = 0.1
    }
  })
  window.addEventListener( 'keyup', function(e){
    boat.stop()
  })

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

function isColliding(obj1, obj2){
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 15 &&
    Math.abs(obj1.position.z - obj2.position.z) < 15
  )
}

function checkCollisions(){
  if(boat.boat){
    trashes.forEach(trash => {
      console.log("hello")
      if(trash.trash){
        if(isColliding(boat.boat, trash.trash)){
          scene.remove(trash.trash)
        }
      }
    })
  }
}

function animate() {
  requestAnimationFrame( animate );
  render();
  boat.update()
  checkCollisions()
}

function render() {
  water.material.uniforms[ 'time' ].value += 1.0 / 60.0;

  renderer.render( scene, camera );

}