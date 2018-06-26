import React from "react";
import { View, Text, ART, StyleSheet, Dimensions } from "react-native";
const { Surface, Group, Shape } = ART;
import { scaleLinear, scaleTime } from "d3-scale";
import { connect } from "react-redux";
import { line } from "d3-shape";
import * as d3Array from "d3-array";
import * as d3 from "d3";

//thunks we're gonna need
import {
  fetchHeartRateOverTime,
  fetchLatestHeartRate
} from "../store/heartrate";
import { fetchLatestSteps } from "../store/steps";
import StepsGraph from "./StepsGraph";

class Graphmaker extends React.Component {
  constructor(props) {
    super(props);
    //arrays for all the types of data we are expecting
    this.state = {
      steps: [],
      heartRate: []
    };
    this.getSteps = this.getSteps.bind(this);
    this.getHeartRate = this.getHeartRate.bind(this);
  }
  componentDidMount() {
    if (!this.props.heartRateSamples) {
      this.props.fetchHeartRateOverTime(queryOptions);
      this.setState({ heartRate: this.props.heartRateSamples });
    }
    if (!this.props.stepSamples) {
      this.props.fetchStepsOverTime(queryOptions);
      this.setState({ steps: this.props.stepSamples });
    }
  }
  newQueryOptions() {
    queryOptions = { ...queryOptions, endDate: new Date().toISOString() };
  }
  async getSteps() {
    try {
    } catch (err) {
      console.log("error gettting steps", err);
    }
  }
  getHeartRate() {
    this.newQueryOptions();
    this.props.fetchHeartRateOverTime(heartOptions);
  }
  render() {
    const graphContent =(
      <View>
      <StepsGraph
        startDate={}
        endDate={}
        data={{steps: this.props.stepSamples || [], heartRate: this.props.heartRateSamples || []}}/>
      </View>
      );
    const noData = <Text>nope :(</Text>
    return this.props.heartRateSamples && this.props.stepSamples ? graphContent : noData
  }
}
const mapDispatchToProps = dispatch => {
  return {
    fetchHeartRateOverTime: queryOptions =>
      dispatch(fetchHeartRateOverTime(queryOptions)),
    fetchStepsOverTime: queryOptions => dispatch(fetchLatestSteps(queryOptions))
  };
};
const mapStateToProps = state => {
  return {
    heartRateSamples: state.heartRate.hrSamples,
    stepSamples: state.steps
  };
};
