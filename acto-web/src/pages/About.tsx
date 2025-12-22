import { Shield, Zap, Users, Globe } from 'lucide-react';

const values = [
  {
    icon: Shield,
    title: 'Trust through cryptography',
    description: 'We leverage zero-knowledge proofs and blockchain technology to create unbreakable trust in autonomous systems without sacrificing privacy or performance.'
  },
  {
    icon: Zap,
    title: 'Efficiency first',
    description: 'Our SDK is designed for production environments, with minimal overhead and seamless integration into existing robotics stacks.'
  },
  {
    icon: Users,
    title: 'Open source foundation',
    description: 'Built on open-source principles, our technology is transparent, auditable, and community-driven to ensure the highest standards of security and reliability.'
  },
  {
    icon: Globe,
    title: 'Global standards',
    description: 'We work towards establishing industry standards for proof of execution, making verifiable autonomy accessible to robotics companies worldwide.'
  }
];

export function About() {
  return (
    <div className="min-h-screen">
      <section className="min-h-screen flex items-center relative">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/hero2.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-32 relative z-10">
          <p className="text-sm text-gray-200 mb-6 md:mb-8 tracking-wide">WHO WE ARE</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] tracking-tight mb-6 md:mb-8 max-w-3xl text-white">
            Building trust in<br />autonomous systems.
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-6 max-w-xl leading-relaxed">
            ACTO is building the infrastructure for verifiable autonomous systems. We enable robots to prove that they completed their tasks exactly as specified, creating cryptographic guarantees that bridge the trust gap in automation.
          </p>
          <p className="text-lg md:text-xl text-gray-200 max-w-xl leading-relaxed">
            Founded by robotics engineers and cryptography researchers, we're on a mission to make autonomous systems trustworthy, transparent, and accountable.
          </p>
        </div>
      </section>

      <section className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-medium mb-12 md:mb-16 tracking-tight">Our values</h2>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="flex gap-4 md:gap-6">
                  <div className="flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-900">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-medium mb-2 md:mb-3 text-gray-900">{value.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{value.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-medium mb-6 md:mb-8 tracking-tight">The problem we're solving</h2>
            <div className="space-y-5 md:space-y-6 text-base md:text-lg text-gray-600 leading-relaxed">
              <p>
                As autonomous systems become more prevalent in critical applications, from delivery robots to industrial automation, a fundamental question arises: How can we trust that these systems are doing what they're supposed to do?
              </p>
              <p>
                Traditional monitoring solutions rely on centralized logs that can be manipulated, incomplete sensor data, or manual verification that doesn't scale. This creates a trust deficit that limits the adoption of autonomous systems in regulated industries and high-stakes environments.
              </p>
              <p>
                ACTO solves this with cryptographic proof of execution. Our SDK enables robots to generate verifiable proofs of their actions that anyone can verify independently, without needing to trust the robot operator or any centralized authority.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-medium mb-6 md:mb-8 tracking-tight">Our approach</h2>
            <div className="space-y-5 md:space-y-6 text-base md:text-lg text-gray-600 leading-relaxed">
              <p>
                We combine three key technologies to create proof of execution:
              </p>
              <ul className="space-y-3 md:space-y-4 ml-4 md:ml-6">
                <li className="flex gap-3">
                  <span className="text-gray-900 font-medium flex-shrink-0">1.</span>
                  <span><strong className="text-gray-900">Zero-knowledge proofs</strong> that allow robots to prove they followed specified behaviors without revealing sensitive operational data.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-gray-900 font-medium flex-shrink-0">2.</span>
                  <span><strong className="text-gray-900">Blockchain anchoring</strong> that timestamps and secures proofs, making them tamper-proof and independently verifiable.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-gray-900 font-medium flex-shrink-0">3.</span>
                  <span><strong className="text-gray-900">ROS 2 integration</strong> that makes it easy to add proof of execution to existing robotics systems with minimal code changes.</span>
                </li>
              </ul>
              <p>
                This architecture ensures that proof generation is efficient enough for real-time operation while maintaining the highest standards of cryptographic security.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
          <h2 className="text-2xl md:text-3xl font-medium mb-4 md:mb-6 tracking-tight">Join us</h2>
          <p className="text-lg md:text-xl text-gray-300 mb-6 md:mb-8 max-w-2xl mx-auto">
            We're always looking for talented engineers, researchers, and partners who share our vision of trustworthy autonomous systems.
          </p>
          <a
            href="mailto:contact@actobotics.net"
            className="inline-block px-8 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get in touch
          </a>
        </div>
      </section>
    </div>
  );
}
