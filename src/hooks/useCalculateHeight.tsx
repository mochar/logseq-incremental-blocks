import { useEffect, useState } from "react";

export default function useCalculateHeight(el: HTMLElement | null, min: number = 100) : number {
  const [height, setHeight] = useState<number>(min);

  useEffect(() => {
    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => window.removeEventListener('resize', calculateHeight);
  }, [el]);

  function calculateHeight() {
    let height = 100;
    if (el) {
      //const rect = el.getBoundingClientRect();
      //height = rect.height;

      // From:
      // https://github.com/petyosi/react-virtuoso/issues/37#issuecomment-2241281767
      let topOffset = 0;
      let currentElement = el as any;

      // Calculate the total offset from the top of the document
      while (currentElement) {
        topOffset += currentElement.offsetTop || 0;
        currentElement = currentElement.offsetParent as HTMLElement;
      }

      const totalHeight = window.innerHeight;
      const calculatedHeight = totalHeight - topOffset;
      height = calculatedHeight;
    }
    setHeight(height);
  }

  return height;
}
