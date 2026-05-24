/**
 * Email worker — processes queued email jobs with retry.
 */
import { Worker, type Job } from "bullmq";
import nodemailer from "nodemailer";
import { getEnv } from "../lib/env.js";
import { logger } from "../lib/logger.js";

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

let worker: Worker | null = null;
let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    const env = getEnv();
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" }
        : undefined,
    });
  }
  return transport;
}

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const env = getEnv();
  const { to, subject, html, text, from, replyTo } = job.data;

  await getTransport().sendMail({
    from: from ?? env.SMTP_FROM,
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

export function startEmailWorker(redisUrl: string): Worker {
  const url = new URL(redisUrl);
  const connection = {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };

  worker = new Worker("email", processEmailJob, {
    connection,
    concurrency: 5,
    limiter: { max: 20, duration: 1000 }, // max 20 emails per second
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, to: job.data.to }, "Email delivered");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Email job failed");
  });

  return worker;
}

export async function stopEmailWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
