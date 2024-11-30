// From: logseq-plugin-file-manager
import { useState, useEffect } from 'react';
import { PARENT_MAIN_CONTAINER_ID } from '../globals';

const useMainSizeAndPosition = () => {
  const [sizeAndPosition, setSizeAndPosition] = useState({ width: innerWidth, height: innerHeight, left: 0, top: 0 });

  useEffect(() => {
    const mainContainer = parent.document.getElementById(PARENT_MAIN_CONTAINER_ID);
    
    const updateSizeAndPosition = () => {
      if (mainContainer) {
        const rect = mainContainer.getBoundingClientRect();
        setSizeAndPosition({
          width: rect.width,
          height: rect.height,
          left: rect.x,
          top: rect.top,
        });
        
      }
    };

    const resizeObserver = new ResizeObserver(updateSizeAndPosition);
    if (mainContainer) resizeObserver.observe(mainContainer);
    updateSizeAndPosition();
    
    return () => {
      resizeObserver.disconnect();
    };
    
  }, []);

  return sizeAndPosition;
};

export default useMainSizeAndPosition;
