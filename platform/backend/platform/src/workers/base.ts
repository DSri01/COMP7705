import { sleepMilliseconds } from "../utils/time.js";
import { PinoLogger } from 'nestjs-pino';

interface BasePollingSuccessResult {
    success: true;
}

interface BasePollingErrorResult {
    success: false;
    error: Error;
}

export type BasePollingResult = BasePollingSuccessResult | BasePollingErrorResult;

export class BasePollingWorker {
    private readonly intervalSeconds: number;
    private readonly logger: PinoLogger;
    private isRunning: boolean;
    private name: string;

    constructor(
        intervalSeconds: number,
        logger: PinoLogger,
        name: string,
    ) {
        this.intervalSeconds = intervalSeconds;
        this.isRunning = false;
        this.logger = logger;
        this.name = name;
    }

    startLoop: () => Promise<void> = async () => {
        this.isRunning = true;
        this.logger.info(`Starting worker loop for ${this.name}`, { workerName: this.name });
        while (this.isRunning) {
            const result = await this.process();
            // log if result is an error
            if (!result.success) {
                this.logger.error(result.error, `Worker loop error for ${this.name}`, { workerName: this.name });
            }
            await sleepMilliseconds(this.intervalSeconds * 1000);
        }
    }

    process: () => Promise<BasePollingResult> = async () => {
        // to be implemented by the subclass
        return {
            success: false,
            error: new Error("Not implemented"),
        }
    }

    pauseLoop: () => void = () => {
        this.isRunning = false;
    }
}