export interface ServerReadmeResult {
  content: string;
  fileName: string;
  branch: string;
  baseDir: string;
  htmlUrl: string;
}

export function fetchReadmeServer(owner: string, repo: string): Promise<ServerReadmeResult>;
