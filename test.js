import GitHubFS from "./gh-fs.js";
import { GITHUB_API_TOKEN } from "../api-token.js";

// Initialize GitHubFS instance
const githubFS = new GitHubFS({
  authToken: GITHUB_API_TOKEN,
  owner: "manuelwestermeier",
  repo: "data-test-2",
  defaultCommitter: {
    email: "westermeier111@gmail.com",
    name: "Manuel Westermeier",
  },
  encryptionKey: "my-secure-encryption-key-32!", // Use a strong, secure key
});
