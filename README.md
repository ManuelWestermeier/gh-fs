# GITHUB FS

a fake filesystem that use the github api and encrypts the data

### Paths

directorys: "dir/dir"

files: "dir/dir/file.ext"

## Functions

```js
import GitHubFS from "./gh-fs.js";

// Initialize GitHubFS instance
const githubFS = new GitHubFS({
  authToken: GITHUB_API_TOKEN,
  owner: GITHUB_USERNAME,
  repo: REPO_NAME,
  defaultCommitter: {
    email: GITHUB_USER_EMAIL,
    name: GITHUB_USERNAME,
  },
  encryptionKey: YOUR_32_BYTE_ENCRYPTION_KEY, // Use a strong, secure key
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
```
