import { config } from '../config';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo_b.png" alt="ACTO Logo" className="h-4 w-auto" />
            <span className="text-sm text-gray-400 font-serif font-medium tracking-tight">ACTO</span>
          </div>
          <div className="flex gap-6">
            <a href={config.links.docs} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Docs</a>
            <a href={config.social.github} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">GitHub</a>
            <a href="#privacy" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
