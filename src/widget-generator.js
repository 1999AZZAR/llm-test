export function generateWidgetJS(origin) {
    return `
  // Azzar AI Chat Widget
  (function() {
    // Helper to get explicit language setting (robust, always up-to-date)
    function detectAzzarLang() {
      // 1. window.AZZAR_CHAT_CONFIG.lang
      if (window.AZZAR_CHAT_CONFIG && window.AZZAR_CHAT_CONFIG.lang) {
        return window.AZZAR_CHAT_CONFIG.lang;
      }
      // 2. <script data-azzar-lang="...">
      var scripts = document.querySelectorAll('script[data-azzar-lang]');
      if (scripts.length > 0) {
        return scripts[0].getAttribute('data-azzar-lang');
      }
      // 3. <html lang>
      if (document.documentElement.lang) {
        return document.documentElement.lang;
      }
      // 4. navigator.language
      if (navigator.language) {
        return navigator.language.split('-')[0];
      }
      return 'en';
    }
  
    // Robustly update language and regenerate welcome message
    function setAzzarLang(newLang, force) {
      if (typeof newLang === 'string' && newLang.length > 0) {
        window.azzarChatCurrentLang = newLang;
        // Always reset chat with new language
        if (typeof loadConversationHistory === 'function') {
          loadConversationHistory(true); // force reload welcome message
        }
      } else if (force) {
        // If no lang provided but force is true, re-detect and reload
        window.azzarChatCurrentLang = detectAzzarLang();
        if (typeof loadConversationHistory === 'function') {
          loadConversationHistory(true);
        }
      }
    }
  
    // Expose robust API
    window.azzarChatSetLang = function(newLang) {
      setAzzarLang(newLang, true);
    };
  
    // Observe <html lang> changes for dynamic language switching
    if (window.MutationObserver) {
      const htmlObserver = new MutationObserver(function(mutations) {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
            setAzzarLang(document.documentElement.lang, true);
          }
        }
      });
      htmlObserver.observe(document.documentElement, { attributes: true });
    }
  
    // On widget load, always use robust detection
    window.azzarChatCurrentLang = detectAzzarLang();
  
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
      
      // Add support for nonary color for AI message background
      let nonaryColor = rootStyles.getPropertyValue('--nonary-color') || 
                       '#e0e0e0'; // Default fallback is light gray
                       
      // Add support for octonary color for chat container background
      let octonaryColor = rootStyles.getPropertyValue('--octonary-color') ||
                         'white'; // Default fallback is white
      
      // Clean up the detected colors (remove whitespace, etc.)
      primaryColor = primaryColor.trim();
      primaryDarkColor = primaryDarkColor.trim();
      textOnPrimaryColor = textOnPrimaryColor.trim();
      backgroundColor = backgroundColor.trim();
      nonaryColor = nonaryColor.trim();
      octonaryColor = octonaryColor.trim();
      
      // If colors don't start with '#' or 'rgb', add '#'
      if (primaryColor && !primaryColor.startsWith('#') && !primaryColor.startsWith('rgb')) {
        primaryColor = '#' + primaryColor;
      }
      
      if (primaryDarkColor && !primaryDarkColor.startsWith('#') && !primaryDarkColor.startsWith('rgb')) {
        primaryDarkColor = '#' + primaryDarkColor;
      }
      
      if (nonaryColor && !nonaryColor.startsWith('#') && !nonaryColor.startsWith('rgb')) {
        nonaryColor = '#' + nonaryColor;
      }
      
      if (octonaryColor && !octonaryColor.startsWith('#') && !octonaryColor.startsWith('rgb')) {
        octonaryColor = '#' + octonaryColor;
      }
      
      return {
        primaryColor,
        primaryDarkColor,
        textOnPrimaryColor,
        backgroundColor,
        nonaryColor,
        octonaryColor
      };
    };
    
    // Create widget container
    const createWidget = () => {
      // Detect the website's color scheme
      const colors = detectColorScheme();
      
      // Helper to convert hex to RGB for the animation
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const primaryRgb = hexToRgb(colors.primaryColor);
      colors.primaryColorRGB = primaryRgb ? (primaryRgb.r + ", " + primaryRgb.g + ", " + primaryRgb.b) : '98, 0, 238'; // Default to purple if conversion fails

      // Create widget styles with dynamic colors
      const style = document.createElement('style');
      style.textContent = \\\`
        @keyframes azzar-wave-animation {
          0% {
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(\\\${colors.primaryColorRGB}, 0.7);
          }
          70% {
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), 0 0 0 10px rgba(\\\${colors.primaryColorRGB}, 0);
          }
          100% {
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(\\\${colors.primaryColorRGB}, 0);
          }
        }

        .azzar-chat-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-family: 'Roboto', Arial, sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: azzar-wave-animation 2s infinite;
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
          width: 400px; /* Increased from 350px */
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
      \\\`;
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
        backgroundColor: encodeURIComponent(colors.backgroundColor),
        nonaryColor: encodeURIComponent(colors.nonaryColor),
        octonaryColor: encodeURIComponent(colors.octonaryColor)
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
          backgroundColor: encodeURIComponent(newColors.backgroundColor),
          nonaryColor: encodeURIComponent(newColors.nonaryColor),
          octonaryColor: encodeURIComponent(newColors.octonaryColor)
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