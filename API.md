# Azzar AI Chat Widget API Reference

This document provides details about the API endpoints available for the Azzar AI Chat Widget.

## Common Headers

All API responses include the following CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```
Error responses will typically have a `Content-Type: application/json` header.

---

## Endpoints

### 1. Get Widget JavaScript

Serves the main JavaScript file required to embed and initialize the chat widget.

- **Method:** `GET`
- **Path:** `/widget.js`
- **Response:**
    - `Content-Type: application/javascript`
    - The widget's JavaScript code.

### 2. Get Widget Iframe HTML

Serves the HTML content for the chat widget's iframe. This is typically loaded by `widget.js`.

- **Method:** `GET`
- **Path:** `/widget-iframe`
- **Query Parameters (Optional, for theming):**
    - `primaryColor`: URL-encoded color value (e.g., `#6200ee`)
    - `primaryDarkColor`: URL-encoded color value (e.g., `#3700b3`)
    - `textOnPrimaryColor`: URL-encoded color value (e.g., `white`)
    - `backgroundColor`: URL-encoded color value (e.g., `#f5f5f5`)
    - `nonaryColor`: URL-encoded color value (e.g., `#e0e0e0` for AI message background)
    - `octonaryColor`: URL-encoded color value (e.g., `white` for chat container background)
- **Response:**
    - `Content-Type: text/html`
    - The HTML structure for the chat interface.

### 3. Chat Interaction

Handles sending user messages to the AI and receiving responses.

- **Method:** `POST`
- **Path:** `/api/chat`
- **Request Body:**
    - `Content-Type: application/json`
    ```json
    {
      "message": "Your message to the AI.",
      "history": [
        {"role": "user", "content": "Previous user message"},
        {"role": "assistant", "content": "Previous AI response"}
      ]
    }
    ```
    - `message` (string, required): The current message from the user.
    - `history` (array, optional): An array of previous messages in the conversation, alternating between "user" and "assistant" roles.
- **Response (Success - 200 OK):**
    - `Content-Type: application/json`
    ```json
    {
      "response": "AI's response text."
    }
    ```
- **Response (Error - e.g., 400 Bad Request, 429 Too Many Requests, 500 Internal Server Error):**
    - `Content-Type: application/json`
    ```json
    {
      "error": "Description of the error."
    }
    ```

### 4. Get Welcome Message

Retrieves a language-aware, AI-generated welcome message for the chat widget.

- **Method:** `GET`
- **Path:** `/api/welcome-message`
- **Query Parameters:**
    - `lang` (string, optional): The desired language code for the welcome message (e.g., `en`, `id`). Defaults to `en` or browser-detected language if not provided.
- **Response (Success - 200 OK):**
    - `Content-Type: application/json`
    ```json
    {
      "welcome": "Localized welcome message from the AI."
    }
    ```

### 5. Get Cache Statistics (Debugging)

Provides statistics about the in-memory (LRU) cache.

- **Method:** `GET`
- **Path:** `/api/cache-stats`
- **Response (Success - 200 OK):**
    - `Content-Type: application/json`
    ```json
    {
      "memoryCache": {
        "size": 0, // Number of items currently in the cache
        // Note: The properties below reflect the cache's configuration.
        // If in weighted mode (current default):
        "currentWeight": 0, // Current total weight of items in cache
        "maxWeight": 10485760, // Configured maximum total weight (e.g., 10MB)
        "isWeightedMode": true,
        // If in item count mode:
        // "maxSize": 50 // Configured maximum number of items
      }
    }
    ```
    *(The exact fields for `maxSize`/`maxWeight` in the response depend on the cache's current operational mode. The example shows both for clarity, but only relevant ones will appear. The current `memoryCache` instance is weighted.)*

---

*This API documentation is subject to change. Please refer to the source code for the most up-to-date details.* 