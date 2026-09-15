import { spawn } from "bun";

console.log("🚀 Starting Elysia Backend & Svelte Frontend with Bun...\n");

const backend = spawn({
  cmd: ["bun", "run", "src/index.ts"],
  cwd: "./backend",
  stdout: "inherit",
  stderr: "inherit",
});

const frontend = spawn({
  cmd: ["bun", "run", "dev"],
  cwd: "./frontend",
  stdout: "inherit",
  stderr: "inherit",
});

const cleanup = () => {
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
