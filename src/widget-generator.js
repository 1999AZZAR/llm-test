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
      const primaryColor = (rootStyles.getPropertyValue('--primary-color') || 
                         rootStyles.getPropertyValue('--primary') || 
                         rootStyles.getPropertyValue('--main-color') ||
                         '#6200ee').trim();
      
      const primaryDarkColor = (rootStyles.getPropertyValue('--primary-dark') || 
                            rootStyles.getPropertyValue('--dark-primary') ||
                            '#3700b3').trim();
      
      const textOnPrimaryColor = (rootStyles.getPropertyValue('--on-primary') || 
                              rootStyles.getPropertyValue('--text-on-primary') ||
                              'white').trim();
      
      const backgroundColor = (rootStyles.getPropertyValue('--background') || 
                           rootStyles.getPropertyValue('--bg-color') ||
                           '#f5f5f5').trim();
      
      // Add support for nonary color for AI message background
      const nonaryColor = (rootStyles.getPropertyValue('--nonary-color') || 
                       '#e0e0e0').trim();
                       
      // Add support for octonary color for chat container background
      const octonaryColor = (rootStyles.getPropertyValue('--octonary-color') ||
                         'white').trim();
      
      // Format colors with # prefix if needed
      const formatColor = color => {
        if (color && !color.startsWith('#') && !color.startsWith('rgb')) {
          return '#' + color;
        }
        return color;
      };
      
      return {
        primaryColor: formatColor(primaryColor),
        primaryDarkColor: formatColor(primaryDarkColor),
        textOnPrimaryColor,
        backgroundColor,
        nonaryColor: formatColor(nonaryColor),
        octonaryColor: formatColor(octonaryColor)
      };
    };
    
    // Create widget container
    const createWidget = () => {
      // Detect the website's color scheme
      const colors = detectColorScheme();
      
      // Create widget styles with dynamic colors
      const style = document.createElement('style');
      style.textContent = \`
        @keyframes azzarPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(98, 0, 238, 0.4);
            transform: scale(1);
          }
          70% {
            box-shadow: 0 0 0 12px rgba(98, 0, 238, 0);
            transform: scale(1.03);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(98, 0, 238, 0);
            transform: scale(1);
          }
        }
        
        .azzar-chat-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .azzar-chat-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: \${colors.primaryColor};
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          color: \${colors.textOnPrimaryColor};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s ease;
          animation: azzarPulse 2s infinite cubic-bezier(0.66, 0, 0, 1);
          will-change: transform, box-shadow;
        }
        
        .azzar-chat-button:hover {
          background-color: \${colors.primaryDarkColor};
          animation: none;
        }
        
        .azzar-chat-icon {
          width: 28px;
          height: 28px;
        }
        
        .azzar-chat-window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 400px;
          height: 500px;
          background: \${colors.backgroundColor || 'white'};
          border-radius: 10px;
          box-shadow: 0 5px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          display: none;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.3s ease, transform 0.3s ease;
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
      
      // Create chat button with optimized SVG
      const button = document.createElement('div');
      button.className = 'azzar-chat-button';
      button.innerHTML = '<svg class="azzar-chat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>';
      
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
        // Stop animation when opened
        if (chatWindow.classList.contains('open')) {
          button.style.animation = 'none';
        } else {
          button.style.animation = 'azzarPulse 2s infinite cubic-bezier(0.66, 0, 0, 1)';
        }
      });
      
      // Function to update colors when theme changes
      const updateColors = () => {
        const newColors = detectColorScheme();
        button.style.backgroundColor = newColors.primaryColor;
        
        // Update keyframes color dynamically
        const keyframesRule = \`
          @keyframes azzarPulse {
            0% {
              box-shadow: 0 0 0 0 \${newColors.primaryColor.replace(')', ', 0.4)')};
              transform: scale(1);
            }
            70% {
              box-shadow: 0 0 0 12px \${newColors.primaryColor.replace(')', ', 0)')};
              transform: scale(1.03);
            }
            100% {
              box-shadow: 0 0 0 0 \${newColors.primaryColor.replace(')', ', 0)')};
              transform: scale(1);
            }
          }
        \`;
        
        // Inject updated animation
        const oldStyle = document.querySelector('style[data-azzar-animation]');
        if (oldStyle) {
          oldStyle.textContent = keyframesRule;
        } else {
          const animStyle = document.createElement('style');
          animStyle.setAttribute('data-azzar-animation', 'true');
          animStyle.textContent = keyframesRule;
          document.head.appendChild(animStyle);
        }
        
        // Update other styles
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
      
      // Set up a minimal mutation observer to watch for theme changes
      if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
          let needsUpdate = false;
          
          for (const mutation of mutations) {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'class' || 
                 mutation.attributeName === 'style')) {
              needsUpdate = true;
              break;
            }
            
            if (mutation.type === 'childList' && 
                mutation.addedNodes.length && 
                Array.from(mutation.addedNodes).some(node => 
                  node.nodeName && node.nodeName.toLowerCase() === 'style')) {
              needsUpdate = true;
              break;
            }
          }
          
          if (needsUpdate) {
            updateColors();
          }
        });
        
        // Observe the document root for attribute changes and style element changes
        observer.observe(document.documentElement, { 
          attributes: true,
          attributeFilter: ['class', 'style'],
          childList: true,
          subtree: false
        });
      }
    };
    
    // Initialize the widget efficiently
    if (document.readyState !== 'loading') {
      createWidget();
    } else {
      document.addEventListener('DOMContentLoaded', createWidget);
    }
  })();
    `;
  }