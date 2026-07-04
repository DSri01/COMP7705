/// <reference types="node" />

import { test, expect, describe, beforeEach, afterEach } from '@jest/globals';
import path from 'path';

import { loadConfiguration } from '../../src/configuration/definition.js';

const PLATFORM_ENV_VARS = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'FILE_STORAGE_PATH',
    'SERVER_PORT',
    'WORKERS__STORED_FILE_UPLOAD_TIMEOUT__STATE',
    'WORKERS__CISA_KEV_FETCH__STATE',
    'WORKERS__CVE_INTEL_REFRESH__STATE',
    'WORKERS__IMAGE_CVE_DECISION_EXPIRY_REFRESH__STATE',
    'WORKERS__CONTAINER_RESCAN__STATE',
    'NVD_API_KEY',
    'CONTAINER_SCANNER_URL',
] as const;

const AGENTS_ENV_VARS = [
    'AGENTS_LLM_PROVIDER',
    'AGENTS_WEB_SEARCH_PROVIDER',
    'AGENTS_FIRECRAWL_WEB_SEARCH_API_KEY',
    'AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS',
    'AGENTS_OPENROUTER_LLM_API_KEY',
    'AGENTS_OPENROUTER_LLM_MODEL',
    'AGENTS_OLLAMA_LLM_API_KEY',
    'AGENTS_OLLAMA_LLM_MODEL',
    'AGENTS_OLLAMA_LLM_BASE_URL',
] as const;

const FS_PATH_SEGMENTS = ['__tests__', 'configuration'] as const;

function clearConfigEnvVars(): void {
    for (const name of [...PLATFORM_ENV_VARS, ...AGENTS_ENV_VARS]) {
        delete process.env[name];
    }
}

function setBasePlatformEnv(serverPort = '3000'): void {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
    process.env.DB_DATABASE = 'test';
    process.env.FILE_STORAGE_PATH = JSON.stringify([...FS_PATH_SEGMENTS]);
    process.env.SERVER_PORT = serverPort;
    process.env.WORKERS__STORED_FILE_UPLOAD_TIMEOUT__STATE = 'enabled';
    process.env.WORKERS__CISA_KEV_FETCH__STATE = 'enabled';
    process.env.WORKERS__CVE_INTEL_REFRESH__STATE = 'disabled';
    process.env.WORKERS__IMAGE_CVE_DECISION_EXPIRY_REFRESH__STATE = 'disabled';
    process.env.WORKERS__CONTAINER_RESCAN__STATE = 'disabled';
    process.env.NVD_API_KEY = 'test';
    process.env.CONTAINER_SCANNER_URL = 'http://localhost:8080';
}

function clearAgentsEnvVars(): void {
    for (const name of AGENTS_ENV_VARS) {
        delete process.env[name];
    }
}

function setOpenRouterAgentsEnv(): void {
    clearAgentsEnvVars();
    process.env.AGENTS_LLM_PROVIDER = 'openRouter';
    process.env.AGENTS_WEB_SEARCH_PROVIDER = 'mockWikipedia';
    process.env.AGENTS_OPENROUTER_LLM_API_KEY = 'test-openrouter-key';
    process.env.AGENTS_OPENROUTER_LLM_MODEL = 'deepseek/deepseek-v4-pro';
}

function setOllamaAgentsEnv(): void {
    clearAgentsEnvVars();
    process.env.AGENTS_LLM_PROVIDER = 'ollama';
    process.env.AGENTS_WEB_SEARCH_PROVIDER = 'mockWikipedia';
    process.env.AGENTS_OLLAMA_LLM_API_KEY = 'test-ollama-key';
    process.env.AGENTS_OLLAMA_LLM_MODEL = 'granite4:3b';
    process.env.AGENTS_OLLAMA_LLM_BASE_URL = 'http://localhost:11434';
}

function setFirecrawlAgentsEnv(): void {
    clearAgentsEnvVars();
    process.env.AGENTS_LLM_PROVIDER = 'openRouter';
    process.env.AGENTS_WEB_SEARCH_PROVIDER = 'firecrawl';
    process.env.AGENTS_OPENROUTER_LLM_API_KEY = 'test-openrouter-key';
    process.env.AGENTS_OPENROUTER_LLM_MODEL = 'deepseek/deepseek-v4-pro';
    process.env.AGENTS_FIRECRAWL_WEB_SEARCH_API_KEY = 'fc-test-key';
    process.env.AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS = '5';
}

