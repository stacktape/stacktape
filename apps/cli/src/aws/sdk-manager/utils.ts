export const defaultGetErrorFunction = (_message: string) => (err: Error) => {
  throw err;
};
