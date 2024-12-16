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

//exists
await githubFS.exists("path");
//files
await githubFS.getFileMetadata("path");
await githubFS.writeFile("path", "conetnt", "commitmessage/date");
await githubFS.readFile("path");
await githubFS.deleteFile("path", "commitmessage/date");
await githubFS.moveFile("src-path", "dest-path", "commitmessage/date");
await githubFS.copyFile("src-path", "dest-path", "commitmessage/date");
//dirs
await githubFS.createDir("dir", "commitmessage/date");
await githubFS.readDir("dir");
await githubFS.deleteDir("dir", "commitmessage/date");
