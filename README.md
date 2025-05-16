# Azzar AI Chat

A customizable AI chat widget powered by Cloudflare Workers and Llama 3.1 that can be embedded into any website.

## Features

- Responsive chat interface
- Conversation history with context
- Clear button to reset conversations
- Embeddable on any website
- **Automatic color scheme detection** - adapts to your website's theme
- Powered by llama-3.1-70b-instruct model via Cloudflare AI
- **Wikipedia integration** - automatically retrieves relevant information for knowledge-based queries
- **Smart token management** - prevents responses from being cut off mid-sentence
- **Advanced formatting** - fixes common formatting issues such as excessive blank lines and improves readability
- **LRU caching system** - improves performance and reduces resource usage with multi-level caching

## Embedding on Your Website

Add this single line of code to embed the chat widget on your website:

```html
<script src="https://your-worker-url.workers.dev/widget.js"></script>
```

## Color Scheme Integration

The widget automatically detects and adapts to your website's color scheme, making it blend seamlessly with your design. 

### How it Works

1. The widget detects CSS variables from your website's root styles:
   - `--primary-color` (or `--primary`, `--main-color`)
   - `--primary-dark` (or `--dark-primary`)
   - `--on-primary` (or `--text-on-primary`)
   - `--background` (or `--bg-color`)

2. If your website changes its theme dynamically (like dark/light mode toggle), the widget will detect these changes using a MutationObserver and update its appearance accordingly.

3. If no CSS variables are found, the widget falls back to a default color scheme.

### Custom Styling

For best results, define these CSS variables in your website's root stylesheet:

```css
:root {
  --primary-color: #yourColor;
  --primary-dark: #yourDarkerColor;
  --on-primary: #textColorOnPrimary;
  --background: #yourBackgroundColor;
}
```

## Implementation Details

The project is built as a Cloudflare Worker with the following components:

### Core Functions

- `sendToAI(messages, env)`: Sends messages to the Cloudflare AI service using the llama-3.1-70b-instruct model and processes the response
- `fetchTextFile(fileName, baseUrl, env, defaultContent)`: Attempts to load text files from multiple sources with fallbacks (direct fetch, R2/ASSETS binding, KV storage)
- `getSystemPrompt(requestUrl, env)`: Retrieves the AI system instructions from systemInstruction.txt
- `getCrawlLinks(requestUrl, env)`: Loads additional context links from crawl.txt

### Smart Features

The AI assistant has been enhanced with several smart capabilities:

#### Wikipedia Integration

When users ask knowledge-based questions, the system automatically:

1. Detects if the query might benefit from Wikipedia information
2. Queries the Wikipedia API to find relevant articles
3. Extracts a summary from the most relevant article
4. Adds this information to the conversation context
5. Includes a citation with a link to the source article

This gives the AI access to current, factual information to provide more accurate responses.

#### LRU Caching System

The application uses a multi-level Least Recently Used (LRU) caching system:

1. **In-memory Cache**:
   - Fast, memory-based cache that stores up to 50 recent responses
   - Uses a timestamp-based LRU eviction strategy
   - Provides instant responses for repeat questions without API calls
   - Automatically caches both AI responses and Wikipedia queries

2. **KV Storage Cache** (when available):
   - Persistent cache that survives application restarts
   - Uses Cloudflare KV storage for long-term caching
   - Stores responses with a configurable TTL (default: 1 day)
   - Falls back to memory cache when KV is not available

3. **Smart Key Generation**:
   - Generates cache keys based on the last 3 messages in a conversation
   - Considers both message content and role (user/assistant/system)
   - Provides context-aware caching to ensure relevant responses

4. **Cache Debugging**:
   - Provides a `/api/cache-stats` endpoint for monitoring cache performance
   - Logs cache hits and misses for performance analysis

Benefits of the caching system:
- Reduced Cloudflare AI API calls (lower costs)
- Faster response times for repeat or similar questions
- Decreased resource usage and improved scalability
- More consistent responses to similar questions

#### Token Management

To prevent responses from being cut off mid-sentence:

1. The system estimates the token count of the conversation context
2. Dynamically adjusts the maximum output tokens based on the context size
3. Sets a safe buffer to ensure the total stays within model limits
4. Ensures the response has enough space for a complete, coherent answer

#### Formatting Improvements

The system includes formatting optimization in two places:

1. **Server-side processing** - Before sending the AI response to the client:
   - Removes excessive blank lines (more than 2 consecutive blank lines)
   - Ensures proper spacing around punctuation
   - Maintains proper list formatting
   - Cleans up irregular spacing

2. **Client-side rendering** - The chat interface's Markdown-to-HTML converter:
   - Properly formats ordered and unordered lists
   - Handles text styling (bold, italic)
   - Renders links as clickable HTML
   - Eliminates excessive line breaks in the displayed text
   - Ensures Wikipedia citations are properly displayed

