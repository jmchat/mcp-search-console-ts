# Google Search Console MCP

Een Model Context Protocol (MCP) server voor het beheren van Google Search Console properties, sitemaps en zoekanalyse.

## Installatie

```bash
npm install -g mcp-search-console
```

Of gebruik direct via npx:

```bash
npx mcp-search-console
```

## Vereisten

1. Een Google Cloud project met de Search Console API geactiveerd
2. Een service account met de juiste rechten voor Search Console
3. Een credentials.json bestand voor het service account

## Configuratie

Geef het pad naar je Google service account credentials op. Dit kan op twee manieren:

### Optie 1: Omgevingsvariabele

Stel de `GOOGLE_APPLICATION_CREDENTIALS` variabele in:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=pad/naar/credentials.json
```

### Optie 2: .env bestand (optioneel)

Maak een `.env` bestand aan met:

```
GOOGLE_APPLICATION_CREDENTIALS=pad/naar/credentials.json
```

## Beschikbare functies

De MCP biedt de volgende Search Console functies:

### Sites
- `search_console_api_list_sites` – Lijst alle sites waarvoor toegang is

### Sitemaps
- `search_console_api_list_sitemaps` – Lijst alle sitemaps voor een property
- `search_console_api_get_sitemap` – Details van een specifieke sitemap

### Search Analytics
- `search_console_api_searchanalytics_query` – Haal zoekanalysegegevens op
  - Ondersteunt ook uursgewijze data (vanaf april 2025) via de `HOUR` dimensie en `HOURLY_ALL` dataState

#### Voorbeeld: Uursgewijze data opvragen

Om uursgewijze data op te vragen, gebruik je de volgende parameters in je request:

```json
{
  "tool": "search_console_api_searchanalytics_query",
  "parameters": {
    "siteUrl": "https://example.com",
    "requestBody": {
      "startDate": "2025-04-07",
      "endDate": "2025-04-07",
      "dataState": "HOURLY_ALL",
      "dimensions": ["HOUR"]
    }
  }
}
```

Dit geeft resultaten terug met timestamps per uur:

```json
{
  "rows": [
    {
      "keys": ["2025-04-07T00:00:00-07:00"],
      "clicks": 17610,
      "impressions": 1571473,
      "ctr": 0.011206046810858348,
      "position": 10.073871456906991
    },
    {
      "keys": ["2025-04-07T01:00:00-07:00"],
      "clicks": 18250,
      "impressions": 1602341,
      "ctr": 0.011389563095440307,
      "position": 9.897654321098765
    }
    // ... meer uren
  ]
}
```

Je kunt de HOUR dimensie ook combineren met andere dimensies zoals COUNTRY, DEVICE, etc.:

```json
{
  "tool": "search_console_api_searchanalytics_query",
  "parameters": {
    "siteUrl": "https://example.com",
    "requestBody": {
      "startDate": "2025-04-07",
      "endDate": "2025-04-07",
      "dataState": "HOURLY_ALL",
      "dimensions": ["HOUR", "COUNTRY"]
    }
  }
}
```

### Crawl Errors (Legacy)
- `search_console_api_list_crawl_errors` – Lijst crawl errors
- `search_console_api_get_crawl_error` – Details van een specifieke crawl error
- `search_console_api_mark_crawl_error_fixed` – Markeer als opgelost

### Mobile Usability
- `search_console_api_mobile_friendly_test` – Voer een mobile friendly test uit op een URL

## Gebruik met Claude

Deze MCP werkt met Claude of andere MCP Clients. Maak een `claude-mcp-config.json` aan met bijvoorbeeld:

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "npx",
      "args": ["mcp-search-console"],
      "cwd": "/tmp",
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/your/credentials.json"
      }
    }
  }
}
```

Replace `/path/to/your/credentials.json` with the actual path to your Google service account credentials file.

### Important Notes for Claude Configuration

1. The `cwd` parameter is important - it ensures the MCP runs in a clean directory
2. No `.env` file is needed when using this configuration with Claude
3. The `NO_COLOR` environment variable prevents color codes in the output, which can cause JSON parsing errors in Claude
4. Upload the `claude-mcp-config.json` file to Claude when starting a new conversation

## License

ISC
