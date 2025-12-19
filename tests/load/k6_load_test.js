/**
 * k6 load testing script for ACTO API
 * 
 * Usage:
 *   k6 run tests/load/k6_load_test.js
 * 
 * With options:
 *   k6 run --vus 10 --duration 30s tests/load/k6_load_test.js
 *   k6 run --vus 50 --duration 5m --iterations 1000 tests/load/k6_load_test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const proofSubmissionRate = new Rate('proof_submission_success');
const proofRetrievalRate = new Rate('proof_retrieval_success');
const proofVerificationRate = new Rate('proof_verification_success');
const proofSubmissionTime = new Trend('proof_submission_time');
const proofRetrievalTime = new Trend('proof_retrieval_time');

// Configuration
export const options = {
    stages: [
        { duration: '30s', target: 10 },   // Ramp up to 10 users
        { duration: '1m', target: 10 },    // Stay at 10 users
        { duration: '30s', target: 20 },   // Ramp up to 20 users
        { duration: '1m', target: 20 },     // Stay at 20 users
        { duration: '30s', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
        http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
        proof_submission_success: ['rate>0.95'],  // 95% of proof submissions should succeed
        proof_retrieval_success: ['rate>0.95'],   // 95% of proof retrievals should succeed
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Helper function to generate random proof data
function generateProofData() {
    const taskId = `k6-test-${Math.floor(Math.random() * 100000)}`;
    const robotId = `robot-${Math.floor(Math.random() * 10) + 1}`;
    const timestamp = new Date().toISOString();
    
    return {
        envelope: {
            payload: {
                version: "1",
                subject: {
                    task_id: taskId,
                    robot_id: robotId,
                    run_id: null
                },
                created_at: timestamp,
                telemetry_normalized: {
                    task_id: taskId,
                    robot_id: robotId,
                    events: [
                        {
                            ts: timestamp,
                            topic: "sensor",
                            data: {
                                temperature: 20 + Math.random() * 10,
                                humidity: 40 + Math.random() * 40,
                                pressure: 980 + Math.random() * 40
                            }
                        }
                    ],
                    meta: {}
                },
                telemetry_hash: "test-hash-" + Math.random().toString(36),
                payload_hash: "test-payload-hash-" + Math.random().toString(36),
                hash_alg: "blake3",
                signature_alg: "ed25519",
                meta: {}
            },
            signer_public_key_b64: "test-public-key",
            signature_b64: "test-signature",
            anchor_ref: null
        }
    };
}

export default function () {
    // Health check
    let res = http.get(`${BASE_URL}/health`);
    check(res, {
        'health check status is 200': (r) => r.status === 200,
    });
    sleep(0.5);

    // Submit proof
    const proofData = generateProofData();
    const submitStart = Date.now();
    res = http.post(
        `${BASE_URL}/v1/proofs`,
        JSON.stringify(proofData),
        { headers: { 'Content-Type': 'application/json' } }
    );
    const submitDuration = Date.now() - submitStart;
    proofSubmissionTime.add(submitDuration);
    
    const submitSuccess = check(res, {
        'proof submission status is 200': (r) => r.status === 200,
        'proof submission returns proof_id': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.proof_id !== undefined;
            } catch (e) {
                return false;
            }
        },
    });
    proofSubmissionRate.add(submitSuccess);
    
    if (submitSuccess) {
        const body = JSON.parse(res.body);
        const proofId = body.proof_id;
        
        // Get proof
        const getStart = Date.now();
        res = http.get(`${BASE_URL}/v1/proofs/${proofId}`);
        const getDuration = Date.now() - getStart;
        proofRetrievalTime.add(getDuration);
        
        const getSuccess = check(res, {
            'proof retrieval status is 200': (r) => r.status === 200,
            'proof retrieval returns envelope': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.envelope !== undefined;
                } catch (e) {
                    return false;
                }
            },
        });
        proofRetrievalRate.add(getSuccess);
        
        // Verify proof
        if (getSuccess) {
            const body = JSON.parse(res.body);
            res = http.post(
                `${BASE_URL}/v1/verify`,
                JSON.stringify({ envelope: body.envelope }),
                { headers: { 'Content-Type': 'application/json' } }
            );
            
            const verifySuccess = check(res, {
                'proof verification status is 200': (r) => r.status === 200,
                'proof verification returns valid': (r) => {
                    try {
                        const body = JSON.parse(r.body);
                        return body.valid === true;
                    } catch (e) {
                        return false;
                    }
                },
            });
            proofVerificationRate.add(verifySuccess);
        }
    }
    
    // List proofs
    res = http.get(`${BASE_URL}/v1/proofs?limit=10`);
    check(res, {
        'list proofs status is 200': (r) => r.status === 200,
    });
    
    sleep(1);
}

export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'tests/load/k6_summary.json': JSON.stringify(data),
    };
}

function textSummary(data, options) {
    // Simple text summary
    let summary = '\n';
    summary += 'Test Summary\n';
    summary += '============\n';
    summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += `Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
    summary += `Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    return summary;
}

