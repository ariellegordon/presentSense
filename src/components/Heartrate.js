import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity
} from "react-native";
import { Button } from "react-native-elements";
import Carousel from "react-native-snap-carousel";
import { connect } from "react-redux";
import { WebGLView } from "react-native-webgl";
import THREE from "./meshUtilities/three.js";
import CameraHelper, { screenToWorld } from "./meshUtilities/screenToWorld";
import moment from "moment";
//mesh utilities
import {
  GeometrySetup,
  MeshAnimator,
  HeartMeshAnimator,
  MoodMeshAnimator
} from "./meshUtilities/ringMesh";
//these actions should let us talk to healthkit
// import {
//   fetchLatestHeartRate,
//   fetchHeartRateOverTime
// } from "../store/heartrate";
// import { fetchLatestSteps } from "../store/steps";
//starting options for heart rate gatherer
const { width, height } = Dimensions.get("window");
// let heartOptions = {
//   unit: "bpm", // optional; default 'bpm'
//   startDate: new Date(2017, 4, 20).toISOString(), // required
//   endDate: new Date().toISOString(), // optional; default now
//   ascending: false, // optional; default false
//   limit: 10 // optional; default no limit
// };
// let stepOptions = {
//   startDate: new Date(2018, 5, 20).toISOString(), // required
//   endDate: new Date().toISOString()
// };

