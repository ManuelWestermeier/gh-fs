import { Octokit } from "@octokit/core";

class GitHubFS {
  constructor({
    authToken,
    owner,
    repo,
    defaultCommitter = {
      name: "Default Committer",
      email: "default@example.com",
    },
  }) {
    this.octokit = new Octokit({ auth: authToken });
    this.owner = owner;
    this.repo = repo;
    this.committer = defaultCommitter;
  }

  async createOrUpdateFile(path, content, message) {
    try {
      const base64Content = Buffer.from(content).toString("base64");
      const response = await this.octokit.request(
        "PUT /repos/{owner}/{repo}/contents/{path}",
        {
          owner: this.owner,
          repo: this.repo,
          path,
          message,
          committer: this.committer,
          content: base64Content,
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        }
      );
      console.log(
        "File created or updated successfully:",
        response.data.content.path
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create or update file:", error);
      throw error;
    }
  }

  async getFileContent(path) {
    try {
      const response = await this.octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: this.owner,
          repo: this.repo,
          path,
        }
      );
      const content = Buffer.from(response.data.content, "base64").toString(
        "utf-8"
      );
      console.log("File content retrieved successfully:", content);
      return content;
    } catch (error) {
      console.error("Failed to get file content:", error);
      throw error;
    }
  }

  async deleteFile(path, message, sha) {
    try {
      const response = await this.octokit.request(
        "DELETE /repos/{owner}/{repo}/contents/{path}",
        {
          owner: this.owner,
          repo: this.repo,
          path,
          message,
          sha,
          committer: this.committer,
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        }
      );
      console.log("File deleted successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to delete file:", error);
      throw error;
    }
  }

  async getFileMetadata(path) {
    try {
      const response = await this.octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: this.owner,
          repo: this.repo,
          path,
        }
      );
      console.log("File metadata retrieved successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to retrieve file metadata:", error);
      throw error;
    }
  }
}

export default GitHubFS;
