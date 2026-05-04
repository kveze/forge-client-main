import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import chalk from "chalk";

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const HISTORY_FILE = path.join(process.cwd(), ".claude_history.json");

// загрузка истории
let history = [];
if (fs.existsSync(HISTORY_FILE)) {
  history = fs.readJsonSync(HISTORY_FILE);
}

// аргументы
const args = process.argv.slice(2);
const input = args.join(" ");

if (!input) {
  console.log("Использование: claude \"твой запрос\"");
  process.exit(0);
}

// поддержка чтения файла
let content = input;
if (input.startsWith("file:")) {
  const filePath = input.replace("file:", "");
  content = fs.readFileSync(filePath, "utf-8");
}

// добавляем в историю
history.push({ role: "user", content });

(async () => {
  try {
    const res = await client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 2000,
      messages: history,
    });

    const reply = res.content[0].text;

    console.log(chalk.green("\nClaude:\n"));
    console.log(reply);

    history.push({ role: "assistant", content: reply });

    fs.writeJsonSync(HISTORY_FILE, history, { spaces: 2 });

  } catch (err) {
    console.error("Ошибка:", err.message);
  }
})();