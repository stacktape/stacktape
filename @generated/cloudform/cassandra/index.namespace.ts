import Keyspace_ from './keyspace';
import Table_ from './table';
import Type_ from './type';
export namespace Cassandra {
  export const Keyspace = Keyspace_;
  export const Table = Table_;
  export const Type = Type_;
  export type Keyspace = Keyspace_;
  export type Table = Table_;
  export type Type = Type_;
}
