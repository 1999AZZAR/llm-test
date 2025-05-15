# Azzar AI Chat

A customizable AI chat widget powered by Cloudflare Workers and Llama 3.1 that can be embedded into any website.

## Features

- Responsive chat interface
- Conversation history with context
- Clear button to reset conversations
- Embeddable on any website
- **Automatic color scheme detection** - adapts to your website's theme
- Powered by llama-3.1-70b-instruct model via Cloudflare AI

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

## Deployment

This project uses Cloudflare Workers for deployment.

1. Install Wrangler CLI: `npm install -g wrangler`
2. Configure your `wrangler.toml` with the appropriate AI binding
3. Deploy to Cloudflare: `wrangler deploy` 