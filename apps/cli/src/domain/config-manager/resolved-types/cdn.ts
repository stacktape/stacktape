export interface CdnResponseHeader {
  /**
   * #### Name of the header
   */
  headerName: string;
  /**
   * #### Value of the header
   */
  value: string;
}
export type CdnReferenceableParam =
  | 'cdnDomain'
  | 'cdnCustomDomains'
  | 'cdnUrl'
  | 'cdnCustomDomainUrls'
  | 'cdnCanonicalDomain'
  | 'cdnCanonicalUrl';
