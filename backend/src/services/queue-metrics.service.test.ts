import { Registry } from 'prom-client';
import { QueueMetricsService } from './queue-metrics.service';
import contractQueueService from './contract-queue.service';

// Mock the dependencies
jest.mock('./contract-queue.service', () => ({
  getQueueMetrics: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

describe('QueueMetricsService', () => {
  let queueMetricsService: QueueMetricsService;
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
    queueMetricsService = new QueueMetricsService(registry);
    jest.clearAllMocks();
  });

  afterEach(() => {
    registry.clear();
  });

  it('should initialize metrics gauges', async () => {
    const metrics = await registry.metrics();
    expect(metrics).toContain('anchorpoint_queue_waiting_jobs');
    expect(metrics).toContain('anchorpoint_queue_active_jobs');
    expect(metrics).toContain('anchorpoint_queue_completed_jobs');
    expect(metrics).toContain('anchorpoint_queue_failed_jobs');
    expect(metrics).toContain('anchorpoint_queue_delayed_jobs');
    expect(metrics).toContain('anchorpoint_db_jobs_total');
  });

  it('should update metrics successfully', async () => {
    // Mock the response from contractQueueService
    const mockMetrics = {
      queue: {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        total: 111,
      },
      database: {
        PENDING: 5,
        ACTIVE: 2,
        COMPLETED: 100,
        FAILED: 3,
      },
    };
    
    (contractQueueService.getQueueMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    // Call update
    await queueMetricsService.updateMetrics();

    // Verify contractQueueService was called
    expect(contractQueueService.getQueueMetrics).toHaveBeenCalledTimes(1);

    // Verify registry values
    const metricsStr = await registry.metrics();
    
    // Check specific gauge values in the prometheus output format
    expect(metricsStr).toContain('anchorpoint_queue_waiting_jobs 5');
    expect(metricsStr).toContain('anchorpoint_queue_active_jobs 2');
    expect(metricsStr).toContain('anchorpoint_queue_completed_jobs 100');
    expect(metricsStr).toContain('anchorpoint_queue_failed_jobs 3');
    expect(metricsStr).toContain('anchorpoint_queue_delayed_jobs 1');
    
    expect(metricsStr).toContain('anchorpoint_db_jobs_total{status="PENDING"} 5');
    expect(metricsStr).toContain('anchorpoint_db_jobs_total{status="ACTIVE"} 2');
    expect(metricsStr).toContain('anchorpoint_db_jobs_total{status="COMPLETED"} 100');
    expect(metricsStr).toContain('anchorpoint_db_jobs_total{status="FAILED"} 3');
  });

  it('should handle errors gracefully during update', async () => {
    // Mock an error
    (contractQueueService.getQueueMetrics as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

    // Should not throw
    await expect(queueMetricsService.updateMetrics()).resolves.not.toThrow();
  });
});
