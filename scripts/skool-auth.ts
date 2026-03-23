/**
 * Skool Authentication Script
 *
 * Automates Skool login and captures session cookies for API access.
 *
 * Usage:
 *   SKOOL_EMAIL="your@email.com" SKOOL_PASSWORD="yourpass" bun run scripts/skool-auth.ts
 *
 * Or interactively (will prompt for credentials):
 *   bun run scripts/skool-auth.ts --interactive
 *
 * Output:
 *   - Saves cookies to .env.local as SKOOL_COOKIES
 *   - Also saves to scripts/.skool-cookies.json for debugging
 */

import { chromium, type Cookie } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { createInterface } from "readline";
import { resolve } from "path";

const SKOOL_LOGIN_URL = "https://www.skool.com/login";
const SKOOL_HOME_URL = "https://www.skool.com";

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      process.stdout.write(question);
      let input = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", (char) => {
        const c = char.toString();
        if (c === "\n" || c === "\r") {
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          rl.close();
          resolve(input);
        } else if (c === "\u0003") {
          process.exit();
        } else if (c === "\u007F") {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else {
          input += c;
          process.stdout.write("*");
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

async function getCredentials(): Promise<{ email: string; password: string }> {
  const email = process.env.SKOOL_EMAIL;
  const password = process.env.SKOOL_PASSWORD;
  const interactive = process.argv.includes("--interactive");

  if (email && password) {
    return { email, password };
  }

  if (interactive || (!email || !password)) {
    console.log("\n🔐 Skool Authentication\n");
    const inputEmail = email || (await prompt("Email: "));
    const inputPassword = password || (await prompt("Password: ", true));
    return { email: inputEmail, password: inputPassword };
  }

  throw new Error(
    "Missing credentials. Set SKOOL_EMAIL and SKOOL_PASSWORD env vars, or use --interactive"
  );
}

async function loginToSkool(
  email: string,
  password: string
): Promise<Cookie[]> {
  console.log("\n🚀 Launching browser...");

  const browser = await chromium.launch({
    headless: process.argv.includes("--headless"),
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("📍 Navigating to Skool login...");
    await page.goto(SKOOL_LOGIN_URL, { waitUntil: "networkidle" });

    // Wait for login form
    console.log("⏳ Waiting for login form...");
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', {
      timeout: 10000,
    });

    // Fill credentials
    console.log("📝 Entering credentials...");

    // Try different selectors for email field
    const emailInput = await page.$('input[type="email"]')
      || await page.$('input[name="email"]')
      || await page.$('input[placeholder*="email" i]');

    if (emailInput) {
      await emailInput.fill(email);
    } else {
      throw new Error("Could not find email input field");
    }

    // Try different selectors for password field
    const passwordInput = await page.$('input[type="password"]')
      || await page.$('input[name="password"]');

    if (passwordInput) {
      await passwordInput.fill(password);
    } else {
      throw new Error("Could not find password input field");
    }

    // Find and click login button
    console.log("🔑 Submitting login...");
    const loginButton = await page.$('button[type="submit"]')
      || await page.$('button:has-text("Log in")')
      || await page.$('button:has-text("Sign in")');

    if (loginButton) {
      await loginButton.click();
    } else {
      // Try pressing Enter
      await passwordInput?.press("Enter");
    }

    // Wait for redirect to home or dashboard
    console.log("⏳ Waiting for login to complete...");

    try {
      await page.waitForURL((url) => {
        const path = url.pathname;
        return path === "/" || path.includes("/community") || !path.includes("/login");
      }, { timeout: 30000 });
    } catch {
      // Check if we hit 2FA or error
      const currentUrl = page.url();
      if (currentUrl.includes("login")) {
        // Check for error message
        const errorEl = await page.$('[class*="error"], [role="alert"]');
        if (errorEl) {
          const errorText = await errorEl.textContent();
          throw new Error(`Login failed: ${errorText}`);
        }

        // Might be 2FA - wait for user
        console.log("\n⚠️  2FA or verification may be required.");
        console.log("   Complete the verification in the browser window...");

        await page.waitForURL((url) => !url.pathname.includes("/login"), {
          timeout: 120000, // 2 minutes for 2FA
        });
      }
    }

    console.log("✅ Login successful!");

    // Get all cookies
    const cookies = await context.cookies();

    // Filter to Skool-related cookies
    const skoolCookies = cookies.filter(
      (c) =>
        c.domain.includes("skool.com") ||
        c.domain.includes("clerk")
    );

    console.log(`📦 Captured ${skoolCookies.length} cookies`);

    return skoolCookies;
  } finally {
    await browser.close();
  }
}

function saveCookies(cookies: Cookie[]): void {
  const scriptDir = resolve(import.meta.dir);
  const projectRoot = resolve(scriptDir, "..");

  // Save as JSON for debugging
  const jsonPath = resolve(scriptDir, ".skool-cookies.json");
  writeFileSync(jsonPath, JSON.stringify(cookies, null, 2));
  console.log(`📄 Saved cookies to: ${jsonPath}`);

  // Convert to cookie header format for API calls
  const cookieHeader = cookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Update .env.local
  const envPath = resolve(projectRoot, "apps/web/.env.local");
  let envContent = "";

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8");
    // Remove existing SKOOL_COOKIES line
    envContent = envContent
      .split("\n")
      .filter((line) => !line.startsWith("SKOOL_COOKIES="))
      .join("\n");
  }

  // Add new cookies
  envContent = envContent.trim() + `\n\n# Skool session cookies (auto-generated)\nSKOOL_COOKIES="${cookieHeader}"\n`;

  writeFileSync(envPath, envContent);
  console.log(`🔐 Updated: ${envPath}`);

  // Show expiry info
  const sessionCookie = cookies.find((c) => c.name.includes("session") || c.name === "__session");
  if (sessionCookie?.expires) {
    const expiry = new Date(sessionCookie.expires * 1000);
    console.log(`⏰ Session expires: ${expiry.toLocaleString()}`);
  }
}

async function testAuth(cookies: Cookie[]): Promise<boolean> {
  console.log("\n🧪 Testing authentication...");

  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  try {
    const response = await fetch(
      "https://api2.skool.com/self/chat-channels?offset=0&limit=1",
      {
        headers: {
          accept: "application/json",
          cookie: cookieHeader,
          origin: "https://www.skool.com",
          referer: "https://www.skool.com/",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ API access confirmed!");
      console.log(`   Found ${data.channels?.length ?? 0} chat channels`);
      return true;
    } else {
      console.log(`❌ API returned ${response.status}: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ API test failed: ${error}`);
    return false;
  }
}

async function main() {
  try {
    const { email, password } = await getCredentials();
    const cookies = await loginToSkool(email, password);
    saveCookies(cookies);
    await testAuth(cookies);

    console.log("\n🎉 Done! You can now use Skool API endpoints.");
    console.log("   Cookies are saved in apps/web/.env.local as SKOOL_COOKIES\n");
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
