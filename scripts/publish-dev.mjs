import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const PKG_PATH = new URL("../package.json", import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
const originalSdkPeer = pkg.peerDependencies["@atbash/sdk"];

pkg.peerDependencies["@atbash/sdk"] = "*";
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");

try {
  execSync("npm publish --tag dev --access public", { stdio: "inherit" });
} finally {
  pkg.peerDependencies["@atbash/sdk"] = originalSdkPeer;
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
}
