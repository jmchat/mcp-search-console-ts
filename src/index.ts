// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { GoogleAuth } from 'google-auth-library';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as fs from 'fs';
import * as path from 'path';

// Check if colors should be disabled
const useColors = !process.env.NO_COLOR;

// Helper function for logging that respects NO_COLOR
function log(message: string): void {
    // Remove emoji and color codes if NO_COLOR is set
    if (!useColors) {
        // Replace emoji and other special characters with plain text
        message = message
            .replace(/✅/g, 'SUCCESS:')
            .replace(/❌/g, 'ERROR:')
            .replace(/ℹ️/g, 'INFO:')
            .replace(/\u2139\ufe0f/g, 'INFO:');
    }
    console.error(message);
}

// Load environment variables from .env file if it exists
try {
    dotenv.config({ path: process.env.ENV_FILE || '.env' });
} catch (error) {
    console.error("Note: No .env file found, using environment variables directly.");
}

// --- Configuration ---
const MCP_PROTOCOL_VERSION = "1.0";

// Lees de versie uit package.json
let packageVersion = "1.0.0"; // Standaard versie als fallback
try {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        packageVersion = packageJson.version || packageVersion;
    }
} catch (error) {
    console.error("Kon package.json niet lezen, gebruik standaard versie:", error);
}

// --- Create MCP Server Instance ---
const server = new McpServer({
    name: "google-search-console",
    version: packageVersion,
    protocolVersion: MCP_PROTOCOL_VERSION,
});

// --- Helper function for error messages ---
function createErrorResponse(message: string, error?: any): CallToolResult {
    let detailedMessage = message;
    if (error) {
        // Try to recognize specific Google API errors
        if (error.code && error.details) { // Standard gRPC error structure
             detailedMessage = `${message}: Google API Error ${error.code} - ${error.details}`;
        } else if (error instanceof Error) {
            detailedMessage = `${message}: ${error.message}`;
        } else {
            detailedMessage = `${message}: ${String(error)}`;
        }
    }
    console.error("MCP Tool Error:", detailedMessage); // Log errors to stderr
    return {
        isError: true,
        content: [{ type: "text", text: detailedMessage }],
    };
}

// --- Helper function to obtain an access token for the Google API ---
async function getAccessToken(): Promise<string> {
    try {
        const auth = new GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/webmasters"],
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        return token.token || "";
    } catch (error) {
        console.error("Error getting access token:", error);
        throw error;
    }
}

// --- Search Console API Tools ---

