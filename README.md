# GITHUB FS

a fake filesystem that use the github api and encrypts the data

### Paths

directorys: "dir/dir"

files: "dir/dir/file.ext"

### Install

```bat
npm i gh-fs
```

## Functions

```js
import GitHubFS from "gh-fs";

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
await githubFS.exists(PATH);
//files
await githubFS.getFileMetadata(PATH);
await githubFS.writeFile(PATH, CONTENT, COMMITMESSAGE_DEFAULT_IS_DATE);
await githubFS.readFile(PATH);
await githubFS.deleteFile(PATH, COMMITMESSAGE_DEFAULT_IS_DATE);
await githubFS.moveFile(SRC_PATH, DEST_PATH, COMMITMESSAGE_DEFAULT_IS_DATE);
await githubFS.copyFile(SRC_PATH, DEST_PATH, COMMITMESSAGE_DEFAULT_IS_DATE);
//dirs
await githubFS.createDir(DIR, COMMITMESSAGE_DEFAULT_IS_DATE);
await githubFS.readDir(DIR);
await githubFS.deleteDir(DIR, COMMITMESSAGE_DEFAULT_IS_DATE);
```
