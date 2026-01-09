// Globální reference pro běžící scroll animaci
let activeScrollAnimation: number | null = null;

/**
 * Zastaví jakýkoliv probíhající smooth scroll animaci
 * Používá se při kliknutí na navbar tlačítka během scrollu
 * SYNCHRONNÍ verze - bez requestAnimationFrame pro okamžitou reakci
 */
export const stopSmoothScroll = () => {
  // Zastavíme jakoukoliv běžící requestAnimationFrame animaci
  if (activeScrollAnimation !== null) {
    cancelAnimationFrame(activeScrollAnimation);
    activeScrollAnimation = null;
  }
  
  // Zastavíme smooth scroll behavior
  const html = document.documentElement;
  const body = document.body;
  const originalHtmlScrollBehavior = html.style.scrollBehavior;
  const originalBodyScrollBehavior = body.style.scrollBehavior;
  
  // Nastavíme na auto pro okamžité zastavení
  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';
  
  // Zastavíme jakýkoliv requestAnimationFrame scroll
  // Nastavíme aktuální pozici bez animace SYNCHRONNĚ
  const currentScroll = window.pageYOffset || window.scrollY || document.documentElement.scrollTop;
  window.scrollTo(0, currentScroll);
  
  // Obnovíme scroll behavior SYNCHRONNĚ pomocí setTimeout(0) místo requestAnimationFrame
  // To zajistí okamžitou reakci bez zpoždění
  setTimeout(() => {
    html.style.scrollBehavior = originalHtmlScrollBehavior || '';
    body.style.scrollBehavior = originalBodyScrollBehavior || '';
  }, 0);
};

/**
 * Nastaví aktivní scroll animaci (pro zastavení z jiných míst)
 */
export const setActiveScrollAnimation = (animationId: number | null) => {
  activeScrollAnimation = animationId;
};
