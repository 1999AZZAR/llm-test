// Environment setup & configuration

// Simple LRU Cache implementation
class LRUCache {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.keyTimestamps = new Map();
  }

  // Generate a cache key from messages
  static generateKey(messages) {
    // Create a stable key by combining the content of the last 3 messages
    // or fewer if there aren't 3 messages
    const messagesToConsider = messages.slice(Math.max(0, messages.length - 3));
    const keyParts = messagesToConsider.map(msg => `${msg.role}:${msg.content}`);
    return keyParts.join('|');
  }

  // Check if a key exists and is valid
  has(key) {
    return this.cache.has(key);
  }

  // Get a value from cache
  get(key) {
    if (!this.has(key)) return null;
    
    // Update the timestamp when accessed
    this.keyTimestamps.set(key, Date.now());
    return this.cache.get(key);
  }

  // Set a value in cache
  set(key, value) {
    // If we're at capacity, remove the least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    // Add the new item
    this.cache.set(key, value);
    this.keyTimestamps.set(key, Date.now());
  }

  // Remove the least recently used item
  evictLRU() {
    if (this.cache.size === 0) return;
    
    let oldestKey = null;
    let oldestTime = Infinity;
    
    // Find the oldest item by timestamp
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }
    
    // Remove the oldest item
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.keyTimestamps.delete(oldestKey);
    }
  }

  // Clear the entire cache
  clear() {
    this.cache.clear();
    this.keyTimestamps.clear();
  }
}

// Create a global memory cache instance
const memoryCache = new LRUCache(50); // Cache up to 50 responses

// Optional: Initialize a KV-based cache if available
let kvCache = {
  async get(key) { return null; },
  async set(key, value) { return; },
  async has(key) { return false; }
};

// Function to query Wikipedia
async function queryWikipedia(query) {
  // Generate a cache key specifically for Wikipedia results
  const cacheKey = `wiki:${query.trim().toLowerCase()}`;
  
  // Check memory cache first
  if (memoryCache.has(cacheKey)) {
    console.log(`Wikipedia cache hit for: ${query}`);
    return memoryCache.get(cacheKey);
  }
  
  try {
    console.log(`Querying Wikipedia for: ${query}`);
    
    // Encode the query for URL
    const encodedQuery = encodeURIComponent(query);
    
    // First, search for relevant Wikipedia articles
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    // If no results, return empty
    if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
      const result = { success: false, message: "No Wikipedia articles found for this query." };
      memoryCache.set(cacheKey, result);
      return result;
    }
    
    // Get the first result's page ID
    const pageId = searchData.query.search[0].pageid;
    
    // Fetch the content of the article
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
    const contentResponse = await fetch(contentUrl);
    const contentData = await contentResponse.json();
    
    // Extract the article content
    const page = contentData.query.pages[pageId];
    const title = page.title;
    const extract = page.extract;
    
    // Create the result
    const result = {
      success: true,
      title: title,
      content: extract,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
    };
    
    // Cache the result
    memoryCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error querying Wikipedia:', error);
    return { success: false, message: "Failed to query Wikipedia: " + error.message };
  }
}

// Function to determine if a query might benefit from Wikipedia
function shouldUseWikipedia(message) {
  // Check for explicit requests for information
  const informationPatterns = [
    /what is/i, /who is/i, /tell me about/i, /information on/i,
    /when was/i, /where is/i, /how does/i, /definition of/i,
    /explain/i, /describe/i, /history of/i, /facts about/i
  ];
  
  return informationPatterns.some(pattern => pattern.test(message));
}

