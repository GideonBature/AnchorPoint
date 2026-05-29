import { Gauge, Registry } from 'prom-client';
import { metricsService } from './metrics.service';
import contractQueueService from './contract-queue.service';
import logger from '../utils/logger';

/**
 * Queue Metrics Service
 * Exposes BullMQ and Database metrics to Prometheus
 */
export class QueueMetricsService {
  private waitingJobsGauge: Gauge<string>;
  private activeJobsGauge: Gauge<string>;
  private completedJobsGauge: Gauge<string>;
  private failedJobsGauge: Gauge<string>;
  private delayedJobsGauge: Gauge<string>;
  private dbJobsGauge: Gauge<string>;

  constructor(private registry: Registry) {
    // BullMQ specific metrics
    this.waitingJobsGauge = new Gauge({
      name: 'anchorpoint_queue_waiting_jobs',
      help: 'Number of waiting jobs in the contract queue',
      registers: [this.registry],
    });

    this.activeJobsGauge = new Gauge({
      name: 'anchorpoint_queue_active_jobs',
      help: 'Number of active jobs in the contract queue',
      registers: [this.registry],
    });

    this.completedJobsGauge = new Gauge({
      name: 'anchorpoint_queue_completed_jobs',
      help: 'Number of completed jobs in the contract queue',
      registers: [this.registry],
    });

    this.failedJobsGauge = new Gauge({
      name: 'anchorpoint_queue_failed_jobs',
      help: 'Number of failed jobs in the contract queue',
      registers: [this.registry],
    });

    this.delayedJobsGauge = new Gauge({
      name: 'anchorpoint_queue_delayed_jobs',
      help: 'Number of delayed jobs in the contract queue',
      registers: [this.registry],
    });

    // Database jobs by status
    this.dbJobsGauge = new Gauge({
      name: 'anchorpoint_db_jobs_total',
      help: 'Total number of contract jobs in database by status',
      labelNames: ['status'],
      registers: [this.registry],
    });
  }

  /**
   * Update queue metrics by fetching from the queue service
   * This is typically called before serving the /metrics endpoint
   */
  async updateMetrics(): Promise<void> {
    try {
      const metrics = await contractQueueService.getQueueMetrics();
      
      // Update Redis/BullMQ metrics
      this.waitingJobsGauge.set(metrics.queue.waiting);
      this.activeJobsGauge.set(metrics.queue.active);
      this.completedJobsGauge.set(metrics.queue.completed);
      this.failedJobsGauge.set(metrics.queue.failed);
      this.delayedJobsGauge.set(metrics.queue.delayed);
      
      // Update Database metrics
      // Reset existing gauge values first, to avoid stale status labels
      this.dbJobsGauge.reset();
      
      if (metrics.database) {
        Object.entries(metrics.database).forEach(([status, count]) => {
          this.dbJobsGauge.set({ status }, count as number);
        });
      }
      
      logger.debug('Queue metrics updated successfully');
    } catch (error) {
      logger.error('Failed to update queue metrics for Prometheus:', error);
    }
  }
}

// Export singleton that uses the global metricsService registry
export const queueMetricsService = new QueueMetricsService(metricsService.getRegistry());
