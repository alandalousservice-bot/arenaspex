# Local disposable PostgreSQL only. Run from D:\arenaspex; never uses .env URLs.
# Replays a schema-generated pre-PO-INS-02 baseline, then the exact target SQL
# through Prisma migrate deploy. It does not replay or alter older migration history.
param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin', [ValidateSet('tests/postgresTeacherTransfer.test.ts', 'tests/postgresInformationCard.test.ts', 'tests/postgresInspectorIntegrity.test.ts', 'tests/postgresPedagogicalVisit.test.ts', 'tests/postgresVisitReport.test.ts', 'tests/postgresWeeklyTimetable.test.ts', 'tests/postgresAuditTrail.test.ts', 'tests/postgresSafeRelease.test.ts')][string]$TestFile = 'tests/postgresTeacherTransfer.test.ts')
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
$gateEnvNames = @('ARENASPEX_POSTGRES_GATE_ROOT', 'ARENASPEX_POSTGRES_GATE_URL', 'DATABASE_URL', 'DIRECT_DATABASE_URL')
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
    if (-not $gateProcess.HasExited -or $gateProcess.ExitCode -ne 0) { throw 'Disposable PostgreSQL startup failed.' }
    $gateIdentity = & (Join-Path $PostgresBin 'psql.exe') -X -h 127.0.0.1 -p $gatePort -U gate_admin -d postgres -v ON_ERROR_STOP=1 -At -c "SELECT current_setting('data_directory');"
    if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($gateIdentity.Trim()) -ne [IO.Path]::GetFullPath($gateData)) { throw 'STOP: cluster directory identity did not match.' }
    & (Join-Path $PostgresBin 'psql.exe') -X -h 127.0.0.1 -p $gatePort -U gate_admin -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $gateDb;"
    if ($LASTEXITCODE -ne 0) { throw 'Disposable DB creation failed.' }
    $gateCreated = $true
    $env:ARENASPEX_POSTGRES_GATE_ROOT = $gateRoot
    $env:ARENASPEX_POSTGRES_GATE_URL = "postgresql://gate_admin@127.0.0.1:${gatePort}/${gateDb}?schema=public&connection_limit=6"
    $env:DATABASE_URL = $env:ARENASPEX_POSTGRES_GATE_URL
    $env:DIRECT_DATABASE_URL = $env:ARENASPEX_POSTGRES_GATE_URL
    & node node_modules/vitest/vitest.mjs run $TestFile --maxWorkers=1 *> (Join-Path $gateRoot 'postgres-tests.log')
    $gateExit = $LASTEXITCODE
    Get-Content -LiteralPath (Join-Path $gateRoot 'postgres-tests.log')
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
