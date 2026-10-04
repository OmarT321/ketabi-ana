# Deploys «كتابي أنا» (Kitabi Ana) to production with the Vercel CLI.
# Nothing account-specific is stored here. Provide your own Vercel scope and project:
#   $env:VERCEL_ORG_ID     - your Vercel team or personal account ID
#   $env:VERCEL_PROJECT_ID - the Vercel project whose root directory is apps/qindeel
# Run from the repository root only after tests and the build pass.
$ErrorActionPreference = 'Stop'
$workspacePath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $env:VERCEL_ORG_ID -or -not $env:VERCEL_PROJECT_ID) {
  throw 'Set VERCEL_ORG_ID and VERCEL_PROJECT_ID before deploying.'
}
vercel --cwd $workspacePath deploy --prod --yes
if ($LASTEXITCODE -ne 0) { throw 'Deployment failed.' }
