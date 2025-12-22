import { Bot, Wind, Plane, Factory, FlaskConical, Activity } from 'lucide-react';

const useCases = [
  {
    icon: Bot,
    title: 'Robotics-as-a-Service',
    description: 'Provide verifiable proof that your robots completed their assigned tasks. Enable trust in RaaS platforms with cryptographic execution records that customers can independently verify.'
  },
  {
    icon: Wind,
    title: 'Autonomous cleaning',
    description: 'Document cleaning operations with tamper-proof evidence. Generate verifiable logs showing which areas were cleaned, when, and to what standard, ensuring accountability in automated facilities management.'
  },
  {
    icon: Plane,
    title: 'Drone inspections',
    description: 'Create immutable records of infrastructure inspections. Prove that drones followed approved flight paths, captured required imagery, and completed safety protocols without manual oversight.'
  },
  {
    icon: Factory,
    title: 'Industrial auditing',
    description: 'Automate compliance verification with cryptographic audit trails. Demonstrate that automated systems performed required checks, measurements, and quality control procedures according to regulatory standards.'
  },
  {
    icon: FlaskConical,
    title: 'Research environments',
    description: 'Ensure reproducibility of automated experiments. Generate proofs that research robots executed protocols precisely as specified, enabling verification of experimental methodology and results.'
  },
  {
    icon: Activity,
    title: 'Simulation validation',
    description: 'Bridge the gap between simulation and reality. Prove that real-world robot behavior matches simulated models by comparing cryptographic proofs from both environments.'
  },
];

export function UseCases() {
  return (
    <section className="border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-32">
        <h2 className="text-2xl md:text-3xl font-medium mb-4 md:mb-6 tracking-tight">Use cases</h2>
        <p className="text-base md:text-lg text-gray-600 mb-12 md:mb-16 max-w-2xl">
          From industrial automation to research, proof of execution enables trust and accountability in autonomous systems across diverse applications.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <div key={useCase.title} className="group">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 group-hover:bg-gray-900 transition-colors">
                  <Icon className="w-6 h-6 text-gray-900 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-medium mb-3 text-gray-900">{useCase.title}</h3>
                <p className="text-gray-600 leading-relaxed">{useCase.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
