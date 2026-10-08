import { useEffect, useState } from 'react';

export function useActiveSection(sectionIds: readonly string[]): number {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        const index = sectionIds.indexOf(visible.target.id);
        if (index >= 0) setActiveIndex(index);
      },
      { rootMargin: '-25% 0px -60% 0px' },
    );
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [sectionIds]);

  return activeIndex;
}
