import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const rootDir = process.cwd();
const target = process.env.VERCEL_FRONTEND_APP ?? "customer";

const targets = {
  customer: {
    workspace: "@paragliding/customer-web",
    distDir: resolve(rootDir, "apps/customer-web/dist")
  },
  admin: {
    workspace: "@paragliding/admin-web",
    distDir: resolve(rootDir, "apps/admin-web/dist")
  },
  pilot: {
    workspace: "@paragliding/pilot-web",
    distDir: resolve(rootDir, "apps/pilot-web/dist")
  }
};

if (!targets[target]) {
  throw new Error(
    `Unsupported VERCEL_FRONTEND_APP="${target}". Use one of: ${Object.keys(targets).join(", ")}.`
  );
}

const outputDir = resolve(rootDir, "vercel-dist");
const { workspace, distDir } = targets[target];

execSync(`npm run build --workspace ${workspace}`, {
  cwd: rootDir,
  stdio: "inherit"
});

if (!existsSync(distDir)) {
  throw new Error(`Build output was not found at ${distDir}.`);
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(distDir, outputDir, { recursive: true });

console.log(`Prepared Vercel output for "${target}" at ${outputDir}`);
