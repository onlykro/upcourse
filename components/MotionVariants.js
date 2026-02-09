// Framer Motion variants for UpCourse admin dashboard
// Centralized animation configurations

// Timing tokens (matching CSS variables)
export const timing = {
  fast: 0.12,
  normal: 0.2,
  slow: 0.4
};

// Easing tokens
export const easing = {
  default: [0.2, 0.8, 0.2, 1],
  bounce: [0.34, 1.56, 0.64, 1],
  smooth: [0.4, 0, 0.2, 1]
};

// Page transition variants
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 10
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timing.normal,
      ease: easing.default
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  }
};

// Modal variants
export const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: timing.normal,
      ease: easing.bounce
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  }
};

// Overlay/backdrop variants
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: timing.fast }
  },
  exit: { 
    opacity: 0,
    transition: { duration: timing.fast }
  }
};

// Sidebar variants
export const sidebarVariants = {
  expanded: {
    width: 256,
    transition: {
      duration: timing.normal,
      ease: easing.default
    }
  },
  collapsed: {
    width: 72,
    transition: {
      duration: timing.normal,
      ease: easing.default
    }
  }
};

// Sidebar label variants (fade when collapsing)
export const sidebarLabelVariants = {
  visible: {
    opacity: 1,
    x: 0,
    display: 'block',
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  },
  hidden: {
    opacity: 0,
    x: -10,
    transitionEnd: {
      display: 'none'
    },
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  }
};

// List container variants (for staggered children)
export const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

// List item variants
export const listItemVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timing.normal,
      ease: easing.default
    }
  }
};

// Card hover variants
export const cardHoverVariants = {
  initial: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
  },
  hover: {
    y: -4,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  }
};

// Button variants
export const buttonVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { duration: timing.fast }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: timing.fast }
  }
};

// Toast variants (slide in from right)
export const toastVariants = {
  hidden: {
    opacity: 0,
    x: 100,
    y: 0
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: timing.normal,
      ease: easing.bounce
    }
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  }
};

// Dropdown/popover variants
export const dropdownVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -5
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -5,
    transition: {
      duration: timing.fast,
      ease: easing.default
    }
  }
};

// Table row variants
export const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      duration: timing.normal,
      ease: easing.default
    }
  }),
  hover: {
    backgroundColor: 'var(--accent)',
    transition: { duration: timing.fast }
  }
};

// Fade in variants
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: timing.normal }
  }
};

// Scale in variants
export const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: timing.normal,
      ease: easing.bounce
    }
  }
};

// Slide up variants
export const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: timing.normal,
      ease: easing.default
    }
  }
};

// Slide down variants (for expanding content)
export const slideDownVariants = {
  hidden: { 
    height: 0, 
    opacity: 0,
    overflow: 'hidden'
  },
  visible: { 
    height: 'auto', 
    opacity: 1,
    transition: { 
      height: { duration: timing.normal },
      opacity: { duration: timing.fast, delay: timing.fast }
    }
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      opacity: { duration: timing.fast },
      height: { duration: timing.normal, delay: timing.fast }
    }
  }
};

// Counter animation config (for animated numbers)
export const counterConfig = {
  duration: timing.slow,
  ease: easing.default
};

// Chart animation config
export const chartAnimationConfig = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { 
    pathLength: 1, 
    opacity: 1,
    transition: { 
      pathLength: { duration: timing.slow * 2, ease: easing.smooth },
      opacity: { duration: timing.normal }
    }
  }
};

// Drag reorder variants (for quiz builder)
export const dragItemVariants = {
  initial: { scale: 1, boxShadow: 'none' },
  dragging: {
    scale: 1.02,
    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2)',
    cursor: 'grabbing',
    zIndex: 50
  }
};

// Success check animation variants
export const checkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: timing.slow, ease: easing.default },
      opacity: { duration: timing.fast }
    }
  }
};

// Helper function to check if user prefers reduced motion
export const shouldReduceMotion = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for class on html element (from ThemeProvider)
  if (document.documentElement.classList.contains('reduce-motion')) {
    return true;
  }
  
  // Check system preference
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get variants with reduced motion support
export const getVariants = (variants, reduced = null) => {
  if (shouldReduceMotion()) {
    return reduced || {
      initial: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 }
    };
  }
  return variants;
};

// Named exports for common aliases
export const fadeIn = fadeInVariants;
export const scaleIn = scaleInVariants;
export const slideUp = slideUpVariants;
export const slideDown = slideDownVariants;

// Stagger container for staggered children animations
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

// Stagger item variant
export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timing.normal,
      ease: easing.default
    }
  }
};

// Slide in from left/right
export const slideIn = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: timing.normal,
      ease: easing.default
    }
  }
};

// Count up animation helper
export const countUp = {
  duration: timing.slow,
  ease: easing.smooth
};

export default {
  timing,
  easing,
  pageVariants,
  modalVariants,
  overlayVariants,
  sidebarVariants,
  sidebarLabelVariants,
  listContainerVariants,
  listItemVariants,
  cardHoverVariants,
  buttonVariants,
  toastVariants,
  dropdownVariants,
  tableRowVariants,
  fadeInVariants,
  scaleInVariants,
  slideUpVariants,
  slideDownVariants,
  counterConfig,
  chartAnimationConfig,
  dragItemVariants,
  checkVariants,
  shouldReduceMotion,
  getVariants,
  staggerContainer,
  staggerItem,
  slideIn,
  countUp,
  // Aliases
  fadeIn: fadeInVariants,
  scaleIn: scaleInVariants,
  slideUp: slideUpVariants,
  slideDown: slideDownVariants
};
