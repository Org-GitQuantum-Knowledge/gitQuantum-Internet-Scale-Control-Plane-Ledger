import express from "express";
import execa from "execa";
import fs from "fs";

const app = express();
app.use(express.json());

const REPO = "/repo";
const ENVS = ["dev", "staging", "prod"];

function file(env) {
  return `${REPO}/helm/app/values-${env}.yaml`;
}

async function syncRepo() {
  await execa("git", ["fetch", "origin"], { cwd: REPO });
  await execa("git", ["reset", "--hard", "origin/main"], { cwd: REPO });
}

function getSha(env) {
  const content = fs.readFileSync(file(env), "utf8");
  return content.match(/tag:\s*"(.*)"/)?.[1];
}

function setSha(env, sha) {
  const path = file(env);
  const updated = fs.readFileSync(path, "utf8")
    .replace(/tag:\s*".*"/, `tag: "${sha}"`);
  fs.writeFileSync(path, updated);
}

app.post("/promote", async (req, res) => {
  const { from, to } = req.body;

  await syncRepo();
  const sha = getSha(from);

  setSha(to, sha);

  await execa("git", ["commit", "-am", `promote ${sha} to ${to}`], { cwd: REPO });
  await execa("git", ["push"], { cwd: REPO });

  res.json({ ok: true, sha, to });
});

app.listen(3000);