// Function to count tokens approximately
function approximateTokenCount(text) {
  // Simple approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Function to clean up excessive blank lines in text
function cleanupFormatting(text) {
  if (!text) return text;
  
  // First, identify and temporarily protect URLs from formatting changes
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = [];
  let protectedText = text.replace(urlRegex, function(match) {
    urls.push(match);
    return `__URL_PLACEHOLDER_${urls.length - 1}__`;
  });
  
  // Replace sequences of more than 2 newlines with just 2 newlines
  let cleanedText = protectedText.replace(/\n{3,}/g, '\n\n');
  
  // Handle cases where there might be multiple line breaks with spaces between them
  cleanedText = cleanedText.replace(/(\s*\n\s*){3,}/g, '\n\n');
  
  // Ensure lists are properly formatted (no extra spaces before list items)
  cleanedText = cleanedText.replace(/\n\s+(\d+\.\s|\*\s|\-\s)/g, '\n$1');
  
  // Ensure paragraphs end with proper punctuation when possible
  cleanedText = cleanedText.replace(/([a-zA-Z])(\s*\n\s*\n\s*[A-Z])/g, '$1.$2');
  
  // Fix spacing after punctuation, but not for placeholders
  cleanedText = cleanedText.replace(/([.,!?:;])([a-zA-Z])/g, '$1 $2');
  
  // Now restore the protected URLs
  for (let i = 0; i < urls.length; i++) {
    cleanedText = cleanedText.replace(`__URL_PLACEHOLDER_${i}__`, urls[i]);
  }
  
  return cleanedText;
}

// Function to initialize KV cache if available
async function initializeKVCache(env) {
  if (env && env.KV) {
    console.log('Initializing KV cache');
    
    // Create a more robust KV wrapper with caching functionality
    kvCache = {
      async get(key) {
        try {
          const value = await env.KV.get(key);
          if (value) {
            return JSON.parse(value);
          }
          return null;
        } catch (error) {
          console.error('Error getting from KV cache:', error);
          return null;
        }
      },
      
      async set(key, value, ttl = 86400) { // Default TTL: 1 day
        try {
          await env.KV.put(key, JSON.stringify(value), { expirationTtl: ttl });
        } catch (error) {
          console.error('Error setting KV cache:', error);
        }
      },
      
      async has(key) {
        try {
          const value = await env.KV.get(key);
          return value != null;
        } catch (error) {
          console.error('Error checking KV cache:', error);
          return false;
        }
      }
    };
    
    return true;
  }
  
  console.log('KV binding not available, using memory cache only');
  return false;
}

// Function to send messages to the AI
async function sendToAI(messages, env) {
  try {
    console.log('Processing request with messages:', JSON.stringify(messages, null, 2));
    
    if (!env.AI) {
      console.error('AI binding is not available. Check your wrangler.toml configuration.');
      return "Sorry, the AI service is not properly configured.";
    }
    
    // Generate a cache key for this conversation
    const cacheKey = LRUCache.generateKey(messages);
    
    // Check memory cache first (fastest)
    if (memoryCache.has(cacheKey)) {
      console.log('Memory cache hit!');
      return memoryCache.get(cacheKey);
    }
    
    // Then check KV cache if available (slower but persistent)
    let kvCacheResult = null;
    if (env.KV) {
      kvCacheResult = await kvCache.get(cacheKey);
      if (kvCacheResult) {
        console.log('KV cache hit!');
        // Update memory cache for faster access next time
        memoryCache.set(cacheKey, kvCacheResult);
        return kvCacheResult;
      }
    }
    
    // Check if the last user message might benefit from Wikipedia info
    const lastUserMessage = messages.find(m => m.role === 'user');
    let wikipediaInfo = null;
    
    if (lastUserMessage && shouldUseWikipedia(lastUserMessage.content)) {
      wikipediaInfo = await queryWikipedia(lastUserMessage.content);
      console.log('Wikipedia query results:', JSON.stringify(wikipediaInfo, null, 2));
      
      // If Wikipedia returned useful information, add it to the system message
      if (wikipediaInfo && wikipediaInfo.success) {
        // Find the system message
        const systemMessageIndex = messages.findIndex(m => m.role === 'system');
        
        if (systemMessageIndex !== -1) {
          // Add Wikipedia info to the system message
          messages[systemMessageIndex].content += `\n\nRelevant information from Wikipedia about "${wikipediaInfo.title}":\n${wikipediaInfo.content}\nSource: ${wikipediaInfo.url}`;
        } else {
          // If no system message exists, add one with the Wikipedia info
          messages.unshift({
            role: 'system',
            content: `Relevant information from Wikipedia about "${wikipediaInfo.title}":\n${wikipediaInfo.content}\nSource: ${wikipediaInfo.url}`
          });
        }
      }
    }
    
    // Calculate approximate token usage for input
    let inputTokens = 0;
    messages.forEach(msg => {
      inputTokens += approximateTokenCount(msg.content);
    });
    
    // Set maximum output tokens - leaving space based on input tokens
    // Model context limit is about 8k-16k tokens depending on the specific model
    // Let's target staying within 8k total tokens for safety
    const MAX_CONTEXT_TOKENS = 8000;
    const MAX_OUTPUT_TOKENS = Math.max(500, MAX_CONTEXT_TOKENS - inputTokens - 100); // 100 token buffer
    
    console.log(`Approximate input tokens: ${inputTokens}, setting max output tokens: ${MAX_OUTPUT_TOKENS}`);
    
    // Log cache miss and call the AI API
    console.log('Cache miss - calling AI service');
    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: messages,
      max_tokens: MAX_OUTPUT_TOKENS
    });
    
    console.log('Raw AI response:', JSON.stringify(aiResponse, null, 2));
    
    // Try to extract the response text
    let responseText;
    
    // Based on Cloudflare's documentation for the model
    if (typeof aiResponse === 'string') {
      // Direct string response
      responseText = aiResponse;
      console.log('Response is a string');
    } else if (typeof aiResponse === 'object' && aiResponse !== null) {
      // If response is directly the text
      if (typeof aiResponse.response === 'string') {
        responseText = aiResponse.response;
        console.log('Response found in .response property');
      }
      // If response is in a specific format used by this model
      else if (typeof aiResponse.text === 'string') {
        responseText = aiResponse.text;
        console.log('Response found in .text property');
      } 
      // Another possible format
      else if (typeof aiResponse.content === 'string') {
        responseText = aiResponse.content;
        console.log('Response found in .content property');
      }
      // Last resort - stringify the object
      else {
        responseText = JSON.stringify(aiResponse);
        console.log('Response format unknown, stringifying entire object');
      }
    } else {
      responseText = "Received an unexpected response type.";
      console.error('Unexpected response type:', typeof aiResponse);
    }
    
    // Clean up the response text formatting
    responseText = cleanupFormatting(responseText);
    
    console.log('Final extracted response text:', responseText);
    
    // If we used Wikipedia, add a citation
    if (wikipediaInfo && wikipediaInfo.success) {
      // Check if the response doesn't already contain the citation
      if (!responseText.includes(wikipediaInfo.url)) {
        // Make sure there are no spaces in the URL
        const cleanUrl = wikipediaInfo.url.replace(/\s+/g, '');
        responseText += `\n\nSource: [Wikipedia - ${wikipediaInfo.title}](${cleanUrl})`;
      }
    }
    
    // Store the response in the cache
    memoryCache.set(cacheKey, responseText);
    
    // Also store in KV cache if available
    if (env.KV) {
      await kvCache.set(cacheKey, responseText);
    }
    
    return responseText;
  } catch (error) {
    console.error('Error in sendToAI:', error);
    // More detailed error information
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
    return "Sorry, I had trouble processing your request. Error: " + error.message;
  }
}

