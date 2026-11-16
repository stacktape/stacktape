/** Fails when asked to, so the canary can trip the function's error-rate alarm with real Lambda errors. */
export default async (event: { fail?: boolean }) => {
  if (event?.fail) throw new Error('Failure requested by the alarm canary');
  return { ok: true };
};
