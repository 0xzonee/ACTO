import { Github, ArrowRight } from 'lucide-react';
import { config } from '../config';

export function OpenSource() {
  return (
    <section className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-32">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-medium mb-3 md:mb-4 tracking-tight">Open source</h2>
            <p className="text-gray-500">SDK and verification logic available on GitHub.</p>
          </div>
          <a
            href={config.links.repository}
            className="group px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors inline-flex items-center gap-2 w-fit"
          >
            <Github size={16} />
            View repository
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
