export const processAllNodes = async (node: any, processFunction: (node: any) => Promise<any>) => {
  if (node === undefined) {
    return;
  }
  if (node === null) {
    return processFunction(node);
  }
  if (Array.isArray(node)) {
    await processFunction(node);
    return Promise.all(node.map((nodeValue) => processAllNodes(nodeValue, processFunction)));
  }
  if (typeof node === 'object') {
    await processFunction(node);
    const res = {};
    await Promise.all(
      Object.entries(node).map(async ([prop, nodeValue]) => {
        res[prop] = await processAllNodes(nodeValue, processFunction);
      })
    );
    return res;
  }
  return processFunction(node);
};

export const ensureTrailingSlash = (url: string): string => {
  let pathPartEnd = url.indexOf('?');
  if (pathPartEnd === -1) {
    pathPartEnd = url.indexOf('#');
  }
  if (pathPartEnd === -1) {
    pathPartEnd = url.length;
  }

  const pathPart = url.slice(0, pathPartEnd);
  const restPart = url.slice(pathPartEnd);

  return pathPart.includes('.') || pathPart.endsWith('/') || pathPart.length === 0
    ? `${pathPart}${restPart}`
    : `${pathPart}/${restPart}`;
};
