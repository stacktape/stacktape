#!/usr/bin/env pwsh
# Installs the Stacktape CLI on Windows, into ~\.stacktape\bin.
#
#   irm https://installs.stacktape.com/windows.ps1 | iex                    install
#   iex "& { $(irm https://installs.stacktape.com/windows.ps1) } init"     install, then start `stacktape init`
#
# Both published names (windows.ps1, windows-arm.ps1) serve this script, and each installs the build for the machine it
# runs on.
#
# Environment:
#   STACKTAPE_VERSION=<version>   install this release instead of <<DEFAULT_VERSION>>
#   STACKTAPE_NO_MODIFY_PATH=1    leave the user PATH and the PowerShell profile alone
#   NO_COLOR=1                    print without colors
#
# The source is ASCII only: Windows PowerShell 5.1 may decode a downloaded script with the wrong encoding, so the logo
# and progress characters are built from code points. Everything runs in Install-Stacktape, called on the last line: a
# download cut short installs nothing, and `irm | iex` leaves no variables or preferences in the caller's session.

function Install-Stacktape {
    $ErrorActionPreference = 'Stop'
    # Arguments after the installer's own run the installed CLI.
    $CliArgs = $args

    # Colors only for a terminal that supports them. Logs from CI and coding agents stay plain.
    $Interactive = -not [Console]::IsOutputRedirected -and $Host.Name -eq 'ConsoleHost'
    $Escape = [char]27
    if ($Interactive -and $Host.UI.SupportsVirtualTerminal -and -not $env:NO_COLOR) {
        $Muted = "$Escape[2m"
        $Brand = "$Escape[38;5;73m"
        $Reset = "$Escape[0m"
    } else {
        $Muted = ''
        $Brand = ''
        $Reset = ''
    }

    $Version = if ($env:STACKTAPE_VERSION) { $env:STACKTAPE_VERSION } else { '<<DEFAULT_VERSION>>' }
    $BinDirPath = "$Home\.stacktape\bin"
    $DisplayBinDirPath = '~\.stacktape\bin'
    $ExecutableFilePath = "$BinDirPath\stacktape.exe"
    $AltExecutableFilePath = "$BinDirPath\stp.exe"
    $CompletionsFilePath = "$BinDirPath\completions\powershell.ps1"
    $ReleasesUrl = 'https://github.com/stacktape/stacktape/releases'

    # Install the build this machine's processor runs, whichever published name was downloaded. The registry names the
    # operating system's architecture even when this PowerShell is an x64 process under ARM64 emulation.
    $MachineArchitecture = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment').PROCESSOR_ARCHITECTURE
    if ($MachineArchitecture -eq 'ARM64') {
        $ArchiveName = 'windows-arm.zip'
        $PlatformName = 'Windows ARM64'
    } else {
        $ArchiveName = 'windows.zip'
        $PlatformName = 'Windows x64'
    }

    # SHA256SUMS is required after 3.7.1, the last release published without it, so pinned v3 releases stay installable.
    # The installer fetches both files from GitHub Releases, so this is an integrity check, not independent authenticity.
    $CoreVersion = (($Version -replace '^[vV]', '') -split '[-+]')[0]
    $ParsedVersion = $null
    $ChecksumRequired = $true
    if ([version]::TryParse($CoreVersion, [ref]$ParsedVersion)) {
        $ChecksumRequired = $ParsedVersion -ge [version]'3.7.2'
    }

    # Windows PowerShell 5.1 on an older Windows may not offer TLS 1.2, which GitHub requires.
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

    # The progress line redraws on a timer, ten times a second at most. Invoke-WebRequest's own progress display redraws
    # for every received block and makes a large download several times slower in Windows PowerShell 5.1.
    function Save-Download([string]$Url, [string]$Path) {
        if (-not $Interactive) {
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest $Url -OutFile $Path -UseBasicParsing
            return
        }
        $BarWidth = [Math]::Max(10, [Math]::Min(50, $Host.UI.RawUI.WindowSize.Width - 6))
        $Filled = [string][char]0x25A0
        $Empty = [string][char]0x00B7
        $Response = [Net.WebRequest]::Create($Url).GetResponse()
        try {
            $Total = $Response.ContentLength
            $Source = $Response.GetResponseStream()
            $Target = [IO.File]::Create($Path)
            try {
                $Buffer = New-Object byte[] 262144
                $Done = 0
                $Clock = [Diagnostics.Stopwatch]::StartNew()
                $Redraw = $true
                while ($true) {
                    $Read = $Source.Read($Buffer, 0, $Buffer.Length)
                    if ($Read -gt 0) {
                        $Target.Write($Buffer, 0, $Read)
                        $Done += $Read
                    }
                    if ($Redraw -or $Read -eq 0 -or $Clock.ElapsedMilliseconds -ge 100) {
                        $Percent = if ($Total -gt 0) { [Math]::Min(100, [int][Math]::Floor($Done * 100 / $Total)) } else { 0 }
                        $Cells = [int][Math]::Floor($Percent * $BarWidth / 100)
                        $Bar = ($Filled * $Cells) + ($Empty * ($BarWidth - $Cells))
                        Write-Host -NoNewline ("`r$Brand$Bar$Reset {0,3}%" -f $Percent)
                        $Clock.Restart()
                        $Redraw = $false
                    }
                    if ($Read -eq 0) { break }
                }
            } finally {
                $Target.Dispose()
                $Source.Dispose()
            }
        } finally {
            $Response.Dispose()
            Write-Host ''
        }
    }

    # A running stacktape.exe cannot be deleted or overwritten, but it can be renamed. The name is unique because an
    # earlier renamed copy may still be running too.
    function Remove-Installed([string]$Path) {
        try {
            Remove-Item $Path -Recurse -Force
        } catch {
            Move-Item $Path "$Path.$([guid]::NewGuid().ToString('N')).old"
        }
    }

    if (!(Test-Path $BinDirPath)) {
        New-Item $BinDirPath -ItemType Directory | Out-Null
    }
    # What an earlier update renamed while it was running.
    Get-ChildItem $BinDirPath -Filter '*.old' -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    $Updating = Test-Path $ExecutableFilePath
    Write-Host ''
    if ($Updating) {
        Write-Host "${Muted}Updating ${Reset}stacktape${Muted} to ${Reset}$Version"
    } else {
        Write-Host "${Muted}Installing ${Reset}stacktape $Version${Muted} for $PlatformName${Reset}"
    }

    $WorkPath = Join-Path (Split-Path $BinDirPath) ".install.$([guid]::NewGuid().ToString('N'))"
    New-Item $WorkPath -ItemType Directory | Out-Null
    try {
        $ZipFilePath = Join-Path $WorkPath $ArchiveName
        try {
            Save-Download "$ReleasesUrl/download/$Version/$ArchiveName" $ZipFilePath
        } catch {
            throw "Could not download Stacktape $Version for $PlatformName. Check that the release exists: $ReleasesUrl/tag/$Version ($($_.Exception.Message))"
        }

        if ($ChecksumRequired) {
            $ChecksumsFilePath = Join-Path $WorkPath 'SHA256SUMS'
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest "$ReleasesUrl/download/$Version/SHA256SUMS" -OutFile $ChecksumsFilePath -UseBasicParsing
            $ChecksumEntry = @(Get-Content $ChecksumsFilePath | Where-Object {
                $_ -match "^([a-fA-F0-9]{64})\s{2}$([regex]::Escape($ArchiveName))$"
            })
            if ($ChecksumEntry.Count -ne 1) {
                throw "Missing or duplicate checksum for $ArchiveName. Nothing was installed."
            }
            $ExpectedChecksum = $ChecksumEntry[0].Substring(0, 64)
            $ActualChecksum = (Get-FileHash -Path $ZipFilePath -Algorithm SHA256).Hash
            if ($ActualChecksum -ne $ExpectedChecksum) {
                throw "Checksum verification failed for $ArchiveName. Nothing was installed."
            }
        }

        # A release archive is a complete installation snapshot. It is unpacked beside the installation first, so a
        # broken download changes nothing. Then each of its top-level entries replaces the installed one.
        # ZipFile rather than Expand-Archive, which draws its own progress display for every file and is much slower.
        $StagingPath = Join-Path $WorkPath 'staging'
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [IO.Compression.ZipFile]::ExtractToDirectory($ZipFilePath, $StagingPath)
        if (!(Test-Path (Join-Path $StagingPath 'stacktape.exe'))) {
            throw "$ArchiveName does not contain stacktape.exe. Nothing was installed."
        }

        # Payloads that earlier releases bundled and newer ones omit: stale MCP documentation, an obsolete production
        # source map, and the pack and nixpacks binaries (the CLI downloads its tools on first use).
        foreach ($StaleName in @('llm-docs', 'ai-docs', 'compiled-cli.js.map', 'pack', 'nixpacks', 'stacktape.zip')) {
            if (Test-Path "$BinDirPath\$StaleName") {
                Remove-Installed "$BinDirPath\$StaleName"
            }
        }
        foreach ($Entry in Get-ChildItem $StagingPath -Force) {
            $TargetPath = Join-Path $BinDirPath $Entry.Name
            if (Test-Path $TargetPath) {
                Remove-Installed $TargetPath
            }
            Move-Item $Entry.FullName $TargetPath
        }
    } finally {
        Remove-Item $WorkPath -Recurse -Force -ErrorAction SilentlyContinue
    }

    # The stp alias. A hard link needs neither administrator rights nor Developer Mode.
    if (Test-Path $AltExecutableFilePath) {
        Remove-Installed $AltExecutableFilePath
    }
    try {
        New-Item -ItemType HardLink -Path $AltExecutableFilePath -Value (Get-Item $ExecutableFilePath).FullName | Out-Null
    } catch {
        # A drive without hard links (FAT32, exFAT) gets no alias.
    }

    $PathAdded = $false
    if (-not $env:STACKTAPE_NO_MODIFY_PATH) {
        $User = [EnvironmentVariableTarget]::User
        $Path = [Environment]::GetEnvironmentVariable('Path', $User)
        if (!(";$Path;".ToLower() -like "*;$BinDirPath;*".ToLower())) {
            [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDirPath", $User)
            Write-Host "${Muted}Added ${Reset}$DisplayBinDirPath${Muted} to PATH${Reset}"
            $PathAdded = $true
        }

        # Completions load from the PowerShell profile, which a Restricted or AllSigned execution policy (the Windows
        # default is Restricted) would refuse to run, reporting an error in every new window. The policy of new windows
        # counts, not a Bypass for this session only.
        $ExecutionPolicy = if ($IsWindows -or $PSVersionTable.PSEdition -eq 'Desktop') { 'Restricted' } else { 'Unrestricted' }
        foreach ($Scope in @('MachinePolicy', 'UserPolicy', 'CurrentUser', 'LocalMachine')) {
            $ScopePolicy = [string](Get-ExecutionPolicy -Scope $Scope)
            if ($ScopePolicy -ne 'Undefined') {
                $ExecutionPolicy = $ScopePolicy
                break
            }
        }
        if ((Test-Path $CompletionsFilePath) -and $ExecutionPolicy -notin @('Restricted', 'AllSigned')) {
            $ProfileContent = if (Test-Path $profile) { Get-Content -Path $profile -Raw } else { '' }
            if ($ProfileContent -notmatch 'Stacktape completion script') {
                if (!(Test-Path $profile)) {
                    New-Item -Path $profile -Type File -Force | Out-Null
                }
                $QuotedPath = $CompletionsFilePath.Replace("'", "''")
                Add-Content -Path $profile -Value "`n# Stacktape completion script`nif (Test-Path '$QuotedPath') { . '$QuotedPath' }"
            }
        }
    }
    # This session finds the CLI too. Under iex, that is the person's own PowerShell window.
    if (!(";$env:Path;".ToLower() -like "*;$BinDirPath;*".ToLower())) {
        $env:Path += ";$BinDirPath"
    }

    if ($env:GITHUB_ACTIONS -eq 'true' -and $env:GITHUB_PATH) {
        Add-Content -Path $env:GITHUB_PATH -Value $BinDirPath
        Write-Host "${Muted}Added ${Reset}$BinDirPath${Muted} to GITHUB_PATH${Reset}"
    }

    if ($Interactive) {
        $Glyphs = @{ '#' = [char]0x2588; '^' = [char]0x2580; '_' = [char]0x2584; ':' = [char]0x2591; ' ' = ' ' }
        $Logo = @(
            @('     _             _    ', '_'),
            @('#^^^ #^^ ^^^# #^^^ # _^ ', '#^^ ^^^# #^^# #^^#'),
            @('^^^# #:: #^^# #::: #^_  ', '#:: #^^# #::# #^^^'),
            @('^^^^ ^^^ ^^^^ ^^^^ ^  ^ ', '^^^ ^^^^ #^^^ ^^^^')
        )
        Write-Host ''
        foreach ($Row in $Logo) {
            $Stack = -join ($Row[0].ToCharArray() | ForEach-Object { $Glyphs[[string]$_] })
            $Tape = -join ($Row[1].ToCharArray() | ForEach-Object { $Glyphs[[string]$_] })
            Write-Host "$Muted$Stack$Reset$Tape"
        }
        Write-Host ''
    } else {
        Write-Host "Installed stacktape $Version in $BinDirPath"
    }

    # A new PATH entry reaches only new windows, and the current one when run through iex.
    $NewTerminalNeeded = $PathAdded -and $PSCommandPath
    if ($CliArgs.Count -gt 0) {
        Write-Host "${Muted}Starting ${Reset}stacktape $($CliArgs -join ' ')"
        if ($NewTerminalNeeded) {
            Write-Host "${Muted}Afterwards, open a new terminal to use stacktape.${Reset}"
        }
        Write-Host ''
        # Run by full path: a session that already had another stacktape on PATH would otherwise start that one.
        & $ExecutableFilePath @CliArgs
        # Run as a file (powershell -File windows.ps1 init), report the CLI's exit code. Under iex there is no script
        # path, and exit would close the user's PowerShell window.
        if ($PSCommandPath -and $LASTEXITCODE) {
            exit $LASTEXITCODE
        }
    } elseif ($Updating) {
        Write-Host "${Muted}Release notes: ${Reset}$ReleasesUrl/tag/$Version"
        Write-Host ''
    } else {
        Write-Host "${Muted}To get started:${Reset}"
        Write-Host ''
        if ($NewTerminalNeeded) {
            Write-Host "${Muted}Open a new terminal, then:${Reset}"
        }
        Write-Host "cd <project>     ${Muted}# Open your project${Reset}"
        Write-Host "stacktape init   ${Muted}# Set it up to deploy to your AWS account${Reset}"
        Write-Host ''
        Write-Host "${Muted}For more information visit ${Reset}https://docs.stacktape.com"
        Write-Host ''
    }
}

Install-Stacktape @args
