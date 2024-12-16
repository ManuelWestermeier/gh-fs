import { Octokit } from "@octokit/core";
import crypto from "crypto";

interface Committer {
  name: string;
  email: string;
}

class GitHubFS {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private committer: Committer;
  private encryptionKey: string;

  constructor({
    authToken = "",
    owner = "",
    repo = "",
    defaultCommitter = {
      name: "Default Committer",
      email: "default@example.com",
    },
    encryptionKey = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  }: {
    authToken?: string;
    owner: string;
    repo: string;
    defaultCommitter?: Committer;
    encryptionKey?: string;
  }) {
    this.octokit = new Octokit({ auth: authToken });
    this.owner = owner;
    this.repo = repo;
    this.committer = defaultCommitter;
    this.encryptionKey = encryptionKey;
  }

  private encrypt(content: string = ""): string {
    const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(content, "utf8"),
      cipher.final(),
    ]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }

  private decrypt(content: string = ""): string {
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

  private async getFileMetadata(path: string = ""): Promise<any | null> {
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
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  public async writeFile(
    path: string = "",
    content: string = "",
    message: string = new Date().toString()
  ): Promise<any> {
    let sha: string | undefined;
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

  public async readFile(path: string = ""): Promise<string> {
    const metadata = await this.getFileMetadata(path);
    if (!metadata) throw new Error(`File '${path}' does not exist.`);

    const content = Buffer.from(metadata.content, "base64").toString("utf8");
    return this.decrypt(content);
  }

  public async deleteFile(
    path: string = "",
    message: string = new Date().toString()
  ): Promise<any> {
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

  public async deleteDir(
    path: string = "",
    message: string = new Date().toString()
  ): Promise<{ message: string }> {
    const files = await this.readDir(path);

    if (!files || files.length === 0)
      throw new Error(`Directory '${path}' is empty or does not exist.`);

    for (const file of files) {
      const filePath = `${path}/${file.name}`;
      if (await this.exists(`${filePath}/.keep`)) {
        await this.deleteDir(filePath, message);
      } else {
        await this.deleteFile(filePath, message);
      }
    }

    return {
      message: `Deleted all files and directory placeholder at '${path}'`,
    };
  }

  public async createDir(
    path: string = "",
    message: string = "Creating directory"
  ): Promise<any> {
    const readmePath = `${path}/.keep`;
    return this.writeFile(readmePath, "#", message);
  }

  public async readDir(
    path: string = ""
  ): Promise<{ name: string; path: string; type: string }[] | null> {
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

      return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
      }));
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  public async exists(path: string = ""): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(path);
      return !!metadata;
    } catch (error: any) {
      if (error.status === 404) return false;
      throw error;
    }
  }

  public async moveFile(
    srcPath: string = "",
    destPath: string = "",
    message: string = "Moving file"
  ): Promise<void> {
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content, message);
    await this.deleteFile(srcPath, `Deleted after move: ${message}`);
  }

  public async copyFile(
    srcPath: string = "",
    destPath: string = "",
    message: string = "Copying file"
  ): Promise<void> {
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content, message);
  }
}

export default GitHubFS;