// Windows-side process host for windows-host.ts, compiled at runtime by host.ps1 (Add-Type). It starts one program in
// one of three ways and reports its PID and creation time, so the helper can later stop exactly the processes it
// started:
// - Exec: the program inherits this process's standard handles (pipes from WSL) and its hidden console;
// - Pty: the program runs in a pseudo console (ConPTY) with no window; its output goes to a file and input is read
//   from files dropped into a directory;
// - Window: the program runs in a classic console window on a separate desktop, so the window is real (closing it
//   sends CTRL_CLOSE_EVENT) but never appears on, or takes focus from, the user's desktop.
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace StacktapeWsl
{
    public static class Host
    {
        const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
        const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
        const int STARTF_USESHOWWINDOW = 0x00000001;
        const int STARTF_USESTDHANDLES = 0x00000100;
        const short SW_SHOWMINNOACTIVE = 7;
        static readonly IntPtr PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE = (IntPtr)0x00020016;

        [StructLayout(LayoutKind.Sequential)]
        struct Coord { public short X; public short Y; }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        struct StartupInfo
        {
            public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
            public int dwX; public int dwY; public int dwXSize; public int dwYSize;
            public int dwXCountChars; public int dwYCountChars; public int dwFillAttribute; public int dwFlags;
            public short wShowWindow; public short cbReserved2; public IntPtr lpReserved2;
            public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct StartupInfoEx { public StartupInfo StartupInfo; public IntPtr lpAttributeList; }

        [StructLayout(LayoutKind.Sequential)]
        struct ProcessInformation { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }

        [StructLayout(LayoutKind.Sequential)]
        struct FileTime { public uint Low; public uint High; }

        delegate bool ConsoleCtrlHandler(uint ctrlType);

        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool CreatePipe(out SafeFileHandle read, out SafeFileHandle write, IntPtr attributes, int size);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern int CreatePseudoConsole(Coord size, SafeFileHandle input, SafeFileHandle output, uint flags, out IntPtr console);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern void ClosePseudoConsole(IntPtr console);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute, IntPtr value, IntPtr size, IntPtr previous, IntPtr returnSize);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern void DeleteProcThreadAttributeList(IntPtr list);
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode, EntryPoint = "CreateProcessW")]
        static extern bool CreateProcessEx(string application, StringBuilder commandLine, IntPtr processAttributes, IntPtr threadAttributes,
            bool inheritHandles, uint flags, IntPtr environment, string currentDirectory, ref StartupInfoEx startupInfo, out ProcessInformation information);
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode, EntryPoint = "CreateProcessW")]
        static extern bool CreateProcessPlain(string application, StringBuilder commandLine, IntPtr processAttributes, IntPtr threadAttributes,
            bool inheritHandles, uint flags, IntPtr environment, string currentDirectory, ref StartupInfo startupInfo, out ProcessInformation information);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool GetProcessTimes(IntPtr process, out FileTime creation, out FileTime exit, out FileTime kernel, out FileTime user);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool CloseHandle(IntPtr handle);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool SetConsoleCtrlHandler(ConsoleCtrlHandler handler, bool add);

        delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);
        const uint DESKTOP_ALL_ACCESS = 0x01FF;
        const uint WM_CLOSE = 0x0010;
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern IntPtr CreateDesktopW(string name, IntPtr device, IntPtr mode, uint flags, uint access, IntPtr attributes);
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern IntPtr OpenDesktopW(string name, uint flags, bool inherit, uint access);
        [DllImport("user32.dll", SetLastError = true)]
        static extern bool CloseDesktop(IntPtr desktop);
        [DllImport("user32.dll", SetLastError = true)]
        static extern bool EnumDesktopWindows(IntPtr desktop, EnumWindowsProc callback, IntPtr parameter);
        [DllImport("user32.dll", SetLastError = true)]
        static extern int GetWindowThreadProcessId(IntPtr window, out int processId);
        [DllImport("user32.dll", SetLastError = true)]
        static extern bool PostMessageW(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);

        // Open while the window's program runs: a desktop disappears with its last handle.
        static IntPtr hiddenDesktop;

        // Kept in a field so the garbage collector does not free the delegate while Windows can still call it.
        static ConsoleCtrlHandler keepAlive;

        /// <summary>
        /// Ctrl+C and Ctrl+Break reach every process in a console. This host waits for its program and reports the
        /// exit code, so it ignores both; unlike SetConsoleCtrlHandler(NULL, TRUE), a handler is not inherited.
        /// </summary>
        public static void IgnoreCtrlC()
        {
            keepAlive = ctrlType => ctrlType <= 1;
            SetConsoleCtrlHandler(keepAlive, true);
        }

        static string CreationTime(IntPtr process)
        {
            FileTime creation, exit, kernel, user;
            GetProcessTimes(process, out creation, out exit, out kernel, out user);
            long ticks = ((long)creation.High << 32) | creation.Low;
            return DateTime.FromFileTimeUtc(ticks).ToString("o");
        }

        static string Json(string value) { return value.Replace("\\", "\\\\").Replace("\"", "\\\""); }

        /// <summary>Appends the started process to the task's process record; windows-host.ts stops only these trees.</summary>
        static void Record(string recordFile, ProcessInformation information, string mode, string program)
        {
            string line = "{\"pid\":" + information.dwProcessId + ",\"created\":\"" + CreationTime(information.hProcess) +
                "\",\"mode\":\"" + mode + "\",\"program\":\"" + Json(program) + "\"}\n";
            File.AppendAllText(recordFile, line);
        }

        static void WriteState(string stateFile, string json)
        {
            if (string.IsNullOrEmpty(stateFile)) return;
            string temporary = stateFile + ".tmp";
            File.WriteAllText(temporary, json);
            File.Move(temporary, stateFile, true);
        }

        static int WaitForExit(ProcessInformation information)
        {
            WaitForSingleObject(information.hProcess, 0xFFFFFFFF);
            uint exitCode;
            GetExitCodeProcess(information.hProcess, out exitCode);
            return unchecked((int)exitCode);
        }

        static Exception Failure(string what)
        {
            return new InvalidOperationException(what + " failed (Win32 error " + Marshal.GetLastWin32Error() + ").");
        }

        public static int Exec(string commandLine, string workingDirectory, string recordFile, string program)
        {
            var startupInfo = new StartupInfo();
            startupInfo.cb = Marshal.SizeOf(typeof(StartupInfo));
            ProcessInformation information;
            if (!CreateProcessPlain(null, new StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, true,
                    CREATE_UNICODE_ENVIRONMENT, IntPtr.Zero, workingDirectory, ref startupInfo, out information))
                throw Failure("CreateProcess");
            Record(recordFile, information, "exec", program);
            int exitCode = WaitForExit(information);
            CloseHandle(information.hThread);
            CloseHandle(information.hProcess);
            return exitCode;
        }

        /// <summary>
        /// Starts conhost.exe with the program in a console window on the desktop <paramref name="desktopName"/>,
        /// created for it in the user's window station; returns conhost's PID. Windows on another desktop are never
        /// shown on the user's screen and cannot take the keyboard focus.
        /// </summary>
        public static int Window(string commandLine, string workingDirectory, string recordFile, string program, string desktopName)
        {
            hiddenDesktop = CreateDesktopW(desktopName, IntPtr.Zero, IntPtr.Zero, 0, DESKTOP_ALL_ACCESS, IntPtr.Zero);
            if (hiddenDesktop == IntPtr.Zero) throw Failure("CreateDesktop");
            var startupInfo = new StartupInfo();
            startupInfo.cb = Marshal.SizeOf(typeof(StartupInfo));
            startupInfo.lpDesktop = "WinSta0\\" + desktopName;
            startupInfo.dwFlags = STARTF_USESHOWWINDOW;
            startupInfo.wShowWindow = SW_SHOWMINNOACTIVE;
            string conhost = Environment.ExpandEnvironmentVariables("%SystemRoot%\\System32\\conhost.exe");
            ProcessInformation information;
            // conhost.exe opens the window itself, so the default terminal (Windows Terminal) never takes it over.
            if (!CreateProcessPlain(conhost, new StringBuilder("\"" + conhost + "\" " + commandLine), IntPtr.Zero, IntPtr.Zero,
                    false, CREATE_UNICODE_ENVIRONMENT, IntPtr.Zero, workingDirectory, ref startupInfo, out information))
                throw Failure("CreateProcess");
            Record(recordFile, information, "window", program);
            CloseHandle(information.hThread);
            CloseHandle(information.hProcess);
            return information.dwProcessId;
        }

        /// <summary>
        /// Posts WM_CLOSE to the console windows of <paramref name="processId"/> on <paramref name="desktopName"/>,
        /// as clicking the window's X does. A console window reports its client program as its owner. Returns how
        /// many windows it asked to close.
        /// </summary>
        public static int CloseWindows(string desktopName, int processId)
        {
            IntPtr desktop = OpenDesktopW(desktopName, 0, false, DESKTOP_ALL_ACCESS);
            if (desktop == IntPtr.Zero) throw Failure("OpenDesktop");
            int closed = 0;
            EnumDesktopWindows(desktop, (window, parameter) =>
            {
                int owner;
                GetWindowThreadProcessId(window, out owner);
                if (owner == processId && PostMessageW(window, WM_CLOSE, IntPtr.Zero, IntPtr.Zero)) closed++;
                return true;
            }, IntPtr.Zero);
            CloseDesktop(desktop);
            return closed;
        }

        public static int Pty(string commandLine, string workingDirectory, string recordFile, string stateFile,
            string outputFile, string inputDirectory, short columns, short rows, string program)
        {
            SafeFileHandle inputRead, inputWrite, outputRead, outputWrite;
            if (!CreatePipe(out inputRead, out inputWrite, IntPtr.Zero, 0)) throw Failure("CreatePipe");
            if (!CreatePipe(out outputRead, out outputWrite, IntPtr.Zero, 0)) throw Failure("CreatePipe");
            IntPtr console;
            int result = CreatePseudoConsole(new Coord { X = columns, Y = rows }, inputRead, outputWrite, 0, out console);
            if (result != 0) throw new InvalidOperationException("CreatePseudoConsole failed (HRESULT " + result + ").");
            // The pseudo console holds its own copies of these ends.
            inputRead.Dispose();
            outputWrite.Dispose();

            IntPtr size = IntPtr.Zero;
            InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
            IntPtr attributes = Marshal.AllocHGlobal(size);
            if (!InitializeProcThreadAttributeList(attributes, 1, 0, ref size)) throw Failure("InitializeProcThreadAttributeList");
            if (!UpdateProcThreadAttribute(attributes, 0, PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE, console, (IntPtr)IntPtr.Size, IntPtr.Zero, IntPtr.Zero))
                throw Failure("UpdateProcThreadAttribute");

            var startupInfo = new StartupInfoEx();
            startupInfo.StartupInfo.cb = Marshal.SizeOf(typeof(StartupInfoEx));
            // Empty standard handles: otherwise the program inherits this host's pipes to WSL instead of the pseudo console.
            startupInfo.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
            startupInfo.lpAttributeList = attributes;
            ProcessInformation information;
            if (!CreateProcessEx(null, new StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, false,
                    EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT, IntPtr.Zero, workingDirectory, ref startupInfo, out information))
                throw Failure("CreateProcess");
            Record(recordFile, information, "pty", program);
            WriteState(stateFile, "{\"mode\":\"pty\",\"pid\":" + information.dwProcessId + ",\"created\":\"" +
                CreationTime(information.hProcess) + "\"}");

            var output = new FileStream(outputFile, FileMode.Create, FileAccess.Write, FileShare.ReadWrite);
            var reader = new Thread(() =>
            {
                var buffer = new byte[8192];
                using (var stream = new FileStream(outputRead, FileAccess.Read))
                {
                    int count;
                    try
                    {
                        while ((count = stream.Read(buffer, 0, buffer.Length)) > 0)
                        {
                            output.Write(buffer, 0, count);
                            output.Flush();
                        }
                    }
                    catch (IOException) { }
                }
            });
            reader.IsBackground = true;
            reader.Start();

            var exited = new ManualResetEvent(false);
            var writer = new Thread(() =>
            {
                Directory.CreateDirectory(inputDirectory);
                using (var stream = new FileStream(inputWrite, FileAccess.Write))
                {
                    while (!exited.WaitOne(100))
                    {
                        var files = new List<string>(Directory.GetFiles(inputDirectory, "*.input"));
                        files.Sort(StringComparer.Ordinal);
                        foreach (var file in files)
                        {
                            byte[] bytes;
                            try { bytes = File.ReadAllBytes(file); File.Delete(file); } catch (IOException) { continue; }
                            try { stream.Write(bytes, 0, bytes.Length); stream.Flush(); } catch (IOException) { return; }
                        }
                    }
                }
            });
            writer.IsBackground = true;
            writer.Start();

            int exitCode = WaitForExit(information);
            exited.Set();
            WriteState(stateFile, "{\"mode\":\"pty\",\"pid\":" + information.dwProcessId + ",\"exitCode\":" + exitCode + "}");
            // Closing the pseudo console ends the output pipe once the reader has drained it.
            ClosePseudoConsole(console);
            reader.Join(5000);
            output.Dispose();
            CloseHandle(information.hThread);
            CloseHandle(information.hProcess);
            DeleteProcThreadAttributeList(attributes);
            Marshal.FreeHGlobal(attributes);
            return exitCode;
        }
    }
}
