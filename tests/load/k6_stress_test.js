/**
 * k6 stress test script for ACTO API
 * 
 * This script performs stress testing by gradually increasing load
 * until the system breaks or reaches maximum capacity.
 * 
 * Usage:
 *   k6 run tests/load/k6_stress_test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
    stages: [
        { duration: '1m', target: 10 },    // Warm up
        { duration: '2m', target: 50 },     // Ramp up
        { duration: '2m', target: 100 },    // Increase load
        { duration: '2m', target: 200 },  // More load
        { duration: '2m', target: 300 },  // High load
        { duration: '2m', target: 400 },  // Very high load
        { duration: '2m', target: 500 },   // Maximum stress
        { duration: '1m', target: 0 },     // Cool down
    ],
    thresholds: {
        errors: ['rate<0.1'],  // Less than 10% errors
        http_req_duration: ['p(95)<2000'],  // 95% under 2 seconds
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

function generateProofData() {
    const taskId = `stress-test-${Math.floor(Math.random() * 1000000)}`;
    return {
        envelope: {
            payload: {
                version: "1",
                subject: {
                    task_id: taskId,
                    robot_id: `robot-${Math.floor(Math.random() * 100)}`,
                    run_id: null
                },
                created_at: new Date().toISOString(),
                telemetry_normalized: {
                    task_id: taskId,
                    events: [
                        {
                            ts: new Date().toISOString(),
                            topic: "sensor",
                            data: { value: Math.random() * 100 }
                        }
                    ],
                    meta: {}
                },
                telemetry_hash: "test-hash",
                payload_hash: "test-payload-hash",
                hash_alg: "blake3",
                signature_alg: "ed25519",
                meta: {}
            },
            signer_public_key_b64: "test-key",
            signature_b64: "test-sig",
            anchor_ref: null
        }
    };
}

export default function () {
    // Submit proof
    const start = Date.now();
    let res = http.post(
        `${BASE_URL}/v1/proofs`,
        JSON.stringify(generateProofData()),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const duration = Date.now() - start;
    responseTime.add(duration);
    
    const success = check(res, {
        'status is 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
    
    // Health check
    res = http.get(`${BASE_URL}/health`);
    check(res, {
        'health check ok': (r) => r.status === 200,
    });
    
    sleep(0.1);  // Minimal sleep for stress test
}

