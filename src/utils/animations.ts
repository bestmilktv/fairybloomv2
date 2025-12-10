// src/utils/animations.ts

// Apple-style smooth spring transition
export const springTransition = {
  type: "spring",
  stiffness: 50,
  damping: 20
};

// Container that staggers its children
export const staggerContainer = (stagger = 0.1, delay = 0) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: delay
    }
  }
});

// Item appearing from bottom - Optimized for performance (no blur)
export const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 30, 
    // filter: 'blur(10px)' // Removed for better performance on mobile
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    // filter: 'blur(0px)',
    transition: springTransition
  }
};

// Simple fade in
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

// Scale up (good for images/cards) - Optimized for performance
export const scaleUp = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    // filter: 'blur(5px)' // Removed for better performance
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    // filter: 'blur(0px)',
    transition: springTransition
  }
};

