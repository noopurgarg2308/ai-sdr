import { Queue, Worker, Job } from "bullmq";
import { processImageAsset } from "./imageProcessor";
import { processVideoAsset } from "./videoProcessor";

// Simple in-memory queue for development (no Redis needed)
// In production, you'd use Redis with BullMQ

interface QueueJob {
  id: string;
  type: "process-image" | "process-video";
  mediaAssetId: string;
  companyId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

class SimpleQueue {
  private jobs: Map<string, QueueJob> = new Map();
  private isProcessing = false;

  async add(job: Omit<QueueJob, "id" | "status" | "createdAt">): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const queueJob: QueueJob = {
      ...job,
      id,
      status: "pending",
      createdAt: new Date(),
    };

    this.jobs.set(id, queueJob);
    console.log(`[Queue] Added job ${id}: ${job.type} for asset ${job.mediaAssetId}`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNext();
    }

    return id;
  }

  async getJob(id: string): Promise<QueueJob | undefined> {
    return this.jobs.get(id);
  }

  async getAllJobs(): Promise<QueueJob[]> {
    return Array.from(this.jobs.values());
  }

  private async processNext() {
    if (this.isProcessing) return;

    // Find next pending job
    const pendingJob = Array.from(this.jobs.values()).find(
      (j) => j.status === "pending"
    );

    if (!pendingJob) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const job = this.jobs.get(pendingJob.id)!;
    job.status = "processing";
    job.progress = 0;

    console.log(`[Queue] Processing job ${job.id}: ${job.type}`);

    try {
      if (job.type === "process-image") {
        await processImageAsset(job.mediaAssetId);
      } else if (job.type === "process-video") {
        await processVideoAsset(job.mediaAssetId);
      }

      job.status = "completed";
      job.progress = 100;
      job.completedAt = new Date();
      console.log(`[Queue] Job ${job.id} completed`);
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Queue] Job ${job.id} failed:`, error);
    }

    this.isProcessing = false;

    // Process next job
    setTimeout(() => this.processNext(), 100);
  }

  async getJobStatus(id: string): Promise<QueueJob | null> {
    return this.jobs.get(id) || null;
  }
}

// Singleton queue instance
export const mediaProcessingQueue = new SimpleQueue();

/**
 * Add media asset to processing queue
 */
export async function queueMediaProcessing(
  mediaAssetId: string,
  companyId: string,
  type: "image" | "video"
): Promise<string> {
  const jobType = type === "image" ? "process-image" : "process-video";
  
  const jobId = await mediaProcessingQueue.add({
    type: jobType,
    mediaAssetId,
    companyId,
  });

  console.log(`[Queue] Queued ${type} processing: job ${jobId}`);

  return jobId;
}

/**
 * Get processing status for a media asset
 */
export async function getProcessingStatus(jobId: string): Promise<QueueJob | null> {
  return await mediaProcessingQueue.getJobStatus(jobId);
}

/**
 * Get all jobs for monitoring
 */
export async function getAllJobs(): Promise<QueueJob[]> {
  return await mediaProcessingQueue.getAllJobs();
}

