import { Octokit } from "@octokit/core";
import crypto from "crypto";

class GitHubFS {
  constructor({
    authToken,
    owner,
    repo,
    defaultCommitter = {
      name: "Default Committer",
      email: "default@example.com",
    },
    encryptionKey,
  }) {
    this.octokit = new Octokit({ auth: authToken });
    this.owner = owner;
    this.repo = repo;
    this.committer = defaultCommitter;
    this.encryptionKey = encryptionKey;
  }

  encrypt(content) {
    const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(content, "utf8"),
      cipher.final(),
    ]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }

  decrypt(content) {
    const [ivHex, encryptedHex] = content.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  async getFileMetadata(path) {
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: this.owner,
          repo: this.repo,
          path,
        }
      );
      return data;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async writeFile(path, content, message = new Date().toString()) {
    let sha = undefined;
    const metadata = await this.getFileMetadata(path);
    if (metadata) sha = metadata.sha;

    const encryptedContent = Buffer.from(this.encrypt(content)).toString(
      "base64"
    );

    const { data } = await this.octokit.request(
      "PUT /repos/{owner}/{repo}/contents/{path}",
      {
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        committer: this.committer,
        content: encryptedContent,
        sha,
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
      }
    );
    return data;
  }

  async readFile(path) {
    const metadata = await this.getFileMetadata(path);
    if (!metadata) throw new Error(`File '${path}' does not exist.`);

    const content = Buffer.from(metadata.content, "base64").toString("utf8");
    return this.decrypt(content);
  }

  async deleteFile(path, message = new Date().toString()) {
    const metadata = await this.getFileMetadata(path);
    if (!metadata) throw new Error(`File '${path}' does not exist.`);

    const { data } = await this.octokit.request(
      "DELETE /repos/{owner}/{repo}/contents/{path}",
      {
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        sha: metadata.sha,
        committer: this.committer,
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
      }
    );
    return data;
  }

  async deleteDir(path, message = new Date().toString()) {
    const files = await this.readDir(path); // List files in the directory

    if (!files || files.length === 0)
      throw new Error(`Directory '${path}' is empty or does not exist.`);

    // Delete all files and subdirectories in the directory
    for (const file of files) {
      const filePath = `${path}/${file.name}`; // Ensure the correct full path is used
      if (await this.exists(`${filePath}/.keep`)) {
        // If it's a subdirectory, recursively call deleteDir
        await this.deleteDir(filePath, message);
      } else {
        // Delete file individually
        await this.deleteFile(filePath, message);
      }
    }

    return {
      message: `Deleted all files and directory placeholder at '${path}'`,
    };
  }

  async createDir(path, message = "Creating directory") {
    const readmePath = `${path}/.keep`;
    return this.writeFile(readmePath, "#", message);
  }

  async readDir(path) {
    try {
      const { data } = await this.octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: this.owner,
          repo: this.repo,
          path,
        }
      );

      if (!Array.isArray(data)) {
        throw new Error(`Path '${path}' is not a directory.`);
      }

      return data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,
      }));
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async exists(path) {
    try {
      const metadata = await this.getFileMetadata(path);
      return !!metadata;
    } catch (error) {
      if (error.status === 404) return false;
      throw error;
    }
  }

  async moveFile(srcPath, destPath, message = "Moving file") {
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content, message);
    await this.deleteFile(srcPath, `Deleted after move: ${message}`);
  }

  async copyFile(srcPath, destPath, message = "Copying file") {
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content, message);
  }
}

export default GitHubFS;
