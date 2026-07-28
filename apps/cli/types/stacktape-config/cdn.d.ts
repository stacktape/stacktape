interface CdnResponseHeader {
  /**
   * #### Name of the header
   */
  headerName: string;
  /**
   * #### Value of the header
   */
  value: string;
}
type CdnReferenceableParam =
  | 'cdnDomain'
  | 'cdnCustomDomains'
  | 'cdnUrl'
  | 'cdnCustomDomainUrls'
  | 'cdnCanonicalDomain'
  | 'cdnCanonicalUrl';
