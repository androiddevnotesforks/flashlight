import {
  AveragedTestCaseResult,
  Measure,
  POLLING_INTERVAL,
  TestCaseIterationResult,
  TestCaseResult,
} from "@perf-profiler/types";
import { mapValues } from "lodash";
import { getHighCpuUsage } from "./highCpu";

const range = (n: number) =>
  Array(n)
    .fill(null)
    .map((_, i) => i);

export function average(arr: number[]): number;
export function average(arr: (number | undefined)[]): number | undefined;
export function average(arr: (number | undefined)[] | number[]): number | undefined {
  if (arr.length === 0) return undefined;

  let sum = 0;

  for (const elt of arr) {
    if (elt === undefined) return undefined;
    sum += elt;
  }

  return sum / arr.length;
}

const averageMaps = (maps: { [key: string]: number }[]): { [key: string]: number } => {
  const totalByThread = maps.reduce((aggr, map) => {
    Object.keys(map).forEach((key) => {
      aggr[key] = aggr[key] || 0;
      aggr[key] += map[key];
    });
    return aggr;
  }, {});

  return mapValues(totalByThread, (value) => value / maps.length);
};

const averageMeasures = (measures: Measure[]): Measure => {
  return {
    cpu: {
      perCore: {},
      perName: averageMaps(measures.map((m) => m.cpu.perName)),
    },
    ram: average(measures.map((m) => m.ram)),
    fps: average(measures.map((m) => m.fps)),
    time: POLLING_INTERVAL,
  };
};

export const averageIterations = (results: TestCaseIterationResult[]): TestCaseIterationResult => {
  const minLength =
    results.length > 0 ? Math.min(...results.map((result) => result.measures.length)) : 0;

  return {
    measures: range(minLength).map((i) =>
      averageMeasures(results.map((result) => result.measures[i]))
    ),
    time: average(results.map((result) => result.time)),
    status: "SUCCESS",
  };
};

export const averageHighCpuUsage = (results: TestCaseIterationResult[], cpuUsageThreshold = 90) => {
  return averageMaps(results.map((result) => getHighCpuUsage(result.measures, cpuUsageThreshold)));
};

export const averageTestCaseResult = (result: TestCaseResult): AveragedTestCaseResult => {
  const averagedIterations = averageIterations(result.iterations);

  return {
    ...result,
    average: averagedIterations,
    averageHighCpuUsage: averageHighCpuUsage(result.iterations),
  };
};
