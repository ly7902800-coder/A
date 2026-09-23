# Genesis AI Build / Execution Worker

Execution plane for build jobs. It supports a common job API and capability detection for Node, Python, Flutter, Blender, Godot, Unity and Unreal.

POST /v1/builds
{"repo":"owner/repo","branch":"main","target":"node"}

GET /v1/builds/:jobId
GET /v1/capabilities

Set BUILD_WORKER_TOKEN, REDIS_URL and (for private repositories) GITHUB_TOKEN.
Engine-specific runner images should provide Flutter, Blender, Godot, Unity or Unreal binaries; the worker reports missing tools instead of pretending a build succeeded.
