// Windows-side process host for windows-host.ts, compiled at runtime by host.ps1 (Add-Type). Every program it starts
// is created suspended and placed in the task's job object before it runs, so it and everything it starts belong to
// the job: `ps` lists the job's processes and `kill` terminates the job. Windows tracks the membership, so a reused
// PID or an exited intermediate process cannot hide or adopt a process. The job does not allow breakaway. It does not
// kill on close either, because the `dev --agent` daemon must outlive the command that started it.
//
// A job's name disappears with its last handle, even while its processes run. So every start also starts a keeper
// (keep-job.ps1, a console without a window) inside the job, after the program has joined it, and gives it a handle to
// the job. A keeper exits once the job holds nothing but keepers and console hosts, and `kill` ends the keepers with the
// rest. Because each start has its own keeper, a keeper that is just exiting can never leave a new program unkept.
//
// Modes:
// - Exec: the program inherits this process's standard handles (pipes from WSL) and its hidden console;
// - Pty: the program runs in a pseudo console (ConPTY) with no window; its output goes to a file, and input arrives
//   through a named pipe that only the current user can open;
// - Window: the program runs in a classic console window on a separate desktop, so the window is real (closing it
//   sends CTRL_CLOSE_EVENT) but never appears on, or takes focus from, the user's desktop.
using System;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace StacktapeWsl
{
    public static class Host
    {
        public const string Root = "C:\\stacktape-wsl";

        const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
        const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
        const uint CREATE_SUSPENDED = 0x00000004;
        const uint CREATE_NO_WINDOW = 0x08000000;
        const uint DUPLICATE_SAME_ACCESS = 0x00000002;
        const uint SYNCHRONIZE = 0x00100000;
        const int STARTF_USESHOWWINDOW = 0x00000001;
        const int STARTF_USESTDHANDLES = 0x00000100;
        const short SW_SHOWMINNOACTIVE = 7;
        const uint JOB_OBJECT_ALL_ACCESS = 0x001F001F;
        const int JobObjectBasicProcessIdList = 3;
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
        delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);

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
        static extern uint ResumeThread(IntPtr thread);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool TerminateProcess(IntPtr process, uint exitCode);
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
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern IntPtr CreateJobObjectW(IntPtr attributes, string name);
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern IntPtr OpenJobObjectW(uint access, bool inherit, string name);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool TerminateJobObject(IntPtr job, uint exitCode);
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern IntPtr CreateEventW(IntPtr attributes, bool manualReset, bool initialState, string name);
        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern IntPtr OpenEventW(uint access, bool inherit, string name);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern IntPtr GetCurrentProcess();
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool DuplicateHandle(IntPtr sourceProcess, IntPtr source, IntPtr targetProcess, out IntPtr target,
            uint access, bool inherit, uint options);
        [DllImport("kernel32.dll", SetLastError = true)]
        static extern bool QueryInformationJobObject(IntPtr job, int informationClass, IntPtr information, int length, out int returnLength);

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

        // Kept in fields: Windows calls the handler and uses the desktop for as long as this host runs.
        static ConsoleCtrlHandler keepAlive;
        static IntPtr hiddenDesktop;

        static Exception Failure(string what)
        {
            return new InvalidOperationException(what + " failed (Win32 error " + Marshal.GetLastWin32Error() + ").");
        }

        /// <summary>
        /// Refuses <paramref name="path"/> unless it lies inside C:\stacktape-wsl and neither the root nor any existing
        /// component down to the path is a junction, symbolic link or other reparse point. Called before every file
        /// this host creates or writes, so code under test cannot redirect the host's writes elsewhere.
        /// </summary>
        public static void AssertNoReparsePoints(string path)
        {
            string full = Path.GetFullPath(path).TrimEnd('\\');
            bool isRoot = string.Equals(full, Root, StringComparison.OrdinalIgnoreCase);
            if (!isRoot && !full.StartsWith(Root + "\\", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(full + " is not inside " + Root + ".");
            string current = Root;
            string[] parts = isRoot ? new string[0] : full.Substring(Root.Length + 1).Split('\\');
            for (int index = -1; index < parts.Length; index++)
            {
                if (index >= 0) current = current + "\\" + parts[index];
                if (!File.Exists(current) && !Directory.Exists(current)) return;
                if ((File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                    throw new InvalidOperationException(current + " is a link; refusing to use it.");
            }
        }

        /// <summary>
        /// Ctrl+C and Ctrl+Break reach every process in a console. This host waits for its program and reports the
        /// exit code, so it ignores both; unlike SetConsoleCtrlHandler(NULL, TRUE), a handler is not inherited.
        /// </summary>
        public static void IgnoreCtrlC()
        {
            keepAlive = ctrlType => ctrlType <= 1;
            SetConsoleCtrlHandler(keepAlive, true);
        }

        static string JobName(string task) { return "Local\\stacktape-wsl-" + task; }

        /// <summary>The PIDs in the task's job; empty when the job no longer exists (no handle and no process).</summary>
        public static int[] ListJob(string task)
        {
            IntPtr job = OpenJobObjectW(JOB_OBJECT_ALL_ACCESS, false, JobName(task));
            if (job == IntPtr.Zero) return new int[0];
            try
            {
                const int capacity = 4096;
                int size = 8 + capacity * IntPtr.Size;
                IntPtr buffer = Marshal.AllocHGlobal(size);
                try
                {
                    int returned;
                    if (!QueryInformationJobObject(job, JobObjectBasicProcessIdList, buffer, size, out returned))
                        throw Failure("QueryInformationJobObject");
                    int count = Marshal.ReadInt32(buffer, 4);
                    var ids = new int[count];
                    for (int index = 0; index < count; index++)
                        ids[index] = (int)Marshal.ReadIntPtr(buffer, 8 + index * IntPtr.Size);
                    return ids;
                }
                finally { Marshal.FreeHGlobal(buffer); }
            }
            finally { CloseHandle(job); }
        }

        /// <summary>Terminates every process in the task's job; returns how many there were.</summary>
        public static int TerminateJob(string task)
        {
            IntPtr job = OpenJobObjectW(JOB_OBJECT_ALL_ACCESS, false, JobName(task));
            if (job == IntPtr.Zero) return 0;
            try
            {
                int count = ListJob(task).Length;
                if (!TerminateJobObject(job, 1)) throw Failure("TerminateJobObject");
                return count;
            }
            finally { CloseHandle(job); }
        }

        static string CreationTime(IntPtr process)
        {
            FileTime creation, exit, kernel, user;
            GetProcessTimes(process, out creation, out exit, out kernel, out user);
            long ticks = ((long)creation.High << 32) | creation.Low;
            return DateTime.FromFileTimeUtc(ticks).ToString("o");
        }

        /// <summary>The script that keeps the job open; set by host.ps1 from its own folder.</summary>
        public static string KeeperScript;

        /// <summary>
        /// Starts a keeper for a program that has just joined the job: suspended, inside the job, with a handle to the job
        /// duplicated into it before it runs.
        /// </summary>
        static void StartKeeper(string task, IntPtr job)
        {
            string pwsh = Environment.ProcessPath;
            var startupInfo = new StartupInfo();
            startupInfo.cb = Marshal.SizeOf(typeof(StartupInfo));
            // A console of its own without a window (CREATE_NO_WINDOW) and no inherited handles: the keeper must neither
            // show anything nor hold the helper's pipes to WSL.
            string commandLine = "\"" + pwsh + "\" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"" + KeeperScript +
                "\" -Task " + task;
            ProcessInformation keeper;
            if (!CreateProcessPlain(null, new StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, false,
                    CREATE_UNICODE_ENVIRONMENT | CREATE_SUSPENDED | CREATE_NO_WINDOW, IntPtr.Zero,
                    Path.GetDirectoryName(KeeperScript), ref startupInfo, out keeper))
                throw Failure("CreateProcess");
            IntPtr copy;
            if (!AssignProcessToJobObject(job, keeper.hProcess) ||
                !DuplicateHandle(GetCurrentProcess(), job, keeper.hProcess, out copy, 0, false, DUPLICATE_SAME_ACCESS))
            {
                Exception failure = Failure("Handing the job to the keeper");
                TerminateProcess(keeper.hProcess, 1);
                throw failure;
            }
            ResumeThread(keeper.hThread);
            CloseHandle(keeper.hThread);
            CloseHandle(keeper.hProcess);
        }

        static string KeeperEventName(string task, int processId) { return "Local\\stacktape-wsl-" + task + "-keeper-" + processId; }

        /// <summary>
        /// The keeper's loop: holds the job open while it contains a process other than keepers (recognized by their
        /// named event) and console hosts (the keepers' hidden consoles; a console host without a program exits by itself).
        /// </summary>
        public static void KeepJob(string task)
        {
            int self = Environment.ProcessId;
            IntPtr identity = CreateEventW(IntPtr.Zero, true, false, KeeperEventName(task, self));
            if (identity == IntPtr.Zero) throw Failure("CreateEvent");
            while (true)
            {
                bool others = false;
                foreach (int id in ListJob(task))
                {
                    if (id == self) continue;
                    try { if (System.Diagnostics.Process.GetProcessById(id).ProcessName == "conhost") continue; }
                    catch (ArgumentException) { continue; }
                    IntPtr keeper = OpenEventW(SYNCHRONIZE, false, KeeperEventName(task, id));
                    if (keeper != IntPtr.Zero) { CloseHandle(keeper); continue; }
                    others = true;
                    break;
                }
                if (!others) return;
                Thread.Sleep(1000);
            }
        }

        static string Json(string value) { return value.Replace("\\", "\\\\").Replace("\"", "\\\""); }

        /// <summary>
        /// Puts the suspended process in the task's job, records it for display, and lets it run. A process that
        /// cannot join the job is terminated before it runs a single instruction.
        /// </summary>
        static void JoinJobAndResume(string task, ProcessInformation information, string recordFile, string mode, string program)
        {
            IntPtr job = CreateJobObjectW(IntPtr.Zero, JobName(task));
            if (job == IntPtr.Zero || !AssignProcessToJobObject(job, information.hProcess))
            {
                Exception failure = Failure(job == IntPtr.Zero ? "CreateJobObject" : "AssignProcessToJobObject");
                TerminateProcess(information.hProcess, 1);
                if (job != IntPtr.Zero) CloseHandle(job);
                throw failure;
            }
            try { StartKeeper(task, job); }
            catch (Exception error)
            {
                TerminateProcess(information.hProcess, 1);
                CloseHandle(job);
                throw new InvalidOperationException("Starting the job keeper failed: " + error.Message);
            }
            CloseHandle(job);
            ResumeThread(information.hThread);
            try
            {
                AssertNoReparsePoints(recordFile);
                File.AppendAllText(recordFile, "{\"pid\":" + information.dwProcessId + ",\"created\":\"" +
                    CreationTime(information.hProcess) + "\",\"mode\":\"" + mode + "\",\"program\":\"" + Json(program) + "\"}\n");
            }
            catch (Exception error) { Console.Error.WriteLine("windows-host: not recording the process: " + error.Message); }
        }

        static void WriteState(string stateFile, string json)
        {
            AssertNoReparsePoints(stateFile);
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

        public static int Exec(string task, string commandLine, string workingDirectory, string recordFile, string program)
        {
            var startupInfo = new StartupInfo();
            startupInfo.cb = Marshal.SizeOf(typeof(StartupInfo));
            ProcessInformation information;
            if (!CreateProcessPlain(null, new StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, true,
                    CREATE_UNICODE_ENVIRONMENT | CREATE_SUSPENDED, IntPtr.Zero, workingDirectory, ref startupInfo, out information))
                throw Failure("CreateProcess");
            JoinJobAndResume(task, information, recordFile, "exec", program);
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
        public static int Window(string task, string commandLine, string workingDirectory, string recordFile, string program, string desktopName)
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
                    false, CREATE_UNICODE_ENVIRONMENT | CREATE_SUSPENDED, IntPtr.Zero, workingDirectory, ref startupInfo, out information))
                throw Failure("CreateProcess");
            JoinJobAndResume(task, information, recordFile, "window", program);
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

        /// <summary>Writes bytes to a pseudo console's input pipe (the `keys` command).</summary>
        public static void SendInput(string pipeName, byte[] bytes)
        {
            using (var client = new NamedPipeClientStream(".", pipeName, PipeDirection.Out, PipeOptions.CurrentUserOnly))
            {
                client.Connect(5000);
                client.Write(bytes, 0, bytes.Length);
                client.Flush();
            }
        }

        public static int Pty(string task, string commandLine, string workingDirectory, string recordFile, string stateFile,
            string outputFile, short columns, short rows, string program)
        {
            AssertNoReparsePoints(outputFile);
            AssertNoReparsePoints(stateFile);
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
                    EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT | CREATE_SUSPENDED, IntPtr.Zero, workingDirectory,
                    ref startupInfo, out information))
                throw Failure("CreateProcess");
            JoinJobAndResume(task, information, recordFile, "pty", program);
            string pipeName = "stacktape-wsl-" + task + "-input-" + Environment.ProcessId;

            // Input arrives through a named pipe this host owns; only the current user can connect to it. The pipe
            // exists before the state file names it.
            var input = new FileStream(inputWrite, FileAccess.Write);
            var firstServer = new NamedPipeServerStream(pipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.CurrentUserOnly);
            var writer = new Thread(() =>
            {
                var buffer = new byte[4096];
                NamedPipeServerStream server = firstServer;
                while (true)
                {
                    try
                    {
                        using (server)
                        {
                            server.WaitForConnection();
                            int count;
                            while ((count = server.Read(buffer, 0, buffer.Length)) > 0)
                            {
                                input.Write(buffer, 0, count);
                                input.Flush();
                            }
                        }
                        server = new NamedPipeServerStream(pipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.CurrentUserOnly);
                    }
                    catch (IOException) { return; }
                }
            });
            writer.IsBackground = true;
            writer.Start();

            WriteState(stateFile, "{\"mode\":\"pty\",\"pid\":" + information.dwProcessId + ",\"created\":\"" +
                CreationTime(information.hProcess) + "\",\"inputPipe\":\"" + pipeName + "\"}");

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

            int exitCode = WaitForExit(information);
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
