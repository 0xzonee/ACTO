import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function Logo() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('section');
      if (heroSection) {
        const heroBottom = heroSection.offsetHeight;
        setIsScrolled(window.scrollY > heroBottom - 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Link to="/" className="fixed top-4 left-4 md:top-8 md:left-8 z-50">
      <img
        src={isScrolled ? '/logo_b.png' : '/logo_w.png'}
        alt="Logo"
        className="h-8 md:h-12 w-auto transition-opacity duration-300"
      />
    </Link>
  );
}
