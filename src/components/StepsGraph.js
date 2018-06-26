import React from "react";
import { View, Text, ART, StyleSheet } from "react-native";
const { Surface, Group, Shape } = ART;
import { scaleLinear, scaleTime } from "d3-scale";
import { connect } from "react-redux";
import { line } from "d3-shape";
import * as d3Array from "d3-array";
import * as d3 from "d3";
import { fetchLatestSteps } from "../store/steps";
import AppleHealthKit from "rn-apple-healthkit";

// const d3 = {
//   scale,
//   shape
// };

let stepOptions = {
  startDate: new Date(2018, 5, 1).toISOString(), // required
  endDate: new Date(2018, 5, 8).toISOString() // optional; default now
};

const data = [
  {
    value: 8844,
    date: new Date(2018, 6, 11)
  },
  {
    value: 31334.089178032547,
    date: new Date(2018, 6, 10)
  },
  {
    value: 7200.910821967459,
    date: new Date(2018, 6, 9)
  },
  {
    value: 8306.47278558407,
    date: new Date(2018, 6, 8)
  },
  {
    value: 13022.527214415924,
    date: new Date(2018, 6, 7)
  },
  {
    value: 7505,
    date: new Date(2018, 6, 6)
  },
  {
    value: 7959,
    date: new Date(2018, 6, 5)
  },
  {
    value: 6808.313621096995,
    date: new Date(2018, 6, 4)
  }
];

// const y = scaleLinear()
//   .domain([0, 10000])
//   .range([0, 400]);
// const x = scaleTime()
//   .domain([new Date(2018, 4, 1), new Date(2018, 4, 8)])
//   .range([0, 400]);

// const dataLine = line()
//   .x(function(d) {
//     return x(d.date);
//   })
//   .y(function(d) {
//     return y(d.value);
//   });

//const dataShape = dataLine(data);

class StepsGraph extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      steps: [],
      lineShape: ""
    };
    this.getSteps = this.getSteps.bind(this);
    this.makeGraph = this.makeGraph.bind(this);
  }
  componentDidMount() {
    if (!this.props.steps.length) {
      this.props.fetchLatestSteps(stepOptions);
    }
    this.getSteps();
    this.makeGraph();
  }

  async getSteps() {
    // stepOptions = { ...stepOptions, endDate: new Date() };
    try {
      await this.props.fetchLatestSteps(stepOptions);
      this.setState({ steps: this.props.steps });
    } catch (err) {
      console.log("error gettting steps", err);
    }
  }
  async makeGraph() {
    let stepValues;
    // if (this.props.steps && this.props.steps.length) {
    //   stepValues = this.props.steps.map(step => ({
    //     value: step.value,
    //     startDate: new Date(step.startDate).getTime,
    //     endDate: new Date(step.endDate).getTime
    //   }));
    // } else {
    //   try {
    //     await this.getSteps();
    //     stepValues = this.props.steps.map(step => ({
    //       value: step.value,
    //       startDate: new Date(step.startDate),
    //       endDate: new Date(step.endDate)
    //     }));
    //   } catch (err) {
    //     console.log("error with steps making graph", err);
    //   }
    // }
    try {
      if (!this.props.steps || !this.props.steps.length) {
        //await this.getSteps();

        this.props.fetchLatestSteps(stepOptions);
        stepValues = this.props.steps.map(step => ({
          value: step.value,
          startDate: new Date(step.startDate).getTime(),
          endDate: new Date(step.endDate).getTime()
        }));
      } else {
        stepValues = this.props.steps.map(step => ({
          value: step.value,
          startDate: new Date(step.startDate).getTime(),
          endDate: new Date(step.endDate).getTime()
        }));
      }
      console.log("we have steps?", stepValues);
      for (let i = 0; i < this.props.steps.length; i++) {
        console.log(
          "**",
          this.props.steps[i].endDate.slice(0, -5),
          new Date(this.props.steps[i].endDate.slice(0, -5)),
          new Date(this.props.steps[i].endDate).getTime()
        );
      }
      let minDate = stepValues[0].endDate;
      let maxDate = stepValues[stepValues.length - 1].endDate;
      const y = scaleLinear()
        .domain([0, 10000])
        .range([0, 400]);
      const x = scaleTime()
        .domain([minDate, maxDate])
        .range([0, 400]);
      const lineGraph = line()
        .x(function(d) {
          return x(d.endDate);
        })
        .y(function(d) {
          return y(d.value);
        });
      const lineShape = lineGraph(stepValues);
      console.log("shape of my line", lineShape);
      if (stepValues && stepValues.length) {
        this.setState({ lineShape: lineShape });
      }
      return lineShape;
    } catch (err) {
      console.log("error with steps making graph", err);
    }
    // console.log("step values", stepValues);
  }

  render() {
    // console.log("DO I HAVE PROPS", this.props);
    this.props.steps && this.props.steps.length && !this.state.lineShape.length
      ? this.makeGraph()
      : null;
    const noData = (
      <Text>There does not seem to be data for your step count.</Text>
    );
    const stepData = (
      <View style={styles.container}>
        <Text style={styles.heading}>Your weekly step count</Text>
        <Surface width={400} height={500}>
          <Group x={0} y={0}>
            <Shape d={this.makeGraph} stroke="#000" strokeWidth={1} />
          </Group>
        </Surface>
      </View>
    );

    return this.props.steps && this.props.steps.length ? stepData : noData;
  }
}

const mapStateToProps = state => {
  return {
    steps: state.steps
  };
};

const mapDispatchToProps = dispatch => {
  return {
    fetchLatestSteps: options => dispatch(fetchLatestSteps(options))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StepsGraph);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F2F1",
    // alignItems: 'center',
    justifyContent: "space-between",
    paddingTop: "10%",
    paddingBottom: "10%"
  },
  heading: {
    flex: 1,
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: 30,
    alignItems: "center"
  }
});