class Heartrate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      touchPos: { x: 0, y: 0 },
      prevTouch: { x: 0, y: 0 },
      camera: {},
      hrSamples: [],
      stepSamples: [],
      sleepSamples: [],
      key: 0,
      lastSelected: 0,
      meshName: ""
    };

    this.onContextCreate = this.onContextCreate.bind(this);
    this.interpolateArray = this.interpolateArray.bind(this);
    this.handleTouch = this.handleTouch.bind(this);
  }

  componentDidMount() {}
  static getDerivedStateFromProps(props, state) {
    if (
      props.hrSamples !== state.hrSamples ||
      props.sleepSamples.length !== state.sleepSamples.length
    ) {
      console.log("COMPONENT SHOULD UPDATE");
      const convertSleep = data => {
        data = data.map(datum => {
          const start = moment(new Date(datum.startDate.slice(0, -5)));
          const end = moment(new Date(datum.endDate.slice(0, -5)));
          let diff = end.diff(start, "hours", true);
          console.log("whats the difference", diff, start, end);
          const newDatum = {
            value: diff,
            startDate: datum.startDate,
            endDate: datum.endDate
          };
          return newDatum;
        });
        //this.setState({ sleepSamples: data });
        return data;
      };

      let convertedSleep = convertSleep(props.sleepSamples);
      return {
        hrSamples: props.hrSamples,
        sleepSamples: convertedSleep
      };
    }
    console.log("null????????");
    return null;
  }
  componentWillUnmount() {
    cancelAnimationFrame();
  }
  onContextCreate = (gl: WebGLRenderingContext) => {
    const rngl = gl.getExtension("RN");
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const clock = new THREE.Clock();
    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width,
        height,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientHeight: height
      },
      context: gl
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 1);
    let camera;
    let scene;

    let heartGeometry;
    let heartMesh;
    let heartMaterial;

    let stepGeometry;
    let stepMesh;
    let stepMaterial;

    let moodGeometry;
    let moodMesh;
    let moodMaterial;

    let sleepGeometry;
    let sleepMesh;
    let sleepMaterial;

    let cubeGeometry;
    let cubeMesh;
    let cubeMaterial;
    let heartSampleLength = this.props.hrSamples.length;
    let stepSampleLength = this.props.stepSamples.length;
    let sleepSamples = this.props.sleepSamples;
    let sleepSampleLength = this.props.sleepSamples.length;
    let moodSamples = this.props.moodSamples;
    let moodSampleLength = this.props.moodSamples.length;

    // let raycaster;
    // let direction;
    let originalColors = {};
    let lastSelected;
    let gotSelected;

    let raycaster = new THREE.Raycaster();
    const init = () => {
      camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
      camera.position.y = -50;
      camera.position.z = 500;
      scene = new THREE.Scene();

      let light = new THREE.AmbientLight(0x404040, 3.7); // soft white light
      scene.add(light);

      heartMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        flatShading: true,
        vertexColors: THREE.VertexColors,
        shininess: 0
      });
      //re set up heart options:
      heartGeometry = GeometrySetup({ limit: heartSampleLength }, 1, 1);
      heartMaterial.vertexColors = THREE.VertexColors;

      heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);
      heartMesh.name = "Heartrate";
      scene.add(heartMesh);
      ///-----------------------------------------------------

      sleepMaterial = new THREE.MeshPhongMaterial({
        color: 0x387eff,
        side: THREE.DoubleSide,
        flatShading: true,
        vertexColors: THREE.VertexColors,
        shininess: 0
      });
      sleepGeometry = GeometrySetup(
        { limit: Math.max(3, sleepSampleLength) },
        11,
        -3
      );
      sleepMaterial.vertexColors = THREE.VertexColors;
      sleepMesh = new THREE.Mesh(sleepGeometry, sleepMaterial);
      sleepMesh.name = "Sleep";
      scene.add(sleepMesh);

      //--------------------------------------------------------
      stepMaterial = new THREE.MeshPhongMaterial({
        color: 0x28b7ae,
        side: THREE.DoubleSide,
        flatShading: true,
        vertexColors: THREE.VertexColors,
        shininess: 0
      });
      stepGeometry = GeometrySetup({ limit: stepSampleLength }, 1, 2);
      stepMaterial.vertexColors = THREE.VertexColors;

      stepMesh = new THREE.Mesh(stepGeometry, stepMaterial);
      stepMesh.name = "Steps";
      scene.add(stepMesh);
      //--------------------------------------------------
      if (moodSamples && moodSampleLength > 3) {
        moodMaterial = new THREE.MeshPhongMaterial({
          color: 0x82f2ad,
          side: THREE.DoubleSide,
          flatShading: true,
          vertexColors: THREE.VertexColors,
          shininess: 0
        });
        moodGeometry = GeometrySetup({ limit: moodSampleLength }, 3, 3);
        moodMaterial.vertexColors = THREE.VertexColors;
        moodMesh = new THREE.Mesh(moodGeometry, moodMaterial);
        moodMesh.name = "Mood";
        scene.add(moodMesh);
      }

      //-------------------------------------------------------
      //debug cube
      cubeGeometry = new THREE.BoxGeometry(20, 20, 20);
      cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x0f0ff0 });
      cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
      scene.add(cubeMesh);

      for (let i = 0; i < scene.children.length; i++) {
        if (
          scene.children[i].type === "Mesh" &&
          scene.children[i].name &&
          scene.children[i].name.length
        ) {
          //console.log("material???", scene.children[i].material);
          originalColors[scene.children[i].id] = {
            r: scene.children[i].material.color.r,
            g: scene.children[i].material.color.g,
            b: scene.children[i].material.color.b
          };
        }
      }
    };

    const animate = () => {
      this.requestId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
      heartGeometry.colorsNeedUpdate = true;
      stepGeometry.colorsNeedUpdate = true;
      moodGeometry.colorsNeedUpdate = true;
      sleepGeometry.colorsNeedUpdate = true;
      cubeMesh.position.set(this.state.touchPos.x, this.state.touchPos.y, 30);
      raycaster.set(
        new THREE.Vector3(this.state.touchPos.x, this.state.touchPos.y, 10),
        new THREE.Vector3(0, 0, -1)
      );
      //filter scene children?
      let myMeshes = scene.children.filter(child => {
        if (originalColors.hasOwnProperty(child.id)) {
          return child;
        }
      });
      if (lastSelected && lastSelected.id) {
        gotSelected = lastSelected;
      }
      for (let i = 0; i < myMeshes.length; i++) {
        console.log(
          "my meshhhh",
          myMeshes[i].id,
          typeof myMeshes[i].id,
          this.state.lastSelected
        );
        if (
          myMeshes[i].id === this.state.lastSelected ||
          myMeshes[i].name === this.state.meshName
        ) {
          //console.log("GOT IT!");
          myMeshes[i].material.color.setRGB(0.807, 1, 0.219);
        } else {
          myMeshes[i].material.color.setRGB(
            originalColors[myMeshes[i].id].r,
            originalColors[myMeshes[i].id].g,
            originalColors[myMeshes[i].id].b
          );
        }
      }
      if (this.state.lastSelected) {
        let lastSelectedMesh = myMeshes.filter(
          mesh => mesh.id === this.state.lastSelected
        )[0];
      }
      console.log("STATE??", typeof this.state.lastSelected);

      let intersects = raycaster.intersectObjects(myMeshes);
      console.log("INTERSECTIONS", intersects.length);
      if (intersects[0] && this.state.lastSelected === 0) {
        lastSelected = intersects[intersects.length - 1];
        lastSelected.object.material.color.setRGB(0.807, 1, 0.219);
        console.log("ID???", lastSelected.object.id);
        this.setState({
          lastSelected: lastSelected.object.id,
          meshName: lastSelected.object.name
        });
      }

      //------------------------------------------------------
      if (this.props.hrSamples && this.props.hrSamples.length) {
        heartGeometry.verticesNeedUpdate = true;
        heartGeometry.colorsNeedUpdate = true;
        HeartMeshAnimator(
          heartGeometry,
          { limit: heartSampleLength },
          this.props.hrSamples,
          clock,
          1, //scale
          1 //z index
        );
      }
      //----------------------------------------------
      if (this.props.stepSamples && this.props.stepSamples.length) {
        stepGeometry.verticesNeedUpdate = true;
        stepGeometry.colorsNeedUpdate = true;
        MeshAnimator(
          stepGeometry,
          { limit: stepSampleLength },
          this.props.stepSamples,
          clock,
          0.01, //scale
          0 //z index
        );
        stepGeometry.verticesNeedUpdate = true;
      }
      //--------------------------------------------
      // if (sleepSamples && sleepSampleLength > 0) {
      //   //console.log("Sleeps!", this.state.sleepSamples);
      sleepGeometry.verticesNeedUpdate = true;
      sleepGeometry.colorsNeedUpdate = true;
      MoodMeshAnimator(
        sleepGeometry,
        { limit: sleepSampleLength },
        this.state.sleepSamples,
        clock,
        10, //scale
        -3 //z index
      );
      sleepGeometry.verticesNeedUpdate = true;
      // }
      // //--------------------------------------------------
      if (moodSamples && moodSampleLength > 3) {
        moodGeometry.verticesNeedUpdate = true;
        moodGeometry.colorsNeedUpdate = true;
        MoodMeshAnimator(
          moodGeometry,
          { limit: moodSampleLength },
          this.props.moodSamples,
          clock,
          40, //scale
          -2 //z index
        );
        moodGeometry.verticesNeedUpdate = true;
      }

      gl.flush();
      rngl.endFrame();
    };
    init();
    animate();
  };
  interpolateArray(data, fitCount) {
    let linearInterpolate = function(before, after, atPoint) {
      return before + (after - before) * atPoint;
    };

    let newData = new Array();
    let springFactor = new Number((data.length - 1) / (fitCount - 1));
    newData[0] = data[0]; // for new allocation
    for (let i = 1; i < fitCount - 1; i++) {
      let tmp = i * springFactor;
      let before = new Number(Math.floor(tmp)).toFixed();
      let after = new Number(Math.ceil(tmp)).toFixed();
      let atPoint = tmp - before;
      newData[i] = linearInterpolate(data[before], data[after], atPoint);
    }
    newData[fitCount - 1] = data[data.length - 1]; // for new allocation
    return newData;
  }

  handleTouch(event) {
    let camera = new THREE.PerspectiveCamera(
      75,
      Dimensions.get("window").width / Dimensions.get("window").height,
      1,
      1100
    );
    const { width, height } = Dimensions.get("screen");
    camera.position.y = 0;
    camera.position.z = 500;

    let Helper = new CameraHelper();
    let vProjectedMousePos = new THREE.Vector3();

    Helper.Compute(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY,
      camera,
      vProjectedMousePos,
      width,
      height
    );

    this.setState({
      touchPos: { x: vProjectedMousePos.x, y: vProjectedMousePos.y },
      lastSelected: 0,
      meshName: ""
    });
  }
  render() {
    let visInfo;
    if (this.state.meshName.length && this.state.lastSelected !== 0) {
      visInfo = "Selected: " + this.state.meshName;
    } else {
      visInfo = `Wellness Data for ${this.props.name}`;
    }
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={event => this.handleTouch(event)}>
          <View key={this.props.stepSamples.length}>
            <WebGLView
              style={styles.webglView}
              onContextCreate={this.onContextCreate}
            />
          </View>
        </TouchableOpacity>
        <View style={styles.infoBar}>
          <Text style={{ fontSize: 22, fontWeight: "500", color: "#232323" }}>
            {visInfo}
          </Text>
        </View>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    display: "flex",
    flex: 1,
    position: "absolute",
    backgroundColor: "#fff",
    alignItems: "center"
  },
  infoBar: {
    flex: 0.1,
    position: "absolute",
    margin: "auto",
    width: width,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#C8F8EE43",
    paddingTop: height * 0.05,
    paddingBottom: height * 0.05
    //fontSize: 18
  },
  webglView: {
    width: width,
    height: height
  }
});

const mapStateToProps = state => {
  return {
    hrSamples: state.heartRate.hrSamples,
    stepSamples: state.steps,
    sleepSamples: state.sleep,
    moodSamples: state.mood,
    name: state.firestoreStore.preferences.name
  };
};

export default connect(
  mapStateToProps,
  null
)(Heartrate);
