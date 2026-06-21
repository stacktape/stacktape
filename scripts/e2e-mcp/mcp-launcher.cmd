@echo off
setlocal
set "LOGFILE=C:\tmp\mcp-launcher.log"
echo [%date% %time%] launcher started, cwd=%cd% >> "%LOGFILE%"
rem Preserve the caller's cwd so the MCP server can use it for project_scan/cli_plan
rem instead of the repo dir we cd to for module resolution.
set "STACKTAPE_MCP_USER_CWD=%cd%"
cd /d C:\Projects\stacktape
echo [%date% %time%] cd'd to %cd%, STACKTAPE_MCP_USER_CWD=%STACKTAPE_MCP_USER_CWD%, invoking bun >> "%LOGFILE%"
C:\Users\congy\.bun\bin\bun.exe scripts\dev.ts mcp --logLevel error 2>> "%LOGFILE%"
echo [%date% %time%] bun exited with errorlevel=%errorlevel% >> "%LOGFILE%"
exit /b %errorlevel%
