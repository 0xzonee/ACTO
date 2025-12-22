export function Features() {
  return (
    <section className="border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-32">
        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          <div>
            <p className="text-sm text-gray-400 mb-4">01</p>
            <h3 className="text-lg font-medium mb-3">Proof Generation</h3>
            <p className="text-gray-500 leading-relaxed">
              Signed proofs from telemetry and execution logs.
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-4">02</p>
            <h3 className="text-lg font-medium mb-3">Verification</h3>
            <p className="text-gray-500 leading-relaxed">
              Independent verification without operator trust.
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-4">03</p>
            <h3 className="text-lg font-medium mb-3">Web3 Native</h3>
            <p className="text-gray-500 leading-relaxed">
              Wallet-based access and proof anchoring.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
