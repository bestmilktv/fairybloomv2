// src/utils/animations.ts

// "Premium" Cubic Bezier curve - používaná v moderních iOS/macOS systémech
// Poskytuje velmi plynulý start a luxusní, pomalý dojezd.
// Je výpočetně LEVNĚJŠÍ než Spring (fyzika), takže se nebude sekat na telefonech.
export const premiumTransition = {
  type: "tween",
  ease: [0.25, 0.1, 0.25, 1], // Cubic bezier pro "smooth" feel
  duration: 0.8 // Delší trvání pro pocit elegance
};

// Rychlejší varianta pro interaktivní prvky
export const quickTransition = {
  type: "tween",
  ease: [0.25, 0.1, 0.25, 1],
  duration: 0.5
};

// Container that staggers its children
// Použijeme pro gridy produktů - je to výkonnější než animovat každou kartu zvlášť
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

// Element se vynoří zespodu (jemněji)
export const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 20, // Zmenšeno z 30 na 20 pro jemnější efekt
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: premiumTransition
  }
};

// Jednoduchý fade in
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

// Scale up - Bez blur efektu pro výkon
export const scaleUp = {
  hidden: { 
    opacity: 0, 
    scale: 0.98, // Jemnější scale (bylo 0.95)
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: premiumTransition
  }
};
