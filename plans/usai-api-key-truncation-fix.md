# USAI API Key Truncation Bug Fix Plan

## Problem Statement

The USAI provider API key works initially when entered but stops working after application restart. The key gets truncated because it contains a colon `:` character.

## Root Cause Analysis

### Finding 1: The `sanitizeValue` function truncates at special characters

In [`server/utils/helpers/updateENV.js:1364-1372`](server/utils/helpers/updateENV.js:1364), the `sanitizeValue` function is designed to prevent ENV injection attacks:

```javascript
function sanitizeValue(value) {
  const offendingChars =
    /[\n\r\t\v\f\u0085\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000"'`#]/;
  const firstOffendingCharIndex = value.search(offendingChars);
  if (firstOffendingCharIndex === -1) return value;

  return value.substring(0, firstOffendingCharIndex);
}
```

**However**, this regex does NOT include the colon `:` character. So the colon itself is not being sanitized.

### Finding 2: The `.env` file format uses single quotes

Looking at [`updateENV.js:1380-1383`](server/utils/helpers/updateENV.js:1380):

```javascript
var envResult = `# Auto-dump ENV from system call on ${new Date().toTimeString()}\n`;
envResult += Object.entries(frozenEnvs)
  .map(([key, value]) => `${key}='${sanitizeValue(value)}'`)
  .join("\n");
```

The env values are wrapped in single quotes, which should handle colons correctly in most env parsers.

### Finding 3: The dotenv library behavior

The application uses dotenv to load environment variables at startup [`server/index.js:1-3`](server/index.js:1):

```javascript
process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();
```

The dotenv library should properly parse values containing colons when they are wrapped in quotes.

### Finding 4: Possible issue with value not being passed correctly

Looking at the frontend component [`USAiGovOptions/index.jsx`](frontend/src/components/LLMSelection/USAiGovOptions/index.jsx), the API key is passed through the `System.customModels()` call. When the key is first entered, it passes the actual value. On subsequent loads, the settings object returns `USAiGovKey: !!process.env.USAI_GOV_API_KEY` which is just a boolean `true`.

In the `getUSAiGovModels` function [`customModels.js:1010-1040`](server/utils/helpers/customModels.js:1010):

```javascript
async function getUSAiGovModels(basePath = null, apiKey = null) {
  try {
    if (!basePath) return { models: [], error: "No base path provided" };

    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({
      apiKey: apiKey || "not-needed",  // Uses passed apiKey or default
      baseURL: basePath,
    });
    // ...
  }
}
```

The model fetching uses the apiKey passed from the frontend. But after restart, it needs to rely on `process.env.USAI_GOV_API_KEY`.

### Finding 5: The actual provider does read from env

In the actual LLM provider [`server/utils/AiProviders/usaiGov/index.js:23-26`](server/utils/AiProviders/usaiGov/index.js:23):

```javascript
this.openai = new OpenAIApi({
  baseURL: this.basePath,
  apiKey: process.env.USAI_GOV_API_KEY ?? null,
});
```

This reads directly from `process.env.USAI_GOV_API_KEY`.

### The Real Issue

After deeper investigation, if the API key contains special characters that could interfere with shell or env file parsing - but the sanitizeValue function does handle common dangerous characters, and colons are safe in single-quoted values...

**The most likely issue:** The user reports the key contains letters, numbers, `-`, `_`, and `:`. All of these should be safe. However, there may be a subtle issue with:

1. **Double-encoding** - if the value is somehow being processed twice
2. **Frontend display masking** - The frontend shows `"*".repeat(20)` when a key exists, so users can not verify what was actually stored
3. **The model fetching endpoint does NOT use the stored env value** - Looking at [`customModels.js:1016-1018`](server/utils/helpers/customModels.js:1016):

```javascript
const openai = new OpenAIApi({
  apiKey: apiKey || "not-needed",
  baseURL: basePath,
});
```

When `apiKey` is `true` (boolean), this will use `true` or fallback to `"not-needed"`. The function does NOT read from `process.env.USAI_GOV_API_KEY` like other providers do!

## Compare with other providers

Looking at `getGroqAiModels` [`customModels.js:298-303`](server/utils/helpers/customModels.js:298):

```javascript
async function getGroqAiModels(_apiKey = null) {
  const { OpenAI: OpenAIApi } = require("openai");
  const apiKey =
    _apiKey === true
      ? process.env.GROQ_API_KEY
      : _apiKey || process.env.GROQ_API_KEY || null;
```

This properly handles the boolean `true` case by falling back to `process.env.GROQ_API_KEY`.

But `getUSAiGovModels` does NOT do this - it uses the passed value directly without checking for boolean `true`.

## Solution

The fix is to update the [`getUSAiGovModels`](server/utils/helpers/customModels.js:1010) function to follow the same pattern as other providers:

```javascript
async function getUSAiGovModels(basePath = null, _apiKey = null) {
  try {
    if (!basePath) return { models: [], error: "No base path provided" };

    const apiKey =
      _apiKey === true
        ? process.env.USAI_GOV_API_KEY
        : _apiKey || process.env.USAI_GOV_API_KEY || null;

    const { OpenAI: OpenAIApi } = require("openai");
    const openai = new OpenAIApi({
      apiKey: apiKey || "not-needed",
      baseURL: basePath,
    });
    // ... rest unchanged
  }
}
```

## Implementation Steps

1. **Update `getUSAiGovModels` in `server/utils/helpers/customModels.js`**
   - Change parameter from `apiKey` to `_apiKey`
   - Add the conditional that checks if `_apiKey === true` and falls back to `process.env.USAI_GOV_API_KEY`
   - This matches the pattern used by Groq, Anthropic, Gemini, DeepSeek, xAI, Cohere, Z.AI, and other providers

## Verification

After the fix:
1. Enter a USAI API key with special characters like colons
2. Verify models load in the dropdown
3. Save settings
4. Restart the application
5. Verify models still load from the dropdown without re-entering the key
6. Verify chat completions work with the stored key

## Additional Recommendations

1. Consider adding a debug log when the API key is being retrieved from env to help diagnose similar issues in the future
2. Consider adding a test case for providers with special characters in API keys
