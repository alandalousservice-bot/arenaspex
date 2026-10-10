# Local disposable PostgreSQL only. Run from D:\arenaspex; never uses .env URLs.
# Replays a schema-generated pre-PO-INS-02 baseline, then the exact target SQL
# through Prisma migrate deploy. It does not replay or alter older migration history.
param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin', [ValidateSet('tests/postgresTeacherTransfer.test.ts', 'tests/postgresInformationCard.test.ts', 'tests/postgresInspectorIntegrity.test.ts', 'tests/postgresPedagogicalVisit.test.ts', 'tests/postgresVisitReport.test.ts', 'tests/postgresWeeklyTimetable.test.ts', 'tests/postgresAuditTrail.test.ts', 'tests/postgresSafeRelease.test.ts', 'tests/postgresTransactionConflict.test.ts', 'tests/postgresSecureRegistration.test.ts')][string]$TestFile = 'tests/postgresTeacherTransfer.test.ts')
$ErrorActionPreference = 'Stop'
$gateRepo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if ((Get-Location).Path -ne $gateRepo) { throw 'Run this script from the repository root.' }
$gatePort = 55482
$gateDb = 'arenaspex_po_ins_02_disposable'
if (Get-NetTCPConnection -State Listen -LocalPort $gatePort -ErrorAction SilentlyContinue) {
    throw 'STOP: dedicated disposable port is already occupied.'
}
foreach ($gateBinary in @('initdb.exe', 'pg_ctl.exe', 'psql.exe')) {
    if (-not (Test-Path -LiteralPath (Join-Path $PostgresBin $gateBinary))) { throw "Missing local PostgreSQL binary: $gateBinary" }
}
$gateRoot = Join-Path $gateRepo ('node_modules\.cache\arenaspex-postgres-gate-' + [guid]::NewGuid().ToString('N'))
$gateData = Join-Path $gateRoot 'data'
New-Item -ItemType Directory -Path $gateRoot | Out-Null
$gateEnvNames = @('ARENASPEX_POSTGRES_GATE_ROOT', 'ARENASPEX_POSTGRES_GATE_URL', 'ARENASPEX_POSTGRES_GATE_MIGRATED', 'ARENASPEX_PRISMA_EXIT_FILE', 'DATABASE_URL', 'DIRECT_DATABASE_URL')
$gateSavedEnv = @{}
foreach ($gateEnvName in $gateEnvNames) { $gateSavedEnv[$gateEnvName] = [Environment]::GetEnvironmentVariable($gateEnvName, 'Process') }
$gateStarted = $false
$gateCreated = $false
$gateExit = 1
try {
    & (Join-Path $PostgresBin 'initdb.exe') -D $gateData -U gate_admin -A trust --encoding=UTF8 --locale=C > (Join-Path $gateRoot 'initdb.log')
    if ($LASTEXITCODE -ne 0) { throw 'Disposable initdb failed.' }
    $gateProcess = Start-Process -FilePath (Join-Path $PostgresBin 'pg_ctl.exe') -ArgumentList @('-D',$gateData,'-l',(Join-Path $gateRoot 'postgres.log'),'-o',('"-h 127.0.0.1 -p ' + $gatePort + '"'),'-w','start') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $gateRoot 'start.log') -RedirectStandardError (Join-Path $gateRoot 'start-error.log')
    $gateStarted = $true
    $gateProcess.WaitForExit(15000) | Out-Null
    # The directory-identity query below is authoritative; Windows PowerShell
    # can report a null ExitCode for a successfully exited pg_ctl process.
    if (-not $gateProcess.HasExited) { throw 'Disposable PostgreSQL startup timed out.' }
    $gateIdentity = & (Join-Path $PostgresBin 'psql.exe') -X -h 127.0.0.1 -p $gatePort -U gate_admin -d postgres -v ON_ERROR_STOP=1 -At -c "SELECT current_setting('data_directory');"
    if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($gateIdentity.Trim()) -ne [IO.Path]::GetFullPath($gateData)) { throw 'STOP: cluster directory identity did not match.' }
    & (Join-Path $PostgresBin 'psql.exe') -X -h 127.0.0.1 -p $gatePort -U gate_admin -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $gateDb;"
    if ($LASTEXITCODE -ne 0) { throw 'Disposable DB creation failed.' }
    $gateCreated = $true
    $env:ARENASPEX_POSTGRES_GATE_ROOT = $gateRoot
    $env:ARENASPEX_POSTGRES_GATE_URL = "postgresql://gate_admin@127.0.0.1:${gatePort}/${gateDb}?schema=public&connection_limit=6"
    $env:DATABASE_URL = $env:ARENASPEX_POSTGRES_GATE_URL
    $env:DIRECT_DATABASE_URL = $env:ARENASPEX_POSTGRES_GATE_URL

    # Run Prisma outside Vitest. On Windows, execFileSync timing out while the
    # Prisma CLI owns a schema-engine child can leave the test worker waiting on
    # inherited pipes long after its configured timeout.
    $gateNodeExe = (Get-Command node -ErrorAction Stop).Source
    $nodeRunner = Join-Path $gateRoot 'run-node.cjs'
    Set-Content -LiteralPath $nodeRunner -Encoding Ascii -Value 'const { spawnSync } = require("node:child_process"); const fs = require("node:fs"); const path = require("node:path"); const cli = path.resolve(process.argv[2]); const result = spawnSync(process.execPath, [cli, ...process.argv.slice(3)], { stdio: "inherit", env: process.env }); if (result.error) console.error(result.error); const code = result.error ? 1 : (result.status ?? 1); fs.writeFileSync(process.env.ARENASPEX_PRISMA_EXIT_FILE, String(code)); process.exit(code);'
    $deployStdout = Join-Path $gateRoot 'migrate-deploy.stdout.log'
    $deployStderr = Join-Path $gateRoot 'migrate-deploy.stderr.log'
    $deployExitFile = Join-Path $gateRoot 'migrate-deploy.exitcode'
    $env:ARENASPEX_PRISMA_EXIT_FILE = $deployExitFile
    $deployProcess = Start-Process -FilePath $gateNodeExe -ArgumentList @($nodeRunner, 'node_modules/prisma/build/index.js', 'migrate', 'deploy') -WorkingDirectory $gateRepo -WindowStyle Hidden -PassThru -RedirectStandardOutput $deployStdout -RedirectStandardError $deployStderr
    if (-not $deployProcess.WaitForExit(90000)) {
        & taskkill.exe /PID $deployProcess.Id /T /F | Out-Null
        throw 'Prisma migrate deploy exceeded the 90-second isolated-gate limit.'
    }
    $deployProcess.WaitForExit()
    $deployProcess.Refresh()
    Get-Content -LiteralPath $deployStdout
    Get-Content -LiteralPath $deployStderr
    $deployExitCode = if (Test-Path -LiteralPath $deployExitFile) { [int](Get-Content -LiteralPath $deployExitFile -Raw) } else { 1 }
    Remove-Item Env:\ARENASPEX_PRISMA_EXIT_FILE
    if ($deployExitCode -ne 0) { throw "Prisma migrate deploy failed with exit code $deployExitCode." }

    $statusStdout = Join-Path $gateRoot 'migrate-status.stdout.log'
    $statusStderr = Join-Path $gateRoot 'migrate-status.stderr.log'
    $statusExitFile = Join-Path $gateRoot 'migrate-status.exitcode'
    $env:ARENASPEX_PRISMA_EXIT_FILE = $statusExitFile
    $statusProcess = Start-Process -FilePath $gateNodeExe -ArgumentList @($nodeRunner, 'node_modules/prisma/build/index.js', 'migrate', 'status') -WorkingDirectory $gateRepo -WindowStyle Hidden -PassThru -RedirectStandardOutput $statusStdout -RedirectStandardError $statusStderr
    if (-not $statusProcess.WaitForExit(30000)) {
        & taskkill.exe /PID $statusProcess.Id /T /F | Out-Null
        throw 'Prisma migrate status exceeded the 30-second isolated-gate limit.'
    }
    $statusProcess.WaitForExit()
    $statusProcess.Refresh()
    Get-Content -LiteralPath $statusStdout
    Get-Content -LiteralPath $statusStderr
    $statusExitCode = if (Test-Path -LiteralPath $statusExitFile) { [int](Get-Content -LiteralPath $statusExitFile -Raw) } else { 1 }
    Remove-Item Env:\ARENASPEX_PRISMA_EXIT_FILE
    if ($statusExitCode -ne 0 -or (Get-Content -LiteralPath $statusStdout -Raw) -notmatch 'Database schema is up to date') {
        throw 'Prisma migrate status did not confirm that the disposable database is up to date.'
    }
    $env:ARENASPEX_POSTGRES_GATE_MIGRATED = '1'

    $testStdout = Join-Path $gateRoot 'postgres-tests.stdout.log'
    $testStderr = Join-Path $gateRoot 'postgres-tests.stderr.log'
    $testExitFile = Join-Path $gateRoot 'postgres-tests.exitcode'
    $env:ARENASPEX_PRISMA_EXIT_FILE = $testExitFile
    $testProcess = Start-Process -FilePath $gateNodeExe -ArgumentList @($nodeRunner, 'node_modules/vitest/vitest.mjs', 'run', $TestFile, '--maxWorkers=1') -WorkingDirectory $gateRepo -WindowStyle Hidden -PassThru -RedirectStandardOutput $testStdout -RedirectStandardError $testStderr
    if (-not $testProcess.WaitForExit(180000)) {
        & taskkill.exe /PID $testProcess.Id /T /F | Out-Null
        throw 'PostgreSQL integration tests exceeded the 180-second isolated-gate limit.'
    }
    $testProcess.Refresh()
    Get-Content -LiteralPath $testStdout
    Get-Content -LiteralPath $testStderr
    $gateExit = if (Test-Path -LiteralPath $testExitFile) { [int](Get-Content -LiteralPath $testExitFile -Raw) } else { 1 }
} finally {
    if ($gateCreated) {
        # Fixed database name on the freshly created, directory-verified cluster.
        & (Join-Path $PostgresBin 'psql.exe') -X -h 127.0.0.1 -p $gatePort -U gate_admin -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE $gateDb WITH (FORCE);" > (Join-Path $gateRoot 'cleanup-db.log')
        if ($LASTEXITCODE -ne 0) { $gateExit = 1; Write-Warning 'Disposable database cleanup failed; inspect cleanup-db.log.' }
    }
    if ($gateStarted) {
        & (Join-Path $PostgresBin 'pg_ctl.exe') -D $gateData -m fast -w stop > (Join-Path $gateRoot 'cleanup-cluster.log')
        if ($LASTEXITCODE -ne 0) { $gateExit = 1; Write-Warning 'Disposable cluster shutdown failed; inspect cleanup-cluster.log.' }
    }
    foreach ($gateEnvName in $gateEnvNames) { [Environment]::SetEnvironmentVariable($gateEnvName, $gateSavedEnv[$gateEnvName], 'Process') }
    Write-Output "GATE_EVIDENCE_DIRECTORY=$gateRoot"
    Write-Output "GATE_TEST_EXIT_CODE=$gateExit"
}
exit $gateExit
