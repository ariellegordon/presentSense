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
      camera: {},
      hrSamples: [],
      stepSamples: [],
      sleepSamples: [],
      key: 0
    };
    // this.getHR = this.getHR.bind(this);
    // this.getSteps = this.getSteps.bind(this);
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
    let sleepSampleLength = this.props.sleepSamples.length;
    let moodSampleLength = this.props.moodSamples.length;

    function init() {
      camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
      camera.position.y = 0;
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
      heartGeometry = GeometrySetup({ limit: heartSampleLength }, 1, 0.5);
      heartMaterial.vertexColors = THREE.VertexColors;

      heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);

      scene.add(heartMesh);
      ///-----------------------------------------------------
      sleepMaterial = new THREE.MeshPhongMaterial({
        color: 0x0043af,
        side: THREE.DoubleSide,
        flatShading: true,
        vertexColors: THREE.VertexColors,
        shininess: 0
      });
      sleepGeometry = GeometrySetup({ limit: sleepSampleLength }, 11, 1);
      sleepMaterial.vertexColors = THREE.VertexColors;
      sleepMesh = new THREE.Mesh(sleepGeometry, sleepMaterial);
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

      scene.add(stepMesh);
      //--------------------------------------------------
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
      scene.add(moodMesh);
      //-------------------------------------------------------
      //debug cube
      cubeGeometry = new THREE.BoxGeometry(20, 20, 20);
      cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x0f0ff0 });
      cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
      scene.add(cubeMesh);
    }

    const animate = () => {
      this.requestId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
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
      if (this.state.sleepSamples && this.state.sleepSamples.length) {
        console.log("Sleeps!", this.state.sleepSamples);
        sleepGeometry.verticesNeedUpdate = true;
        sleepGeometry.colorsNeedUpdate = true;
        MeshAnimator(
          sleepGeometry,
          { limit: sleepSampleLength },
          this.state.sleepSamples,
          clock,
          10, //scale
          0.5 //z index
        );
        sleepGeometry.verticesNeedUpdate = true;
      }
      //--------------------------------------------------
      if (this.props.moodSamples && this.props.moodSamples.length) {
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
      //----------------------------------------------
      //move cube to touch position
      cubeMesh.position.set(this.state.touchPos.x, this.state.touchPos.y, 0);
      //console.log("cube pose", cubeMesh.position);
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
      touchPos: { x: vProjectedMousePos.x, y: vProjectedMousePos.y }
    });
  }
  render() {
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
      </View>
    );
  }
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center"
  },
  webglView: {
    width: width,
    height: height
  }
});

//getting our actions on props
// const mapDispatchToProps = dispatch => {
//   return {
//     fetchLatestHeartRate: heartOptions =>
//       dispatch(fetchLatestHeartRate(heartOptions)),
//     fetchHeartRateOverTime: heartOptions =>
//       dispatch(fetchHeartRateOverTime(heartOptions)),
//     fetchLatestSteps: stepOptions => dispatch(fetchLatestSteps(stepOptions))
//   };
// };

const mapStateToProps = state => {
  return {
    hrSamples: state.heartRate.hrSamples,
    stepSamples: state.steps,
    sleepSamples: state.sleep,
    moodSamples: state.mood
  };
};

export default connect(
  mapStateToProps,
  null
)(Heartrate);
