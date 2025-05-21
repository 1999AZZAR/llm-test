// Environment setup & configuration
import { generateWidgetJS } from './widget-generator.js';
import { generateInstructionsHTML } from './demo-generator.js';
import { generateWidgetHTML } from './iframe-generator.js';
import { LRUCache, memoryCache } from './lru-handler.js';

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
      
      // Add: Handle welcome message API
      if (url.pathname === '/api/welcome-message' && request.method === 'GET') {
        // Load systemInstruction.txt
        const systemPrompt = await getSystemPrompt(request.url, env);
        // Get requested language from query param, fallback to 'en'
        const langCode = url.searchParams.get('lang') || 'en';
        // Map language codes to full names
        const langMap = {
          en: 'English',
          id: 'Bahasa Indonesia',
          ms: 'Bahasa Melayu',
          jv: 'Javanese',
          su: 'Sundanese',
          fr: 'French',
          de: 'German',
          es: 'Spanish',
          it: 'Italian',
          pt: 'Portuguese',
          ru: 'Russian',
          zh: 'Chinese',
          ja: 'Japanese',
          ko: 'Korean',
          ar: 'Arabic',
          hi: 'Hindi',
          th: 'Thai',
          vi: 'Vietnamese',
          nl: 'Dutch',
          tr: 'Turkish',
          pl: 'Polish',
          sv: 'Swedish',
          fi: 'Finnish',
          da: 'Danish',
          no: 'Norwegian',
          ro: 'Romanian',
          hu: 'Hungarian',
          cs: 'Czech',
          el: 'Greek',
          he: 'Hebrew',
          uk: 'Ukrainian',
          fa: 'Persian',
          ur: 'Urdu',
          // Add more as needed
        };
        const langName = langMap[langCode] || langCode;
        // Compose prompt for AI
        const aiPrompt = `${systemPrompt}\n\nGenerate a short, friendly welcome message for a chat widget. The message should be in ${langName}. Only output the message, no explanations or extra text.`;
        let welcome = '';
        try {
          if (env.AI) {
            const aiResp = await env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: aiPrompt }
              ],
              max_tokens: 100
            });
            if (typeof aiResp === 'string') {
              welcome = aiResp.trim();
            } else if (aiResp && typeof aiResp.response === 'string') {
              welcome = aiResp.response.trim();
            } else if (aiResp && typeof aiResp.text === 'string') {
              welcome = aiResp.text.trim();
            } else if (aiResp && typeof aiResp.content === 'string') {
              welcome = aiResp.content.trim();
            }
          }
        } catch (e) {
          // ignore, fallback below
        }
        if (!welcome) {
          welcome = langCode === 'id' ? 'Halo! saya Azzar. Freelance developer & educator dari Jogja. Ada yang bisa dibantu?' : 'Hi! I am Azzar, a freelance developer & educator from Jogja. How can I help you?';
        }
        return new Response(JSON.stringify({ welcome }), {
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
      return `You are Azzar, a helpful AI assistant who specializes in web development, microcontrollers, and IoT technology. You\'re created by a freelance engineer from Yogyakarta, Indonesia. You\'re friendly, knowledgeable, and always willing to help with technical questions.`;
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
  const defaultPrompt = "You are Azzar, a helpful AI assistant who specializes in web development, microcontrollers, and IoT technology. You\'re created by a freelance engineer from Yogyakarta, Indonesia. You\'re friendly, knowledgeable, and always willing to help with technical questions.";
  
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