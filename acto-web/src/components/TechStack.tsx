export function TechStack() {
  const techStack = [
    'React',
    'TypeScript',
    'Supabase',
    'PostgreSQL',
    'Tailwind CSS',
    'Vite',
    'Edge Functions',
    'Row Level Security',
    'Real-time Subscriptions',
    'Authentication',
    'REST API',
    'WebSockets',
  ];

  return (
    <section className="py-16 bg-gray-50 overflow-hidden">
      <div className="relative">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...techStack, ...techStack, ...techStack].map((tech, index) => (
            <div
              key={index}
              className="inline-flex items-center px-8 text-2xl font-light text-gray-400"
            >
              {tech}
              <span className="mx-8 text-gray-300">•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