describe('loadConfiguration', () => {
    beforeEach(() => {
        clearConfigEnvVars();
    });

    afterEach(() => {
        clearConfigEnvVars();
    });

    describe('platform base (OpenRouter agents)', () => {
        test('loads full configuration when platform and agent variables are set', () => {
            setBasePlatformEnv('3000');
            setOpenRouterAgentsEnv();

            const configuration = loadConfiguration();

            expect(configuration.fs.path).toBe(path.join(...FS_PATH_SEGMENTS));
            expect(configuration.db).toEqual({
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: 'postgres',
                database: 'test',
            });
            expect(configuration.server.port).toBe(3000);
            expect(configuration.workers).toEqual({
                storedFileUploadTimeout: { state: 'enabled' },
                cisaKevFetch: { state: 'enabled' },
                cveIntelRefresh: { state: 'disabled' },
                imageCveDecisionExpiryRefresh: { state: 'disabled' },
                containerRescan: { state: 'disabled' },
            });
            expect(configuration.secrets.nvdApiKey).toBe('test');
            expect(configuration.containerScanner.url).toBe('http://localhost:8080');
            expect(configuration.agents.llmProvider).toEqual({
                provider: 'openRouter',
                model: 'deepseek/deepseek-v4-pro',
                apiKey: 'test-openrouter-key',
            });
            expect(configuration.agents.webSearchProvider).toEqual({
                provider: 'mockWikipedia',
            });
        });
    });

    describe('agents.llmProvider — OpenRouter', () => {
        test('loads OpenRouter provider when all required variables are set', () => {
            setBasePlatformEnv();
            setOpenRouterAgentsEnv();

            const configuration = loadConfiguration();

            expect(configuration.agents.llmProvider).toEqual({
                provider: 'openRouter',
                model: 'deepseek/deepseek-v4-pro',
                apiKey: 'test-openrouter-key',
            });
        });

        test('throws when AGENTS_OPENROUTER_LLM_API_KEY is missing', () => {
            setBasePlatformEnv();
            setOpenRouterAgentsEnv();
            delete process.env.AGENTS_OPENROUTER_LLM_API_KEY;

            expect(() => loadConfiguration()).toThrow(
                'Environment variable AGENTS_OPENROUTER_LLM_API_KEY is not set',
            );
        });

        test('throws when OpenRouter model is not in the supported enum', () => {
            setBasePlatformEnv();
            setOpenRouterAgentsEnv();
            process.env.AGENTS_OPENROUTER_LLM_MODEL = 'not-a-supported-model';

            expect(() => loadConfiguration()).toThrow();
        });
    });

    describe('agents.llmProvider — Ollama', () => {
        test('loads Ollama provider when all required variables are set', () => {
            setBasePlatformEnv();
            setOllamaAgentsEnv();

            const configuration = loadConfiguration();

            expect(configuration.agents.llmProvider).toEqual({
                provider: 'ollama',
                model: 'granite4:3b',
                baseUrl: 'http://localhost:11434',
                apiKey: 'test-ollama-key',
            });
        });

        test('throws when AGENTS_OLLAMA_LLM_BASE_URL is missing', () => {
            setBasePlatformEnv();
            setOllamaAgentsEnv();
            delete process.env.AGENTS_OLLAMA_LLM_BASE_URL;

            expect(() => loadConfiguration()).toThrow(
                'Environment variable AGENTS_OLLAMA_LLM_BASE_URL is not set',
            );
        });

        test('throws when Ollama model is not in the supported enum', () => {
            setBasePlatformEnv();
            setOllamaAgentsEnv();
            process.env.AGENTS_OLLAMA_LLM_MODEL = 'not-a-supported-model';

            expect(() => loadConfiguration()).toThrow();
        });
    });

    describe('AGENTS_LLM_PROVIDER', () => {
        test('throws when AGENTS_LLM_PROVIDER is not set', () => {
            setBasePlatformEnv();
            clearAgentsEnvVars();

            expect(() => loadConfiguration()).toThrow(
                'Environment variable AGENTS_LLM_PROVIDER is not set',
            );
        });

        test('throws when AGENTS_LLM_PROVIDER is invalid', () => {
            setBasePlatformEnv();
            setOpenRouterAgentsEnv();
            process.env.AGENTS_LLM_PROVIDER = 'unknown';

            expect(() => loadConfiguration()).toThrow();
        });
    });

    describe('agents.webSearchProvider — mockWikipedia', () => {
        test('loads mockWikipedia when AGENTS_WEB_SEARCH_PROVIDER is mockWikipedia', () => {
            setBasePlatformEnv();
            setOpenRouterAgentsEnv();

            const configuration = loadConfiguration();

            expect(configuration.agents.webSearchProvider).toEqual({
                provider: 'mockWikipedia',
            });
        });

        test('throws when AGENTS_WEB_SEARCH_PROVIDER is not set', () => {
            setBasePlatformEnv();
            setOpenRouterAgentsEnv();
            delete process.env.AGENTS_WEB_SEARCH_PROVIDER;

            expect(() => loadConfiguration()).toThrow(
                'Environment variable AGENTS_WEB_SEARCH_PROVIDER is not set',
            );
        });

        test('throws when AGENTS_WEB_SEARCH_PROVIDER is invalid', () => {
            setBasePlatformEnv();
            setOpenRouterAgentsEnv();
            process.env.AGENTS_WEB_SEARCH_PROVIDER = 'unknown';

            expect(() => loadConfiguration()).toThrow();
        });
    });

    describe('agents.webSearchProvider — firecrawl', () => {
        test('loads firecrawl when all required variables are set', () => {
            setBasePlatformEnv();
            setFirecrawlAgentsEnv();

            const configuration = loadConfiguration();

            expect(configuration.agents.webSearchProvider).toEqual({
                provider: 'firecrawl',
                apiKey: 'fc-test-key',
                maxResults: 5,
            });
        });

        test('throws when AGENTS_FIRECRAWL_WEB_SEARCH_API_KEY is missing', () => {
            setBasePlatformEnv();
            setFirecrawlAgentsEnv();
            delete process.env.AGENTS_FIRECRAWL_WEB_SEARCH_API_KEY;

            expect(() => loadConfiguration()).toThrow(
                'Environment variable AGENTS_FIRECRAWL_WEB_SEARCH_API_KEY is not set',
            );
        });

        test('throws when AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS is missing', () => {
            setBasePlatformEnv();
            setFirecrawlAgentsEnv();
            delete process.env.AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS;

            expect(() => loadConfiguration()).toThrow(
                'Environment variable AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS is not set',
            );
        });

        test('throws when maxResults is out of range', () => {
            setBasePlatformEnv();
            setFirecrawlAgentsEnv();
            process.env.AGENTS_FIRECRAWL_WEB_SEARCH_MAX_RESULTS = '11';

            expect(() => loadConfiguration()).toThrow();
        });
    });
});
