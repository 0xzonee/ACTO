# Load Testing

This directory contains load testing configurations for the ACTO API.

## Locust

Locust is a Python-based load testing tool that allows you to define user behavior in Python code.

### Installation

```bash
pip install locust
```

### Running Locust Tests

#### Basic Usage

```bash
# Start Locust web UI
locust -f tests/load/locustfile.py --host=http://localhost:8080

# Headless mode (no web UI)
locust -f tests/load/locustfile.py --host=http://localhost:8080 --headless -u 10 -r 2 -t 1m

# With specific number of users and spawn rate
locust -f tests/load/locustfile.py --host=http://localhost:8080 --headless -u 50 -r 5 -t 5m
```

#### Parameters

- `-f, --locustfile`: Path to locustfile
- `--host`: Base URL of the target system
- `-u, --users`: Number of concurrent users
- `-r, --spawn-rate`: Rate to spawn users at (users per second)
- `-t, --run-time`: Run time (e.g., "1m", "5m", "1h")
- `--headless`: Run without web UI
- `--web-host`: Host to bind web UI to (default: 0.0.0.0)
- `--web-port`: Port to bind web UI to (default: 8089)

#### Scenarios

The locustfile includes multiple scenarios:

1. **Default Scenario** (`ACTOUser`): Balanced mix of read and write operations
2. **High Load Submission** (`HighLoadUser`): Focus on proof submissions
3. **Read Heavy** (`ReadHeavyUser`): Mostly read operations

To run a specific scenario:

```bash
locust -f tests/load/locustfile.py --host=http://localhost:8080 --tags HighLoadUser
```

## k6

k6 is a modern load testing tool built for developers and DevOps engineers.

### Installation

#### macOS

```bash
brew install k6
```

#### Linux

```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D53
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Windows

Download from [k6.io](https://k6.io/docs/getting-started/installation/)

### Running k6 Tests

#### Basic Load Test

```bash
k6 run tests/load/k6_load_test.js
```

#### Custom Configuration

```bash
# 10 virtual users for 30 seconds
k6 run --vus 10 --duration 30s tests/load/k6_load_test.js

# 50 virtual users for 5 minutes, 1000 iterations
k6 run --vus 50 --duration 5m --iterations 1000 tests/load/k6_load_test.js

# Custom base URL
BASE_URL=http://api.example.com k6 run tests/load/k6_load_test.js
```

#### Stress Test

```bash
k6 run tests/load/k6_stress_test.js
```

### k6 Options

- `--vus`: Number of virtual users
- `--duration`: Test duration (e.g., "30s", "5m", "1h")
- `--iterations`: Total number of iterations
- `--stages`: Custom load stages (defined in script)
- `--thresholds`: Custom thresholds (defined in script)

### Output

k6 generates detailed metrics including:

- Request rate (RPS)
- Response times (avg, min, max, p95, p99)
- Error rates
- Custom metrics (proof submission success rate, etc.)

Results are printed to stdout and can be exported to JSON:

```bash
k6 run --out json=results.json tests/load/k6_load_test.js
```

## Interpreting Results

### Key Metrics

1. **Request Rate (RPS)**: Requests per second the system can handle
2. **Response Time**: Average, p95, p99 response times
3. **Error Rate**: Percentage of failed requests
4. **Throughput**: Number of successful operations per second

### Performance Targets

- **Response Time**: p95 should be < 500ms for most endpoints
- **Error Rate**: Should be < 1% under normal load
- **Throughput**: System should handle at least 100 RPS

### Common Issues

1. **High Error Rate**: System may be overloaded or have bugs
2. **Increasing Response Times**: System may be hitting resource limits
3. **Memory Leaks**: Monitor memory usage during long-running tests
4. **Database Bottlenecks**: Check database connection pool and query performance

## Continuous Load Testing

For CI/CD integration, use headless mode:

```bash
# Locust
locust -f tests/load/locustfile.py --host=http://localhost:8080 --headless -u 10 -r 2 -t 1m --html=load_test_report.html

# k6
k6 run --out json=load_test_results.json tests/load/k6_load_test.js
```

## Best Practices

1. **Start Small**: Begin with low load and gradually increase
2. **Monitor Resources**: Watch CPU, memory, and database during tests
3. **Test Realistic Scenarios**: Use realistic data and user behavior
4. **Run Regularly**: Include load tests in CI/CD pipeline
5. **Document Baselines**: Keep track of performance baselines
6. **Test Different Scenarios**: Test read-heavy, write-heavy, and balanced workloads

