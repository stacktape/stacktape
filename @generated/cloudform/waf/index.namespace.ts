import ByteMatchSet_ from './byteMatchSet';
import IPSet_ from './ipSet';
import Rule_ from './rule';
import SizeConstraintSet_ from './sizeConstraintSet';
import SqlInjectionMatchSet_ from './sqlInjectionMatchSet';
import WebACL_ from './webAcl';
import XssMatchSet_ from './xssMatchSet';
export namespace WAF {
  export const ByteMatchSet = ByteMatchSet_;
  export const IPSet = IPSet_;
  export const Rule = Rule_;
  export const SizeConstraintSet = SizeConstraintSet_;
  export const SqlInjectionMatchSet = SqlInjectionMatchSet_;
  export const WebACL = WebACL_;
  export const XssMatchSet = XssMatchSet_;
  export type ByteMatchSet = ByteMatchSet_;
  export type IPSet = IPSet_;
  export type Rule = Rule_;
  export type SizeConstraintSet = SizeConstraintSet_;
  export type SqlInjectionMatchSet = SqlInjectionMatchSet_;
  export type WebACL = WebACL_;
  export type XssMatchSet = XssMatchSet_;
}
