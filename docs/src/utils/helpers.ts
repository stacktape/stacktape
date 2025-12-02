import { useState, useEffect, useRef, MutableRefObject } from 'react';

export function validateEmail(email: string) {
  const re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export const copyToClipboard = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.textContent = text.trim();
  textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in Microsoft Edge.
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy'); // Security exception may be thrown by some browsers.
  } catch (ex) {
    console.warn('Copy to clipboard failed.', ex);
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

export const scrollingNavigate = (e: React.MouseEvent<HTMLAnchorElement | HTMLSpanElement, MouseEvent>, id: string) => {
  e.preventDefault();
  const newUrl = `${window.location.pathname}#${id}`;
  // @note means user is on the main page
  const offset = document.getElementById('nav-container').offsetHeight + 13;
  const element = document.getElementById(id);
  const bodyRect = document.body.getBoundingClientRect().top;
  const elementRect = element.getBoundingClientRect().top;
  const elementPosition = elementRect - bodyRect;
  const offsetPosition = elementPosition - offset;
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
  window.history.pushState({}, null, newUrl);
};

export const useDetectOutsideClick = (
  refs: MutableRefObject<any>[],
  initialState: boolean
): [boolean, (val: boolean) => any] => {
  const [isActive, setIsActive] = useState(initialState);

  useEffect(() => {
    const pageClickEvent = (e) => {
      // If the active element exists and is clicked outside of
      if ((refs || []).every((ref) => ref.current !== null && !ref.current.contains(e.target))) {
        setIsActive(!isActive);
      }
    };

    // If the item is active (ie open) then listen for clicks
    if (isActive) {
      window.addEventListener('mousedown', pageClickEvent);
    }
    return () => {
      window.removeEventListener('mousedown', pageClickEvent);
    };
  }, [isActive, refs]);

  return [isActive, setIsActive];
};

export const useInterval = (callback: AnyFunction, delay?: number | null) => {
  const savedCallback = useRef<AnyFunction>(() => {});

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay !== null) {
      const interval = setInterval(() => savedCallback.current(), delay || 0);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [delay]);
};

export const isNumberInString = (value: string | null) => {
  return !Number.isNaN(Number(value));
};

export const randomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const capitalizeFirstLetter = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1);
