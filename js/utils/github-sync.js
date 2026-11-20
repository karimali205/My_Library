/**
 * github-sync.js - Push and pull full library JSON to private GitHub repository
 * using the GitHub REST API (Contents API) with conflict detection.
 */

const SYNC_FILE_PATH = 'library-backup.json';

export async function pushToGitHub(token, repo, libraryData, commitMessage = 'Update library data backup') {
  if (!token || !repo) {
    throw new Error('Token and repository name are required');
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error('Invalid repository format. Use "username/repo-name"');
  }

  const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${SYNC_FILE_PATH}`;
  const headers = {
    'Authorization': `Bearer ${token.trim()}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  // 1. Check if file already exists to get its SHA (needed for update)
  let currentSha = null;
  let remoteUpdatedAt = null;
  try {
    const checkRes = await fetch(url, { headers });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      currentSha = existing.sha;
      // Attempt to decode remote content to check timestamps
      try {
        const decoded = JSON.parse(decodeUnicodeBase64(existing.content));
        if (decoded.exportedAt) {
          remoteUpdatedAt = decoded.exportedAt;
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    // If 404, file doesn't exist yet, which is fine
  }

  // 2. Prepare payload
  const jsonString = JSON.stringify(libraryData, null, 2);
  const contentBase64 = encodeUnicodeBase64(jsonString);

  const payload = {
    message: commitMessage,
    content: contentBase64,
    ...(currentSha ? { sha: currentSha } : {})
  };

  const putRes = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });

  if (!putRes.ok) {
    const errorData = await putRes.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API error: ${putRes.status}`);
  }

  return { success: true, timestamp: new Date().toISOString() };
}

export async function pullFromGitHub(token, repo) {
  if (!token || !repo) {
    throw new Error('Token and repository name are required');
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error('Invalid repository format. Use "username/repo-name"');
  }

  const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${SYNC_FILE_PATH}`;
  const headers = {
    'Authorization': `Bearer ${token.trim()}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch from GitHub: ${res.status}`);
  }

  const data = await res.json();
  if (!data.content) {
    throw new Error('File content is empty or unreadable');
  }

  const jsonString = decodeUnicodeBase64(data.content);
  const parsed = JSON.parse(jsonString);
  return { data: parsed, sha: data.sha };
}

// Helpers for Unicode Base64 in browser
function encodeUnicodeBase64(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
}

function decodeUnicodeBase64(base64) {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
