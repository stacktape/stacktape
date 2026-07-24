# Stacktape v4 migration matrix

This matrix is the orchestrator-owned ledger for behavior, review, integration, and remaining risk. Slice agents may
propose entries in their handoff, but only the orchestrator updates this file on `v4/integration`.

| Wave | Slice                                   | Public base                       | Private base | Implementer | Reviewer                      | Compatibility evidence                                                                 | Integrated commits                 | Status / remaining risk                                                    |
| ---- | --------------------------------------- | --------------------------------- | ------------ | ----------- | ----------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| 0    | Safety and backbone                     | `ba8c0961`                        | `7185b84`    | Multiple    | Independent backbone reviewer | Public-only and integrated clean-clone gates; security and characterization baselines  | `ba8c0961` / `7185b84`             | Complete                                                                   |
| 1    | Naming compatibility                    | `fa9ffb97`                        | —            | GPT-5.6 Sol | Fable 5 high                  | Blob-pinned v3 differential: 213 logical, 98 physical, 29 branch, and 31 utility cases | `2f784639`, `d87983f1`, `c82c7fcc` | Integrated; synthesis must consume truncation signal and compare templates |
| 1    | Command contracts and machine protocol  | `ba8c0961`                        | —            | Pending     | Pending                       | Pending                                                                                | Pending                            | Dispatched                                                                 |
| 1    | Config model and schema generation      | `ba8c0961`                        | —            | Pending     | Pending                       | Pending                                                                                | Pending                            | Dispatched                                                                 |
| 1    | Packaging foundation and helper Lambdas | `ba8c0961`                        | —            | Pending     | Pending                       | Pending                                                                                | Pending                            | Dispatched                                                                 |
| 1    | Console public contracts                | Pending after shared Wave 1 seams | `7185b84`    | Pending     | Pending                       | Pending                                                                                | Pending                            | Not dispatched                                                             |

Behavior classifications:

| Behavior                                                                                 | Classification         | Evidence / decision                                                         |
| ---------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| CloudFormation logical IDs and deterministic physical names for unchanged configurations | `must-preserve`        | Legacy fixtures and property invariants are required before integration.    |
| Artifact inclusion, exclusion, stable hashing, and helper-Lambda bytes                   | `must-preserve`        | Compare normalized manifests and real packed artifacts against `17aef681`.  |
| v3 JSONL byte representation and internal event names                                    | `intentional-v4-break` | v4 owns an explicit versioned machine-event protocol instead.               |
| Public clone without `apps/console`                                                      | `must-preserve`        | Every public slice must pass `pnpm check:public` with the submodule absent. |
