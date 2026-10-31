# Win32 console calls shared by the Windows-host scripts. A process started from WSL has its own hidden console;
# these attach to another process's console to read its screen or raise Ctrl+C there.
Add-Type -Namespace StacktapeWsl -Name Native -MemberDefinition @'
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool FreeConsole();
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool AttachConsole(uint processId);
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool SetConsoleCtrlHandler(System.IntPtr handler, bool add);
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool GenerateConsoleCtrlEvent(uint ctrlEvent, uint processGroupId);
[DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern System.IntPtr CreateFileW(string name, uint access, uint share, System.IntPtr security, uint creation, uint flags, System.IntPtr template);
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool CloseHandle(System.IntPtr handle);
[StructLayout(LayoutKind.Sequential)] public struct Coord { public short X; public short Y; }
[StructLayout(LayoutKind.Sequential)] public struct SmallRect { public short Left; public short Top; public short Right; public short Bottom; }
[StructLayout(LayoutKind.Sequential)] public struct BufferInfo { public Coord Size; public Coord Cursor; public ushort Attributes; public SmallRect Window; public Coord MaximumWindowSize; }
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool GetConsoleScreenBufferInfo(System.IntPtr output, out BufferInfo info);
[DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern bool ReadConsoleOutputCharacterW(System.IntPtr output, [Out] char[] buffer, uint length, Coord start, out uint read);
'@

function Connect-StacktapeConsole([int]$TargetPid) {
  [void][StacktapeWsl.Native]::FreeConsole()
  if (-not [StacktapeWsl.Native]::AttachConsole([uint32]$TargetPid)) {
    throw "Cannot attach to the console of process ${TargetPid} (Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())). Is it still running?"
  }
}
