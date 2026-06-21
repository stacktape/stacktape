import Database_ from './database';
import InfluxDBCluster_ from './influxDbCluster';
import InfluxDBInstance_ from './influxDbInstance';
import ScheduledQuery_ from './scheduledQuery';
import Table_ from './table';
export namespace Timestream {
  export const Database = Database_;
  export const InfluxDBCluster = InfluxDBCluster_;
  export const InfluxDBInstance = InfluxDBInstance_;
  export const ScheduledQuery = ScheduledQuery_;
  export const Table = Table_;
  export type Database = Database_;
  export type InfluxDBCluster = InfluxDBCluster_;
  export type InfluxDBInstance = InfluxDBInstance_;
  export type ScheduledQuery = ScheduledQuery_;
  export type Table = Table_;
}
