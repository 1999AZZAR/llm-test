export function generateWidgetHTML(url) {
  // Extract color parameters from URL
  const primaryColor = decodeURIComponent(url.searchParams.get('primaryColor') || '#6200ee');
  const primaryDarkColor = decodeURIComponent(url.searchParams.get('primaryDarkColor') || '#3700b3');
  const textOnPrimaryColor = decodeURIComponent(url.searchParams.get('textOnPrimaryColor') || 'white');
  const backgroundColor = decodeURIComponent(url.searchParams.get('backgroundColor') || '#f5f5f5');
  const nonaryColor = decodeURIComponent(url.searchParams.get('nonaryColor') || '#e0e0e0');
  const octonaryColor = decodeURIComponent(url.searchParams.get('octonaryColor') || 'white');

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
      --nonary-color: ${nonaryColor};
      --octonary-color: ${octonaryColor};
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
      width: 100%; /* Ensure it takes up available space */
      margin: 0 auto;
      overflow: hidden;
      background-color: var(--octonary-color, white);
      padding: 0 5px; /* Add a bit of padding on the sides */
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
      background-color: var(--nonary-color, #e0e0e0);
      color: var(--primary-color, #333);
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
      border-top: 1px solid var(--nonary-color, #e0e0e0);
      background-color: var(--octonary-color, white);
    }
    
    .input-field {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid var(--nonary-color, #e0e0e0);
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
      color: var(--primary-color, #6200ee);
      border: 1px solid var(--nonary-color, #e0e0e0);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      margin-left: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .clear-button:hover {
      background-color: var(--nonary-color, #e0e0e0);
    }
    
    .clear-icon {
      width: 24px;
      height: 24px;
    }
    
    .typing-indicator {
      display: none;
      padding: 12px 16px;
      background-color: var(--nonary-color, #e0e0e0);
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
      background-color: var(--primary-color, #6200ee);
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
      text-decoration: none; /* Remove underline by default */
      border-bottom: 1px solid rgba(98, 0, 238, 0.4); /* Subtle bottom border */
      word-break: break-all;
      font-weight: 500;
      transition: all 0.2s ease-in-out;
      padding: 0 2px;
      border-radius: 2px;
      position: relative;
      display: inline-block;
    }
    
    .ai-message a:hover {
      text-decoration: none;
      background-color: #f0e6ff; /* Light purple background */
      color: var(--primary-color, #6200ee);
      box-shadow: 0 1px 0 var(--primary-color, #6200ee);
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="messages" id="messages">
      <div class="message ai-message">
        Halo! saya Azzar. Freelance developer & educator dari Jogja. Ada yang bisa dibantu?
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
    
    // Load conversation history from localStorage if available
    const loadConversationHistory = async (forceWelcome) => {
      const savedHistory = localStorage.getItem('azzarChatHistory');
      let lang = window.azzarChatCurrentLang || detectAzzarLang() || 'en';
      let welcomeMsg = '';
      // Fetch welcome message from API with lang param
      try {
        const resp = await fetch('/api/welcome-message?lang=' + encodeURIComponent(lang));
        if (resp.ok) {
          const data = await resp.json();
          welcomeMsg = data.welcome || '';
        }
      } catch (e) {
        // ignore
      }
      if (!welcomeMsg) {
        welcomeMsg = lang === 'id' ? 'Halo! saya Azzar. Freelance developer & educator dari Jogja. Ada yang bisa dibantu?' : 'Hi! I am Azzar, a freelance developer & educator from Jogja. How can I help you?';
      }
      if (savedHistory && !forceWelcome) {
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
          messagesContainer.innerHTML = '';
          addMessageToUI('ai', welcomeMsg);
        }
      } else {
        // Initialize with welcome message if no history exists or forceWelcome
        conversationHistory = [{
          role: 'assistant',
          content: welcomeMsg
        }];
        messagesContainer.innerHTML = '';
        addMessageToUI('ai', welcomeMsg);
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
      (async () => {
        // Detect language: try <html lang> first, then navigator.language
        let lang = document.documentElement.lang || (navigator.language ? navigator.language.split('-')[0] : 'en');
        if (!lang) lang = 'en';
        let welcomeMsg = '';
        try {
          const resp = await fetch('/api/welcome-message?lang=' + encodeURIComponent(lang));
          if (resp.ok) {
            const data = await resp.json();
            welcomeMsg = data.welcome || '';
          }
        } catch (e) {}
        if (!welcomeMsg) {
          welcomeMsg = lang === 'id' ? 'Halo! saya Azzar. Freelance developer & educator dari Jogja. Ada yang bisa dibantu?' : 'Hi! I am Azzar, a freelance developer & educator from Jogja. How can I help you?';
        }
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
      })();
    });
    
    // Load conversation history on page load
    loadConversationHistory();

    // Add cross-frame language switching support
    window.addEventListener('message', function(event) {
      if (event.data && event.data.azzarSetLang) {
        if (typeof window.azzarChatSetLang === 'function') {
          window.azzarChatSetLang(event.data.azzarSetLang);
        }
      }
    });
  </script>
</body>
</html>
  `;
}