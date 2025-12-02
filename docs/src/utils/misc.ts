import { useEffect, useRef } from 'react';

export const replaceAll = function (replaceThis: string, withThis: string, inThis: string) {
  if (withThis) {
    withThis = withThis.replace(/\$/g, '$$$$');
  }
  return inThis.replace(
    new RegExp(replaceThis.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|<>\-\&])/g, '\\$&'), 'g'),
    withThis
  );
};

export const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

export const getLastElementOfSplit = (str: string, separator: string) => {
  const pathArray = str.split(separator);
  return pathArray[pathArray.length - 1];
};

/** Performs comparing of two items by specified properties
 * @param  {Array} props for sorting ['name'], ['value', 'city'], ['-date']
 * to set descending order on object property just add '-' at the begining of property
 */
export const compareBy =
  (...props) =>
  (a, b) => {
    for (let i = 0; i < props.length; i++) {
      const ascValue = props[i].startsWith('-') ? -1 : 1;
      const prop = props[i].startsWith('-') ? props[i].substr(1) : props[i];
      if (a[prop] !== b[prop]) {
        return a[prop] > b[prop] ? ascValue : -ascValue;
      }
    }
    return 0;
  };

export const useOuterClick = (callback) => {
  const callbackRef = useRef<any>(null); // initialize mutable ref, which stores callback
  const innerRef = useRef<any>(null); // returned to client, who marks "border" element

  // update cb on each render, so second useEffect has access to current value
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
    function handleClick(e) {
      if (innerRef.current && callbackRef.current && !innerRef.current.contains(e.target)) {
        callbackRef.current(e);
      }
    }
  }, []); // no dependencies -> stable click listener

  return innerRef; // convenience for client (doesn't need to init ref himself)
};

export const debounce = function (fn: (...args: any[]) => any, time: number) {
  let timer;
  return function (...args) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(context, args);
    }, time);
  };
};
