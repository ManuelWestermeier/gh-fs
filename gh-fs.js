import { Octokit } from "@octokit/core";
import crypto from "crypto";

class GitHubFS {
  constructor({
    authToken = "",
    owner = "",
    repo = "",
    defaultCommitter = {
      name: "Default Committer",
      email: "default@example.com",
    },
    encryptionKey = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  }) {
    this.octokit = new Octokit({ auth: authToken });
    this.owner = owner;
    this.repo = repo;
    this.committer = defaultCommitter;
    this.encryptionKey = encryptionKey;
  }

  // Encrypt function
  async encrypt(content = "") {
    const salt = crypto.randomBytes(16); // Generate a new random salt for each encryption
    const key = await crypto.scryptSync(this.encryptionKey, salt, 32); // Use scrypt to derive a key
    const iv = crypto.randomBytes(12); // AES-GCM uses a 12-byte IV

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(content, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const tag = cipher.getAuthTag(); // Authentication tag for AES-GCM

    // Return the concatenated result: salt, iv, ciphertext, and tag in hex format
    return `${salt.toString("hex")}:${iv.toString("hex")}:${encrypted.toString(
      "hex"
    )}:${tag.toString("hex")}`;
  }

  // Decrypt function
  async decrypt(content = "") {
    const [saltHex, ivHex, encryptedHex, tagHex] = content.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    // Derive the key using the stored salt
    const key = await crypto.scryptSync(this.encryptionKey, salt, 32);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag); // Set the authentication tag

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  }

  async getFileMetadata(path = "") {
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

  async writeFile(path = "", content = "", message = new Date().toString()) {
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

  async readFile(path = "") {
    const metadata = await this.getFileMetadata(path);
    if (!metadata) throw new Error(`File '${path}' does not exist.`);

    const content = Buffer.from(metadata.content, "base64").toString("utf8");
    return this.decrypt(content);
  }

  async deleteFile(path = "", message = new Date().toString()) {
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

  async deleteDir(path = "", message = new Date().toString()) {
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

  async createDir(path = "", message = "Creating directory") {
    const readmePath = `${path}/.keep`;
    return this.writeFile(readmePath, "#", message);
  }

  async readDir(path = "") {
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

  async exists(path = "") {
    try {
      const metadata = await this.getFileMetadata(path);
      return !!metadata;
    } catch (error) {
      if (error.status === 404) return false;
      throw error;
    }
  }

  async moveFile(srcPath = "", destPath = "", message = "Moving file") {
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content, message);
    await this.deleteFile(srcPath, `Deleted after move: ${message}`);
  }

  async copyFile(srcPath = "", destPath = "", message = "Copying file") {
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content, message);
  }
}

export default GitHubFS;
