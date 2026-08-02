import { Kafka } from "kafkajs";
import { Job } from "../types";

const kafka = new Kafka({
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS!],
});

const producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
}

export async function disconnectProducer() {
  await producer.disconnect();
}

export async function publishJobScraped(job: Job) {
  await producer.send({
    topic: "jobs.scraped",
    messages: [{ value: JSON.stringify(job) }],
  });
}
