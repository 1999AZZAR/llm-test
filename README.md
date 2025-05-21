# Azzar AI Chat Widget

A modern, embeddable AI chat widget powered by Cloudflare Workers and Llama 3.1, designed for easy integration, beautiful theming, and a highly personalized AI persona.

## Features

- **AI-generated, language-aware welcome message** (adapts to your website's language)
- Responsive, mobile-friendly design
- Automatically adapts to your website's color scheme via CSS variables
- Conversation history is persisted in local storage
- Simple integration: just add one script tag
- API endpoint for custom integrations

## Installation

Add the following script to your website:

```html
<script src="https://<your-domain-or-worker>/widget.js"></script>
```

## Customization

### 1. Color Theming (via CSS Variables)

The widget automatically adapts to your website's color scheme using CSS variables. You can override these in your site's CSS or in a `<style>` block:

| CSS Variable           | Description                                 | Default Value   |
|-----------------------|---------------------------------------------|-----------------|
| `--primary-color`     | Main accent color (buttons, highlights)     | `#6200ee`       |
| `--primary-dark`      | Darker shade for hover/focus                | `#3700b3`       |
| `--on-primary`        | Text color on primary backgrounds           | `white`         |
| `--background`        | Chat window background                      | `#f5f5f5`       |
| `--nonary-color`      | AI message background                       | `#e0e0e0`       |
| `--octonary-color`    | Chat container background                   | `white`         |

**Example:**
```css
:root {
  --primary-color: #009688;
  --primary-dark: #00695c;
  --on-primary: #fff;
  --background: #fafafa;
  --nonary-color: #e3f2fd;
  --octonary-color: #fff;
}
```

You can set these globally or on a specific container. The widget will pick up changes automatically (even if you change them dynamically for dark/light mode).

### 2. Language Detection & Welcome Message

- The widget detects the language in the following order:
  1. `window.AZZAR_CHAT_CONFIG.lang` (set before the widget loads)
  2. `<script src=".../widget.js" data-azzar-lang="...">`
  3. `<html lang="...">`
  4. `navigator.language`
- On load, it requests a welcome message from `/api/welcome-message?lang=...`.
- The backend uses the AI persona (from `systemInstruction.txt`) to generate a short, friendly welcome message in the requested language.
- The welcome message will always match your AI's persona and the user's language.

**Ways to set the language:**

1. **Global JS config (highest priority):**
   ```html
   <script>
     window.AZZAR_CHAT_CONFIG = { lang: 'en' };
   </script>
   <script src="https://<your-domain-or-worker>/widget.js"></script>
   ```

2. **Script tag attribute:**
   ```html
   <script src="https://<your-domain-or-worker>/widget.js" data-azzar-lang="id"></script>
   ```

3. **HTML lang attribute:**
   ```html
   <html lang="en">
   ```

4. **Browser language (fallback):**
   If none of the above are set, the widget will use the browser's language.

**Dynamic language switching (for SPAs or language switchers):**

You can change the language at runtime using the global API:
```js
window.azzarChatSetLang('id'); // Switches to Bahasa Indonesia and resets the chat
window.azzarChatSetLang('en'); // Switches to English and resets the chat
```

The widget will fetch a new welcome message and reset the conversation history in the new language.

### 3. API Endpoints

For detailed information on all available API endpoints, request/response schemas, and parameters, please see the dedicated [API Reference (API.md)](./API.md).

Brief overview:
- **GET `/widget.js`**: Serves the widget's JavaScript.
- **GET `/widget-iframe`**: Serves the widget's iframe HTML.
- **POST `/api/chat`**: Send a message and conversation history, get an AI response.
- **GET `/api/welcome-message?lang=xx`**: Get a language-aware, AI-generated welcome message.
- **GET `/api/cache-stats`**: Get statistics about the in-memory cache (for debugging).

## Example: Full Integration

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>My Site with Azzar AI Chat</title>
  <style>
    :root {
      --primary-color: #ff5722;
      --primary-dark: #bf360c;
      --on-primary: #fff;
      --background: #fbe9e7;
      --nonary-color: #ffe0b2;
      --octonary-color: #fff3e0;
    }
  </style>
</head>
<body>
  <!-- Your site content -->
  <script src="https://<your-domain-or-worker>/widget.js"></script>
</body>
</html>
```

- The widget will use Bahasa Indonesia for the welcome message and UI.
- All colors will match your custom theme.

## Updating the AI Persona

- Edit `src/systemInstruction.txt` to change the AI's persona, tone, or expertise.
- Deploy using `./deploy.sh` to sync the latest persona to Cloudflare KV and your Worker.
- The welcome message and all AI responses will immediately reflect your changes.

## Advanced

- The widget supports dynamic theme changes (e.g., switching to dark mode at runtime).
- You can further customize the widget by overriding its CSS classes or using more advanced selectors.
- The welcome message is always generated by the AI, so you can localize or personalize it just by changing the persona or the page language.

## Troubleshooting

- If the welcome message or persona doesn't update, make sure you have run `./deploy.sh` and the latest `systemInstruction.txt` is in Cloudflare KV.
- Check your browser's console for errors if the widget doesn't appear or style correctly.

## License
MIT 

## Demo Page: Live Language Switching

The included demo page showcases robust, instant language switching for the chat widget:

- **Language switcher UI:** Buttons above the widget let you switch between English and Bahasa Indonesia instantly.
- **How it works:**
  - The demo page (parent) sends a `postMessage` to the widget iframe when you click a language button.
  - The widget iframe listens for this message and calls its internal `window.azzarChatSetLang` API.
  - The welcome message is regenerated immediately in the selected language, and the chat resets.

**Parent page code (demo):**
```js
function postLangToIframe(lang) {
  var iframe = document.querySelector('.azzar-chat-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ azzarSetLang: lang }, '*');
  }
}
document.getElementById('lang-en').addEventListener('click', function() {
  postLangToIframe('en');
});
document.getElementById('lang-id').addEventListener('click', function() {
  postLangToIframe('id');
});
```

**Widget iframe code:**
```js
window.addEventListener('message', function(event) {
  if (event.data && event.data.azzarSetLang) {
    if (typeof window.azzarChatSetLang === 'function') {
      window.azzarChatSetLang(event.data.azzarSetLang);
    }
  }
});
```

## Supported Languages

The widget supports instant welcome message generation in all these languages (and more can be added):

- en: English
- id: Bahasa Indonesia
- ms: Bahasa Melayu
- jv: Javanese
- su: Sundanese
- fr: French
- de: German
- es: Spanish
- it: Italian
- pt: Portuguese
- ru: Russian
- zh: Chinese
- ja: Japanese
- ko: Korean
- ar: Arabic
- hi: Hindi
- th: Thai
- vi: Vietnamese
- nl: Dutch
- tr: Turkish
- pl: Polish
- sv: Swedish
- fi: Finnish
- da: Danish
- no: Norwegian
- ro: Romanian
- hu: Hungarian
- cs: Czech
- el: Greek
- he: Hebrew
- uk: Ukrainian
- fa: Persian
- ur: Urdu

## Adding More Languages

To add more languages to the demo or widget:
- Add a new button to the demo page's language switcher UI and update the `postLangToIframe` handler.
- Add the language code and full name to the `langMap` in the backend (`src/index.js`).
- The widget and backend will handle the rest automatically.

## Advanced Integration

- The widget supports dynamic language switching via API, UI, or even `<html lang>` changes (thanks to a MutationObserver).
- The demo page demonstrates best practices for cross-frame communication and robust multilingual support. 