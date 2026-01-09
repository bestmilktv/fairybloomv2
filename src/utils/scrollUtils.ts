/**
 * Zastaví jakýkoliv probíhající smooth scroll animaci
 * Používá se při kliknutí na navbar tlačítka během scrollu
 */
export const stopSmoothScroll = () => {
  // Zastavíme smooth scroll behavior
  const html = document.documentElement;
  const body = document.body;
  const originalHtmlScrollBehavior = html.style.scrollBehavior;
  const originalBodyScrollBehavior = body.style.scrollBehavior;
  
  // Nastavíme na auto pro okamžité zastavení
  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';
  
  // Zastavíme jakýkoliv requestAnimationFrame scroll
  // Nastavíme aktuální pozici bez animace
  const currentScroll = window.pageYOffset || window.scrollY || document.documentElement.scrollTop;
  window.scrollTo(0, currentScroll);
  
  // Obnovíme scroll behavior po malém delay
  requestAnimationFrame(() => {
    html.style.scrollBehavior = originalHtmlScrollBehavior || '';
    body.style.scrollBehavior = originalBodyScrollBehavior || '';
  });
};
