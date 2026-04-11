<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/70ef8024-6b51-42fe-bb40-1626cd7e4c42

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Preview in VS Code

1. Start the dev server:
   `npm run dev`
2. Open the app inside VS Code with:
   `Ctrl+Shift+P` -> `Browser: Open Integrated Browser`
3. Paste this URL:
   `http://localhost:3000/`

If `Simple Browser` does not appear in your Command Palette, use `Browser: Open Integrated Browser` instead. This workspace is configured to prefer the integrated browser view.

## Preview on Your Phone

1. Keep `npm run dev` running.
2. Make sure your phone is on the same Wi-Fi network.
3. Open this URL on the phone:
   `http://192.168.100.4:3000/`

Important:
- Use `http`, not `https`.
- If your phone changes the address to `https://192.168.100.4:3000`, retype the full URL manually starting with `http://`.
- If it still does not open, allow Node.js or VS Code through Windows Firewall on private networks.
