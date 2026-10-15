/**
 * Answers with the public IP its outbound request left through, so the caller can tell which NAT instance (which
 * availability zone's Elastic IP) served it. A failure to reach the internet is reported, not thrown, so the caller can
 * count failed calls without parsing Lambda errors.
 */
export const handler = async () => {
  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://checkip.amazonaws.com', { signal: controller.signal });
    clearTimeout(timer);
    const ip = (await response.text()).trim();
    return { ok: response.ok, ip, millis: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, error: String(error), millis: Date.now() - startedAt };
  }
};
