export const stacktapeCloudfrontHeaders = {
  setOriginResponseHeaders() {
    return 'X-Stp-Origin-Response-Set-Headers';
  },
  spaHeader() {
    return 'X-Stp-Origin-Request-SPA';
  },
  urlOptimization() {
    return 'X-Stp-Origin-Request-Url-Normalization';
  },
  rewriteHostHeader() {
    return 'X-Stp-Origin-Request-Rewrite-Host';
  },
  originType() {
    return 'X-Stp-Origin-Request-Origin-Type';
  }
};