// Function to handle request
export default {
  async fetch(request, env) {
    // Initialize KV cache if available
    if (env && env.KV) {
      await initializeKVCache(env);
    }

    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    try {
      // Serve the widget JS if requested
      if (url.pathname === '/widget.js') {
        return new Response(generateWidgetJS(url.origin), {
          headers: { 
            'Content-Type': 'application/javascript',
            ...corsHeaders
          }
        });
      }
      
      // Serve the iframe content if requested
      if (url.pathname === '/widget-iframe') {
        return new Response(generateWidgetHTML(url), {
          headers: { 
            'Content-Type': 'text/html',
            ...corsHeaders
          }
        });
      }
      
      // Handle chat API requests
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const body = await request.json();
        const message = body.message;
        const history = body.history || [];
        
        if (!message) {
          return new Response(JSON.stringify({ error: 'No message provided' }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        // Get system prompt
        const systemPrompt = await getSystemPrompt(request.url, env);
        
        // Get crawl links
        const crawlLinks = await getCrawlLinks(request.url, env);
        
        // Enhanced system prompt with crawl links if available
        let enhancedPrompt = systemPrompt;
        if (crawlLinks && crawlLinks.length > 0) {
          enhancedPrompt += '\n\nAdditional resources about me:\n' + crawlLinks.join('\n');
        }
        
        // Prepare messages array for the AI
        const messages = [
          { role: 'system', content: enhancedPrompt }
        ];
        
        // Add history messages if available
        if (history && history.length > 0) {
          messages.push(...history);
        }
        
        // Add the current user message
        messages.push({ role: 'user', content: message });
        
        // Send to Cloudflare AI
        const aiResponse = await sendToAI(messages, env);
        
        return new Response(JSON.stringify({ response: aiResponse }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Handle cache stats request (for debugging)
      if (url.pathname === '/api/cache-stats' && request.method === 'GET') {
        const stats = {
          memoryCache: {
            size: memoryCache.cache.size,
            maxSize: memoryCache.maxSize,
          }
        };
        return new Response(JSON.stringify(stats), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // For root path, serve simple instructions on how to use the widget
      return new Response(generateInstructionsHTML(url.origin), {
        headers: { 
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'An error occurred' }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
}

// Generic function to fetch text files with multiple fallback options
async function fetchTextFile(fileName, baseUrl, env, defaultContent = '') {
  console.log(`Attempting to fetch ${fileName} from baseUrl: ${baseUrl}`);
  
  try {
    // Method 1: Direct fetch from same origin
    try {
      const directUrl = `${baseUrl}/${fileName}`;
      console.log(`Trying direct fetch from: ${directUrl}`);
      const response = await fetch(directUrl);
      console.log(`Direct fetch response status: ${response.status}`);
      
      if (response.ok) {
        const content = await response.text();
        console.log(`Successfully loaded ${fileName} via direct fetch (${content.length} chars)`);
        return content;
      } else {
        console.log(`Direct fetch failed for ${fileName}: ${response.status}`);
      }
    } catch (e) {
      console.log(`Error in direct fetch for ${fileName}:`, e);
    }
    
    // Method 2: Using R2/ASSETS binding if available
    if (env && env.ASSETS) {
      try {
        console.log(`Trying to fetch ${fileName} from ASSETS binding`);
        const asset = await env.ASSETS.get(fileName);
        if (asset) {
          const content = await asset.text();
          console.log(`Successfully loaded ${fileName} from ASSETS (${content.length} chars)`);
          return content;
        } else {
          console.log(`File ${fileName} not found in ASSETS`);
        }
      } catch (e) {
        console.log(`Error accessing ${fileName} from ASSETS:`, e);
      }
    } else {
      console.log('ASSETS binding not available');
    }
    
    // Method 3: Try from KV storage if available
    if (env && env.KV) {
      try {
        console.log(`Trying to fetch ${fileName} from KV binding`);
        const content = await env.KV.get(fileName);
        if (content) {
          console.log(`Successfully loaded ${fileName} from KV (${content.length} chars)`);
          return content;
        } else {
          console.log(`File ${fileName} not found in KV`);
        }
      } catch (e) {
        console.log(`Error accessing ${fileName} from KV:`, e);
      }
    } else {
      console.log('KV binding not available');
    }
    
    // Method 4: Try absolute URL with appropriate headers
    try {
      // Try a fetch with proper headers for text retrieval
      const absoluteUrl = new URL(fileName, baseUrl).toString();
      console.log(`Trying CORS fetch from: ${absoluteUrl}`);
      const response = await fetch(absoluteUrl, { 
        headers: { 
          'Accept': 'text/plain',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      console.log(`CORS fetch response status: ${response.status}`);
      if (response.ok) {
        const content = await response.text();
        console.log(`Successfully loaded ${fileName} via CORS (${content.length} chars)`);
        return content;
      }
    } catch (e) {
      console.log(`Error in CORS fetch for ${fileName}:`, e);
    }
    
    // Method 5: Try with embedded content as a fallback
    if (fileName === 'systemInstruction.txt') {
      console.log('Using embedded systemInstruction.txt content');
      return `You are Azzar, a helpful AI assistant who specializes in web development, microcontrollers, and IoT technology. You're created by a freelance engineer from Yogyakarta, Indonesia. You're friendly, knowledgeable, and always willing to help with technical questions.`;
    } else if (fileName === 'crawl.txt') {
      console.log('Using embedded crawl.txt content');
      return `https://github.com/1999AZZAR
https://x.com/siapa_hayosiapa
https://www.linkedin.com/in/azzar-budiyanto/
https://medium.com/@azzar_budiyanto
https://codepen.io/azzar
https://www.instagram.com/azzar_budiyanto/
https://azzar.netlify.app/porto`;
    }
    
    // Fall back to default content
    console.log(`All fetch methods failed for ${fileName}, using default`);
    return defaultContent;
    
  } catch (error) {
    console.error(`Unexpected error fetching ${fileName}:`, error);
    return defaultContent;
  }
}

// Function to get system prompt from systemInstruction.txt
async function getSystemPrompt(requestUrl, env) {
  const currentUrl = new URL(typeof requestUrl === 'string' ? requestUrl : requestUrl.toString());
  const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
  
  // Default system prompt if all methods fail
  const defaultPrompt = "You are Azzar, a helpful AI assistant who specializes in web development, microcontrollers, and IoT technology. You're created by a freelance engineer from Yogyakarta, Indonesia. You're friendly, knowledgeable, and always willing to help with technical questions.";
  
  return await fetchTextFile('systemInstruction.txt', baseUrl, env, defaultPrompt);
}

// Function to get links from crawl.txt
async function getCrawlLinks(requestUrl, env) {
  const currentUrl = new URL(typeof requestUrl === 'string' ? requestUrl : requestUrl.toString());
  const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
  
  // Get crawl.txt content
  const content = await fetchTextFile('crawl.txt', baseUrl, env, '');
  
  // If we got content, parse it into links
  if (content) {
    // Split by newlines, trim each line, and filter out empty lines
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }
  
  // Default is an empty array if no links were found
  return [];
}

// Function to generate instructions HTML for the root path
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
    h1 {
      color: #6200ee;
    }
    code {
      background: #f5f5f5;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
    }
    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .container {
      margin: 40px 0;
    }
  </style>
</head>
<body>
  <h1>Azzar AI Chat Widget</h1>
  <p>This service provides an embeddable chat widget for your website.</p>
  
  <div class="container">
    <h2>How to Install</h2>
    <p>Add the following script to your website:</p>
    <pre><code>&lt;script src="${baseUrl}/widget.js"&gt;&lt;/script&gt;</code></pre>
  </div>
  
  <div class="container">
    <h2>Features</h2>
    <ul>
      <li>Automatically adapts to your website's color scheme</li>
      <li>Responsive design that works on all devices</li>
      <li>Persists conversation history in local storage</li>
      <li>Simple integration with just one line of code</li>
    </ul>
  </div>
  
  <div class="container">
    <h2>API Endpoint</h2>
    <p>For custom integrations, you can use the API endpoint directly:</p>
    <code>POST ${baseUrl}/api/chat</code>
    <p>Request body:</p>
    <pre><code>{
  "message": "User message here",
  "history": [
    {"role": "user", "content": "Previous user message"},
    {"role": "assistant", "content": "Previous AI response"}
  ]
}</code></pre>
  </div>
  
  <footer>
    <p>Created by <a href="https://azzar.netlify.app/porto" target="_blank">Azzar</a></p>
  </footer>

  <script src="${baseUrl}/widget.js"></script>
</body>
</html>`;
}

// Function to generate the widget JS code
function generateWidgetJS(origin) {
  return `
// Azzar AI Chat Widget
(function() {
  // Function to detect and apply the website's color scheme
  const detectColorScheme = () => {
    // Get computed styles from the document root or body
    const rootStyles = getComputedStyle(document.documentElement);
    
    // Try to detect primary color from CSS variables
    let primaryColor = rootStyles.getPropertyValue('--primary-color') || 
                       rootStyles.getPropertyValue('--primary') || 
                       rootStyles.getPropertyValue('--main-color') ||
                       '#6200ee'; // Default fallback
    
    let primaryDarkColor = rootStyles.getPropertyValue('--primary-dark') || 
                          rootStyles.getPropertyValue('--dark-primary') ||
                          '#3700b3'; // Default fallback
    
    let textOnPrimaryColor = rootStyles.getPropertyValue('--on-primary') || 
                            rootStyles.getPropertyValue('--text-on-primary') ||
                            'white'; // Default fallback
    
    let backgroundColor = rootStyles.getPropertyValue('--background') || 
                         rootStyles.getPropertyValue('--bg-color') ||
                         '#f5f5f5'; // Default fallback
    
    // Clean up the detected colors (remove whitespace, etc.)
    primaryColor = primaryColor.trim();
    primaryDarkColor = primaryDarkColor.trim();
    textOnPrimaryColor = textOnPrimaryColor.trim();
    backgroundColor = backgroundColor.trim();
    
    // If colors don't start with '#' or 'rgb', add '#'
    if (primaryColor && !primaryColor.startsWith('#') && !primaryColor.startsWith('rgb')) {
      primaryColor = '#' + primaryColor;
    }
    
    if (primaryDarkColor && !primaryDarkColor.startsWith('#') && !primaryDarkColor.startsWith('rgb')) {
      primaryDarkColor = '#' + primaryDarkColor;
    }
    
    return {
      primaryColor,
      primaryDarkColor,
      textOnPrimaryColor,
      backgroundColor
    };
  };
  
  // Create widget container
  const createWidget = () => {
    // Detect the website's color scheme
    const colors = detectColorScheme();
    
    // Create widget styles with dynamic colors
    const style = document.createElement('style');
    style.textContent = \`
      .azzar-chat-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: 'Roboto', Arial, sans-serif;
      }
      
      .azzar-chat-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: \${colors.primaryColor};
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        color: \${colors.textOnPrimaryColor};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .azzar-chat-button:hover {
        background-color: \${colors.primaryDarkColor};
        transform: scale(1.05);
      }
      
      .azzar-chat-icon {
        width: 30px;
        height: 30px;
      }
      
      .azzar-chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 500px;
        background: \${colors.backgroundColor || 'white'};
        border-radius: 10px;
        box-shadow: 0 5px 40px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        display: none;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(10px);
      }
      
      .azzar-chat-window.open {
        display: block;
        opacity: 1;
        transform: translateY(0);
      }
      
      .azzar-chat-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
    \`;
    document.head.appendChild(style);
    
    // Create widget container
    const widget = document.createElement('div');
    widget.className = 'azzar-chat-widget';
    
    // Create chat button
    const button = document.createElement('div');
    button.className = 'azzar-chat-button';
    button.innerHTML = '<svg class="azzar-chat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>';
    
    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.className = 'azzar-chat-window';
    
    // Create iframe for chat
    const iframe = document.createElement('iframe');
    iframe.className = 'azzar-chat-iframe';
    
    // Pass the detected colors to the iframe via URL parameters
    const colorParams = new URLSearchParams({
      primaryColor: encodeURIComponent(colors.primaryColor),
      primaryDarkColor: encodeURIComponent(colors.primaryDarkColor),
      textOnPrimaryColor: encodeURIComponent(colors.textOnPrimaryColor),
      backgroundColor: encodeURIComponent(colors.backgroundColor)
    }).toString();
    
    iframe.src = '${origin}/widget-iframe?' + colorParams;
    iframe.title = 'Chat with Azzar';
    
    // Add elements to the DOM
    chatWindow.appendChild(iframe);
    widget.appendChild(chatWindow);
    widget.appendChild(button);
    document.body.appendChild(widget);
    
    // Toggle chat window when button is clicked
    button.addEventListener('click', () => {
      chatWindow.classList.toggle('open');
    });
    
    // Function to update colors when theme changes
    const updateColors = () => {
      const newColors = detectColorScheme();
      button.style.backgroundColor = newColors.primaryColor;
      chatWindow.style.backgroundColor = newColors.backgroundColor || 'white';
      
      // Update iframe URL with new colors
      const newColorParams = new URLSearchParams({
        primaryColor: encodeURIComponent(newColors.primaryColor),
        primaryDarkColor: encodeURIComponent(newColors.primaryDarkColor),
        textOnPrimaryColor: encodeURIComponent(newColors.textOnPrimaryColor),
        backgroundColor: encodeURIComponent(newColors.backgroundColor)
      }).toString();
      
      // Only reload if colors actually changed to prevent unnecessary refreshes
      if (iframe.src.split('?')[1] !== newColorParams) {
        iframe.src = '${origin}/widget-iframe?' + newColorParams;
      }
    };
    
    // Set up a mutation observer to watch for theme changes
    if (window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        // Check if relevant attributes have changed
        const shouldUpdateColors = mutations.some(mutation => {
          return mutation.type === 'attributes' || 
                 (mutation.type === 'childList' && 
                  mutation.target.nodeName.toLowerCase() === 'style');
        });
        
        if (shouldUpdateColors) {
          updateColors();
        }
      });
      
      // Observe the document root for attribute changes and style element changes
      observer.observe(document.documentElement, { 
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class', 'style']
      });
    }
  };
  
  // Initialize the widget once the page is fully loaded
  if (document.readyState === 'complete') {
    createWidget();
  } else {
    window.addEventListener('load', createWidget);
  }
})();
  `;
}

// Function to generate the widget iframe HTML
function generateWidgetHTML(url) {
  // Extract color parameters from URL
  const primaryColor = decodeURIComponent(url.searchParams.get('primaryColor') || '#6200ee');
  const primaryDarkColor = decodeURIComponent(url.searchParams.get('primaryDarkColor') || '#3700b3');
  const textOnPrimaryColor = decodeURIComponent(url.searchParams.get('textOnPrimaryColor') || 'white');
  const backgroundColor = decodeURIComponent(url.searchParams.get('backgroundColor') || '#f5f5f5');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azzar AI Chat</title>
  <style>
    :root {
      --primary-color: ${primaryColor};
      --primary-dark: ${primaryDarkColor};
      --on-primary: ${textOnPrimaryColor};
      --background: ${backgroundColor};
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Roboto', Arial, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--background, #f5f5f5);
    }
    
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 100%;
      margin: 0 auto;
      overflow: hidden;
    }
    
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .message {
      margin-bottom: 16px;
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .user-message {
      background-color: var(--primary-color, #6200ee);
      color: var(--on-primary, white);
      align-self: flex-end;
      margin-left: auto;
      border-bottom-right-radius: 4px;
    }
    
    .ai-message {
      background-color: #e0e0e0;
      color: #333;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    
    /* Add styles for ordered and unordered lists */
    .ai-message ol, .ai-message ul {
      padding-left: 20px;
      margin: 5px 0;
    }
    
    .ai-message li {
      margin-bottom: 5px;
    }
    
    /* Code style */
    .ai-message code {
      background-color: rgba(0,0,0,0.05);
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
    }
    
    .input-container {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e0e0e0;
      background-color: white;
    }
    
    .input-field {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    
    .input-field:focus {
      border-color: var(--primary-color, #6200ee);
    }
    
    .send-button {
      background-color: var(--primary-color, #6200ee);
      color: var(--on-primary, white);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      margin-left: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    .send-button:hover {
      background-color: var(--primary-dark, #3700b3);
    }
    
    .send-icon {
      width: 24px;
      height: 24px;
    }
    
    .clear-button {
      background-color: transparent;
      color: #757575;
      border: 1px solid #e0e0e0;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      margin-left: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    
    .clear-button:hover {
      background-color: #f5f5f5;
    }
    
    .clear-icon {
      width: 24px;
      height: 24px;
    }
    
    .typing-indicator {
      display: none;
      padding: 12px 16px;
      background-color: #e0e0e0;
      border-radius: 18px;
      margin-bottom: 16px;
      max-width: 80%;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    
    .typing-indicator.visible {
      display: block;
    }
    
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #757575;
      margin-right: 4px;
      animation: typing 1.4s infinite ease-in-out;
    }
    
    .dot:nth-child(1) {
      animation-delay: 0s;
    }
    
    .dot:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .dot:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
      }
      30% {
        transform: translateY(-6px);
      }
    }
    
    .ai-message a {
      color: var(--primary-color, #6200ee);
      text-decoration: underline;
      word-break: break-all;
    }
    
    .ai-message a:hover {
      text-decoration: none;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="messages" id="messages">
      <div class="message ai-message">
        Halo! Aku Azzar. Freelance developer & educator dari Jogja. Ada yang bisa dibantu?
      </div>
    </div>
    <div class="typing-indicator" id="typing-indicator">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
    <div class="input-container">
      <input type="text" class="input-field" id="input-field" placeholder="Type your message...">
      <button class="send-button" id="send-button">
        <svg class="send-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/>
        </svg>
      </button>
      <button class="clear-button" id="clear-button">
        <svg class="clear-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/>
        </svg>
      </button>
    </div>
  </div>
  
  <script>
    // Chat functionality
    const messagesContainer = document.getElementById('messages');
    const inputField = document.getElementById('input-field');
    const sendButton = document.getElementById('send-button');
    const clearButton = document.getElementById('clear-button');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Simple function to convert markdown to HTML
    function markdownToHtml(text) {
      if (!text) return '';
      
      // First, fix formatting issues - replace excessive blank lines
      text = text.replace(/\\n{3,}/g, '\\n\\n');
      
      // Handle cases where there might be multiple line breaks with spaces between them
      text = text.replace(/(\\s*\\n\\s*){3,}/g, '\\n\\n');
      
      // Special check for links before anything else
      // Links with markdown format [text](url)
      text = text.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, function(match, p1, p2) {
        // Remove any spaces that might be in the URL
        let url = p2.replace(/\\s+/g, '');
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          // If it's a Wikipedia link or other common domain, assume https
          if (url.includes('wikipedia.org') || url.includes('github.com')) {
            url = 'https://' + url;
          } else {
            url = 'https://' + url;
          }
        }
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + p1 + '</a>';
      });
      
      // Plain URLs that are not part of markdown links - fix spaces within URLs
      text = text.replace(/(?:^|\\s)(https?:\\/\\/[^\\s<]+(?:\\.\\s*[^\\s<]+)*)/g, function(match, url) {
        // Remove any spaces from the URL
        const cleanUrl = url.replace(/\\s+/g, '');
        return ' <a href="' + cleanUrl + '" target="_blank" rel="noopener noreferrer">' + cleanUrl + '</a>';
      });
      
      // Replace numbered lists (e.g., 1. Item -> <ol><li>Item</li></ol>)
      let hasNumberedList = false;
      let listMatch = text.match(/^(\\d+)\\.(\\s.+)$/gm);
      
      if (listMatch) {
        hasNumberedList = true;
        
        // Create a temporary version without the list to process later
        let tempText = text;
        
        // Extract all list items
        let listItems = [];
        let listRegex = /^(\\d+)\\.(\\s.+)$/gm;
        let match;
        
        while ((match = listRegex.exec(text)) !== null) {
          listItems.push('<li>' + match[2].trim() + '</li>');
          // Remove this item from the temp text
          tempText = tempText.replace(match[0], '');
        }
        
        // Add the ordered list with items
        if (listItems.length > 0) {
          let listHtml = '<ol>' + listItems.join('') + '</ol>';
          // Find where to place the list in the original text
          let firstListItemIndex = text.indexOf(listMatch[0]);
          text = text.substring(0, firstListItemIndex) + listHtml + tempText;
        }
      }
      
      // Handle unordered lists (* or - items)
      let unorderedMatch = text.match(/^[*\\-](\\s.+)$/gm);
      if (unorderedMatch) {
        let tempText = text;
        let listItems = [];
        let listRegex = /^[*\\-](\\s.+)$/gm;
        let match;
        
        while ((match = listRegex.exec(text)) !== null) {
          listItems.push('<li>' + match[1].trim() + '</li>');
          tempText = tempText.replace(match[0], '');
        }
        
        if (listItems.length > 0) {
          let listHtml = '<ul>' + listItems.join('') + '</ul>';
          let firstListItemIndex = text.indexOf(unorderedMatch[0]);
          text = text.substring(0, firstListItemIndex) + listHtml + tempText;
        }
      }
      
      // Replace ** or __ for bold
      text = text.replace(/(\\*\\*|__)(.*?)\\1/g, '<strong>$2</strong>');
      
      // Replace * or _ for italics
      text = text.replace(/(\\*|_)(.*?)\\1/g, '<em>$2</em>');
      
      // Replace code blocks
      text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      
      // Replace new lines with <br>
      text = text.replace(/\\n/g, '<br>');
      
      // Fix any excessive <br> tags
      text = text.replace(/(<br>\\s*){3,}/g, '<br><br>');
      
      return text;
    }
    
    // Keep track of conversation history
    let conversationHistory = [];
    const MAX_HISTORY = 10; // Keep last 5 exchanges (10 messages)
    
    // Initialize with the welcome message
    const welcomeMsg = 'Halo! Aku Azzar. Freelance developer & educator dari Jogja. Ada yang bisa dibantu?';
    
    // Load conversation history from localStorage if available
    const loadConversationHistory = () => {
      const savedHistory = localStorage.getItem('azzarChatHistory');
      if (savedHistory) {
        try {
          conversationHistory = JSON.parse(savedHistory);
          // Display saved messages (clear first to avoid duplicating welcome message)
          messagesContainer.innerHTML = '';
          conversationHistory.forEach(msg => {
            addMessageToUI(msg.role === 'user' ? 'user' : 'ai', msg.content);
          });
        } catch (e) {
          console.error('Error loading chat history:', e);
          conversationHistory = [{
            role: 'assistant',
            content: welcomeMsg
          }];
        }
      } else {
        // Initialize with welcome message if no history exists
        conversationHistory = [{
          role: 'assistant',
          content: welcomeMsg
        }];
      }
      
      // Save the initial history
      saveConversationHistory();
    };
    
    // Save conversation history to localStorage
    const saveConversationHistory = () => {
      localStorage.setItem('azzarChatHistory', JSON.stringify(conversationHistory));
    };
    
    // Add a message to the UI
    const addMessageToUI = (sender, message) => {
      const messageElement = document.createElement('div');
      messageElement.className = 'message ' + sender + '-message';
      
      // Convert markdown to HTML for AI messages only
      if (sender === 'ai') {
        messageElement.innerHTML = markdownToHtml(message);
      } else {
        messageElement.textContent = message;
      }
      
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };
    
    // Add a message to the conversation history
    const addMessageToHistory = (role, content) => {
      conversationHistory.push({ role, content });
      // Keep only the last MAX_HISTORY messages
      if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory = conversationHistory.slice(conversationHistory.length - MAX_HISTORY);
      }
      saveConversationHistory();
    };
    
    // Send a message to the AI
    const sendMessage = async () => {
      const message = inputField.value.trim();
      if (!message) return;
      
      // Add user message to UI and history
      addMessageToUI('user', message);
      addMessageToHistory('user', message);
      
      // Clear input field
      inputField.value = '';
      
      // Show typing indicator
      typingIndicator.classList.add('visible');
      
      try {
        // Send request to AI
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            message,
            history: conversationHistory.slice(0, -1) // Send all except the last message (which is the user's message we just added)
          })
        });
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        // Hide typing indicator
        typingIndicator.classList.remove('visible');
        
        // Add AI response to UI and history
        const aiResponse = data.response || "Sorry, I couldn't process that request.";
        addMessageToUI('ai', aiResponse);
        addMessageToHistory('assistant', aiResponse);
        
      } catch (error) {
        console.error('Error:', error);
        // Hide typing indicator
        typingIndicator.classList.remove('visible');
        // Show error message
        addMessageToUI('ai', "Sorry, there was an error processing your request. Please try again.");
      }
    };
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    inputField.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        sendMessage();
      }
    });
    
    clearButton.addEventListener('click', () => {
      // Clear UI
      messagesContainer.innerHTML = '';
      // Add back welcome message
      const welcomeDiv = document.createElement('div');
      welcomeDiv.className = 'message ai-message';
      welcomeDiv.textContent = welcomeMsg;
      messagesContainer.appendChild(welcomeDiv);
      
      // Reset history
      conversationHistory = [{
        role: 'assistant',
        content: welcomeMsg
      }];
      saveConversationHistory();
    });
    
    // Load conversation history on page load
    loadConversationHistory();
  </script>
</body>
</html>
  `;
}