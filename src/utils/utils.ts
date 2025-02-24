import { useEffect, useState } from "react";

export function toCamelCase(str: string) : string {
  return str.replace(/-./g, (m) => m[1].toUpperCase());
}

export function toDashCase(str: string) : string {
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

export function average(array: number[]) : number {
  return array.reduce((a, b) => a + b) / array.length;
}

// https://stackoverflow.com/questions/66123016/interpolate-between-two-colours-based-on-a-percentage-value
export function interpolateColor(palette: string[], percent: number) {
  // Get bucket
  const palSize = palette.length;
  const rightIndex = Math.ceil((palSize-1) * percent);
  if (rightIndex == 0) return palette[0];
  const color1 = palette[rightIndex-1];
  const color2 = palette[rightIndex];

  // Convert the hex colors to RGB values
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  // Interpolate the RGB values
  const r = Math.round(r1 + (r2 - r1) * percent);
  const g = Math.round(g1 + (g2 - g1) * percent);
  const b = Math.round(b1 + (b2 - b1) * percent);

  // Convert the interpolated RGB values back to a hex color
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// https://stackoverflow.com/questions/34673902/typescript-equivalent-to-dart-completer
export class Completer<T> {
  public readonly promise: Promise<T>;
  private _complete!: (value: (PromiseLike<T> | T)) => void;
  private reject!: (reason?: any) => void;
  public completed = false;

  public constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
        this._complete = resolve;
        this.reject = reject;
    })
  }

  public complete(value: (PromiseLike<T> | T)) : Completer<T> {
    this.completed = true;
    this._complete(value);
    return this;
  }
}

export function useDebounce<T>(value: T, delay: number) : T {
  const [debounceValue, setDebounceValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounceValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debounceValue;
}

export function counter<T>(array: T[]) : Map<T, number> {
  return array.reduce((map, value) => {
    map.set(value, (map.get(value) || 0)+1); 
    return map
  }, new Map<T, number>);
}

export function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * html string -> doc
 * Envelops html with html/head/body if absent
 * Access html with document.documentElement.
 */ 
export function parseHtml(html: string) : Document {
  // html string -> doc
  // access html with document.documentElement
  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  return document;
}