These improvements create a much more readable and professional chat experience, even when dealing with complex, formatted text.

### API Endpoints

The worker handles several endpoints:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Serve widget JavaScript
    if (url.pathname === '/widget.js') {
      return new Response(generateWidgetJS(url.origin), {
        headers: { 'Content-Type': 'application/javascript', ... }
      });
    }
    
    // Serve iframe content
    if (url.pathname === '/widget-iframe') {
      return new Response(generateWidgetHTML(url), {
        headers: { 'Content-Type': 'text/html', ... }
      });
    }
    
    // Handle chat API requests
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      // Process chat message and return AI response
      // ...
    }
    
    // Get cache statistics
    if (url.pathname === '/api/cache-stats' && request.method === 'GET') {
      // Return cache statistics for monitoring
      // ...
    }
    
    // Root path - serve instructions
    return new Response(generateInstructionsHTML(url.origin), {
      headers: { 'Content-Type': 'text/html', ... }
    });
  }
}
```

### Adding the Widget to the Landing Page

By default, the root path (`/`) serves instructions on how to use the widget. To include the actual widget on this landing page:

1. Modify the `generateInstructionsHTML` function in index.js to include the widget script:

```javascript
function generateInstructionsHTML(baseUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azzar AI Chat Widget</title>
  <style>
    body {
      font-family: 'Roboto', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
    }
    /* Your existing styles */
    
    /* Add some spacing for the widget */
    .container {
      margin: 40px 0;
    }
    
    /* Custom colors - widget will detect these */
    :root {
      --primary-color: #6200ee;
      --primary-dark: #3700b3;
      --on-primary: white;
      --background: #f5f5f5;
    }
  </style>
</head>
<body>
  <h1>Azzar AI Chat Widget</h1>
  <p>This service provides an embeddable chat widget for your website.</p>
  
  <div class="container">
    <h2>Live Demo</h2>
    <p>Try the widget right here! Click the chat button in the bottom-right corner.</p>
  </div>
  
  <div class="container">
    <h2>How to Install</h2>
    <p>Add the following script to your website:</p>
    <pre><code>&lt;script src="${baseUrl}/widget.js"&gt;&lt;/script&gt;</code></pre>
  </div>
  
  <!-- Your existing sections -->
  
  <footer>
    <p>Created by <a href="https://azzar.netlify.app/porto" target="_blank">Azzar</a></p>
  </footer>
  
  <!-- Embed the widget on the demo page itself -->
  <script src="${baseUrl}/widget.js"></script>
</body>
</html>`;
}
```

This embeds the actual widget on the landing page, allowing visitors to test it immediately without needing to copy the code to another site.

### UI Generation

The worker dynamically generates all necessary UI components:

- `generateWidgetJS(origin)`: Creates the embeddable JavaScript that adds the chat button and iframe to any website
- `generateWidgetHTML(url)`: Builds the chat interface HTML for the iframe, styled using the detected color scheme
- `generateInstructionsHTML(baseUrl)`: Creates a simple landing page with installation instructions

### Configuration

To configure the worker, you'll need:

1. A Cloudflare AI binding for the llama-3.1-70b-instruct model in your wrangler.toml:

```toml
[[ai_binding]]
name = "AI"
binding = "@cf/meta/llama-3.1-70b-instruct"
```

2. Optional: Configure KV storage for enhanced caching:

```toml
[[kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"
```

3. Optional: Configure storage for systemInstruction.txt and crawl.txt files:
   - Use R2/ASSETS binding
   - Use KV storage
   - Or host the files directly alongside the worker

## Widget Customization

### Changing the AI Personality

The AI assistant's personality is defined in `systemInstruction.txt`. This file contains detailed instructions for how the AI should respond, including:

- Identity and voice
- Personality traits and communication style
- Technical expertise and knowledge areas
- Language preferences and mixing (English, Bahasa Indonesia, Javanese)

You can modify this file to change how the AI assistant behaves and responds.

### Additional Context Resources

The widget can also load additional context from `crawl.txt`, which contains links to online profiles and resources about the persona. This helps the AI provide more relevant information.

### UI Customization

You can further customize the widget appearance by modifying the CSS in the widget JavaScript:

```javascript
.azzar-chat-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--primary-color);
  /* other styles */
}
```

## API Endpoints

The project includes several endpoints:

- `/widget.js` - Serves the embeddable widget JavaScript
- `/widget-iframe` - Serves the chat interface HTML as an iframe
- `/api/chat` - API endpoint for chat messages
- `/api/cache-stats` - Returns information about the cache status

## Deployment

This project uses Cloudflare Workers for deployment.

1. Install Wrangler CLI: `npm install -g wrangler`
2. Configure your `wrangler.toml` with the appropriate AI binding
3. Optional: Configure KV namespace for enhanced caching
4. Deploy to Cloudflare: `wrangler deploy` 