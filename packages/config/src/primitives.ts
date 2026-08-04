// type EnvironmentVars = { [varName: string]: string | number | boolean };

export type Arn = string;


export type LambdaRuntime =
  | 'nodejs24.x'
  | 'nodejs22.x'
  | 'nodejs20.x'
  | 'nodejs18.x'
  | 'python3.13'
  | 'python3.12'
  | 'python3.11'
  | 'python3.10'
  | 'python3.9'
  | 'python3.8'
  | 'ruby3.3'
  | 'java17'
  | 'java11'
  | 'java8.al2'
  | 'java8'
  | 'provided.al2'
  | 'provided.al2023'
  | 'dotnet8'
  | 'dotnet7'
  | 'dotnet6';
