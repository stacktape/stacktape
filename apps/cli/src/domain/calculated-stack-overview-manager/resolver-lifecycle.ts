/** Starts resolvers in order, waits for every one that started, then propagates the first observed failure. */
export const settleResourceResolvers = async (
  resourceResolvers: ReadonlyArray<() => unknown | PromiseLike<unknown>>
) => {
  let firstFailure: { reason: unknown } | undefined;
  const startedResolvers: Promise<void>[] = [];
  for (const resolveResource of resourceResolvers) {
    try {
      const resolverPromise = Promise.resolve(resolveResource());
      startedResolvers.push(
        resolverPromise.then(
          () => undefined,
          (reason) => {
            firstFailure ??= { reason };
          }
        )
      );
    } catch (reason) {
      // The previous call shape also stopped invoking later resolvers after a synchronous failure. Work already started
      // above is still observed and settled before the error escapes.
      firstFailure ??= { reason };
      break;
    }
  }
  await Promise.all(startedResolvers);
  if (firstFailure) {
    throw firstFailure.reason;
  }
};