server.tool(
    "search_console_api_list_sites",
    "Lijst alle sites waarvoor de gebruiker toegang heeft.",
    {},
    async (): Promise<CallToolResult> => {
        console.error("Running tool: search_console_api_list_sites");
        
        try {
            const accessToken = await getAccessToken();
            const response = await axios.get('https://www.googleapis.com/webmasters/v3/sites', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        } catch (error: any) {
            return createErrorResponse("Error listing sites", error);
        }
    }
);

server.tool(
    "search_console_api_list_sitemaps",
    "Lijst alle sitemaps voor een property.",
    {
        siteUrl: z.string().describe("De volledige URL van de site (inclusief protocol)")
    },
    async ({ siteUrl }): Promise<CallToolResult> => {
        console.error(`Running tool: search_console_api_list_sitemaps for ${siteUrl}`);
        
        try {
            const accessToken = await getAccessToken();
            const response = await axios.get(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        } catch (error: any) {
            return createErrorResponse(`Error listing sitemaps for ${siteUrl}`, error);
        }
    }
);

server.tool(
    "search_console_api_get_sitemap",
    "Details van een specifieke sitemap.",
    {
        siteUrl: z.string().describe("De volledige URL van de site (inclusief protocol)"),
        feedpath: z.string().describe("Het sitemap pad (bijv. sitemap.xml)")
    },
    async ({ siteUrl, feedpath }): Promise<CallToolResult> => {
        console.error(`Running tool: search_console_api_get_sitemap for ${siteUrl} / ${feedpath}`);
        
        try {
            const accessToken = await getAccessToken();
            const response = await axios.get(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        } catch (error: any) {
            return createErrorResponse(`Error getting sitemap ${feedpath} for ${siteUrl}`, error);
        }
    }
);

server.tool(
    "search_console_api_searchanalytics_query",
    "Haal zoekanalysegegevens op. Ondersteunt ook uursgewijze data via HOUR dimensie en HOURLY_ALL dataState.",
    {
        siteUrl: z.string().describe("De volledige URL van de site (inclusief protocol)"),
        requestBody: z.any().describe("Het request body object volgens de Search Analytics API.")
    },
    async ({ siteUrl, requestBody }): Promise<CallToolResult> => {
        console.error(`Running tool: search_console_api_searchanalytics_query for ${siteUrl}`);
        
        try {
            const accessToken = await getAccessToken();
            const response = await axios.post(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, requestBody, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        } catch (error: any) {
            return createErrorResponse(`Error querying search analytics for ${siteUrl}`, error);
        }
    }
);

server.tool(
    "search_console_api_list_crawl_errors",
    "Lijst crawl errors.",
    {
        siteUrl: z.string().describe("De volledige URL van de site (inclusief protocol)"),
        category: z.string().describe("Foutcategorie (bijv. 'notFound')"),
        platform: z.string().describe("Platform (bijv. 'web')")
    },
    async ({ siteUrl, category, platform }): Promise<CallToolResult> => {
        console.error(`Running tool: search_console_api_list_crawl_errors for ${siteUrl}, category: ${category}, platform: ${platform}`);
        
        try {
            const accessToken = await getAccessToken();
            const response = await axios.get(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/urlCrawlErrorsSamples`, {
                params: {
                    category: category,
                    platform: platform
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        } catch (error: any) {
            return createErrorResponse(`Error listing crawl errors for ${siteUrl}`, error);
        }
    }
);

server.tool(
    "search_console_api_get_crawl_error",
    "Details van een specifieke crawl error.",
    {
        siteUrl: z.string().describe("De volledige URL van de site (inclusief protocol)"),
        url: z.string().describe("De URL van de crawl error"),
        category: z.string().describe("Foutcategorie"),
        platform: z.string().describe("Platform")
    },
    async ({ siteUrl, url, category, platform }): Promise<CallToolResult> => {
        console.error(`Running tool: search_console_api_get_crawl_error for ${siteUrl}, url: ${url}`);
        
        try {
            const accessToken = await getAccessToken();
            const response = await axios.get(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/urlCrawlErrorsSamples/${encodeURIComponent(url)}`, {
                params: {
                    category: category,
                    platform: platform
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        } catch (error: any) {
            return createErrorResponse(`Error getting crawl error details for ${url}`, error);
        }
    }
);

server.tool(
    "search_console_api_mark_crawl_error_fixed",
    "Markeer een crawl error als opgelost.",
    {
        siteUrl: z.string().describe("De volledige URL van de site (inclusief protocol)"),
        url: z.string().describe("De URL van de crawl error"),
        category: z.string().describe("Foutcategorie"),
        platform: z.string().describe("Platform")
    },
    async ({ siteUrl, url, category, platform }): Promise<CallToolResult> => {
        console.error(`Running tool: search_console_api_mark_crawl_error_fixed for ${siteUrl}, url: ${url}`);
        
        try {
            const accessToken = await getAccessToken();
            const response = await axios.delete(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/urlCrawlErrorsSamples/${encodeURIComponent(url)}`, {
                params: {
                    category: category,
                    platform: platform
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        } catch (error: any) {
            return createErrorResponse(`Error marking crawl error as fixed for ${url}`, error);
        }
    }
);

server.tool(
    "search_console_api_mobile_friendly_test",
    "Voer een mobile friendly test uit op een URL.",
    {
        url: z.string().describe("De te testen URL")
    },
    async ({ url }): Promise<CallToolResult> => {
        console.error(`Running tool: search_console_api_mobile_friendly_test for ${url}`);
        
        try {
            const accessToken = await getAccessToken();
            const response = await axios.post('https://www.googleapis.com/webmasters/v3/urlTestingTools/mobileFriendlyTest:run', {
                url: url
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
            };
        } catch (error: any) {
            return createErrorResponse(`Error running mobile friendly test for ${url}`, error);
        }
    }
);

// --- Start de MCP server ---
async function main() {
    try {
        log("MCP server starten met stdio transport...");
        const transport = new StdioServerTransport();
        await server.connect(transport);
        log("✅ MCP server gestart");
    } catch (error) {
        log(`❌ Error starting server: ${error}`);
        process.exit(1);
    }
}

main();
