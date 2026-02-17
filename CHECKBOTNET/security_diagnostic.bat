@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: ╔══════════════════════════════════════════════════════════════════════════════╗
:: ║     BOTNET & MALWARE PRELIMINARY DIAGNOSTIC TOOL                             ║
:: ║     Version: 1.0 | Author: Cybersecurity Expert                              ║
:: ║     CHỈ BÁO CÁO - KHÔNG TỰ ĐỘNG XÓA FILE                                     ║
:: ╚══════════════════════════════════════════════════════════════════════════════╝

title [SECURITY DIAGNOSTIC] Kiem Tra Botnet va Malware

:: ========== CONFIGURATION ==========
set "LOG_FILE=%~dp0security_check_log_%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt"
set "LOG_FILE=%LOG_FILE: =0%"
set "SUSPICIOUS_PORTS=4444 5555 6666 6667 6668 6669 7777 8888 9999 31337 12345 54321 1337 3389 4899 5900 5938"
set "SUSPICIOUS_PROCESSES=nc.exe ncat.exe netcat.exe mimikatz.exe pwdump.exe gsecdump.exe wce.exe procdump.exe"

:: ========== COLOR CODES ==========
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "WHITE=[97m"
set "RESET=[0m"
set "BOLD=[1m"

:: ========== BANNER ==========
cls
echo.
echo %CYAN%╔══════════════════════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%  %BOLD%%MAGENTA%██████╗  ██████╗ ████████╗███╗   ██╗███████╗████████╗                     %RESET%%CYAN%║%RESET%
echo %CYAN%║%RESET%  %BOLD%%MAGENTA%██╔══██╗██╔═══██╗╚══██╔══╝████╗  ██║██╔════╝╚══██╔══╝                     %RESET%%CYAN%║%RESET%
echo %CYAN%║%RESET%  %BOLD%%MAGENTA%██████╔╝██║   ██║   ██║   ██╔██╗ ██║█████╗     ██║                        %RESET%%CYAN%║%RESET%
echo %CYAN%║%RESET%  %BOLD%%MAGENTA%██╔══██╗██║   ██║   ██║   ██║╚██╗██║██╔══╝     ██║                        %RESET%%CYAN%║%RESET%
echo %CYAN%║%RESET%  %BOLD%%MAGENTA%██████╔╝╚██████╔╝   ██║   ██║ ╚████║███████╗   ██║                        %RESET%%CYAN%║%RESET%
echo %CYAN%║%RESET%  %BOLD%%MAGENTA%╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚═══╝╚══════╝   ╚═╝                        %RESET%%CYAN%║%RESET%
echo %CYAN%║%RESET%                                                                            %CYAN%║%RESET%
echo %CYAN%║%RESET%  %YELLOW%SECURITY DIAGNOSTIC TOOL - Cong cu chan doan bao mat%RESET%                      %CYAN%║%RESET%
echo %CYAN%║%RESET%  %GREEN%[!] CHI BAO CAO - KHONG TU DONG XOA FILE%RESET%                                  %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════════════════════╝%RESET%
echo.

:: ========== CHECK ADMIN RIGHTS ==========
echo %YELLOW%[*] Dang kiem tra quyen Administrator...%RESET%
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%[!] CANH BAO: Script dang chay KHONG co quyen Administrator!%RESET%
    echo %YELLOW%    Mot so ket qua co the bi han che.%RESET%
    echo %YELLOW%    De co ket qua day du, hay chay lai voi quyen Admin.%RESET%
    echo.
    set "IS_ADMIN=NO"
) else (
    echo %GREEN%[+] Dang chay voi quyen Administrator%RESET%
    echo.
    set "IS_ADMIN=YES"
)

:: ========== INITIALIZE LOG FILE ==========
echo ═══════════════════════════════════════════════════════════════════════════════ > "%LOG_FILE%"
echo     BOTNET ^& MALWARE PRELIMINARY DIAGNOSTIC REPORT >> "%LOG_FILE%"
echo     Thoi gian quet: %date% %time% >> "%LOG_FILE%"
echo     May tinh: %COMPUTERNAME% >> "%LOG_FILE%"
echo     Nguoi dung: %USERNAME% >> "%LOG_FILE%"
echo     Quyen Admin: %IS_ADMIN% >> "%LOG_FILE%"
echo ═══════════════════════════════════════════════════════════════════════════════ >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: ═══════════════════════════════════════════════════════════════════════════════
:: SECTION 1: NETWORK ANALYSIS
:: ═══════════════════════════════════════════════════════════════════════════════
echo %CYAN%╔══════════════════════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%  %BOLD%%WHITE%[1/5] PHAN TICH MANG (NETWORK ANALYSIS)%RESET%                                    %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════════════════════╝%RESET%

echo. >> "%LOG_FILE%"
echo ┌──────────────────────────────────────────────────────────────────────────────┐ >> "%LOG_FILE%"
echo │ SECTION 1: NETWORK ANALYSIS                                                  │ >> "%LOG_FILE%"
echo └──────────────────────────────────────────────────────────────────────────────┘ >> "%LOG_FILE%"

:: 1.1 - All ESTABLISHED connections
echo %YELLOW%[*] Dang kiem tra cac ket noi ESTABLISHED...%RESET%
echo. >> "%LOG_FILE%"
echo [1.1] TAT CA CAC KET NOI ESTABLISHED: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
netstat -ano | findstr "ESTABLISHED" >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 1.2 - Check suspicious ports
echo %YELLOW%[*] Dang kiem tra cac cong dang nghi...%RESET%
echo [1.2] KIEM TRA CONG DANG NGHI (Suspicious Ports): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
set "FOUND_SUSPICIOUS_PORT=0"
for %%p in (%SUSPICIOUS_PORTS%) do (
    for /f "tokens=*" %%a in ('netstat -ano 2^>nul ^| findstr ":%%p "') do (
        echo %RED%[!] CANH BAO: Phat hien ket noi tren cong %%p%RESET%
        echo [!] CANH BAO - Cong %%p: %%a >> "%LOG_FILE%"
        set "FOUND_SUSPICIOUS_PORT=1"
    )
)
if "%FOUND_SUSPICIOUS_PORT%"=="0" (
    echo %GREEN%[+] Khong phat hien ket noi tren cac cong dang nghi%RESET%
    echo [OK] Khong phat hien ket noi tren cac cong dang nghi >> "%LOG_FILE%"
)
echo. >> "%LOG_FILE%"

:: 1.3 - External connections with process details
echo %YELLOW%[*] Dang phan tich ket noi ra ngoai voi chi tiet tien trinh...%RESET%
echo [1.3] KET NOI RA NGOAI VOI CHI TIET TIEN TRINH: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
netstat -anob 2>nul | findstr /v "127.0.0.1" | findstr /v "0.0.0.0:0" | findstr /v "\[::\]" >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 1.4 - Listening ports
echo %YELLOW%[*] Dang kiem tra cac cong dang nghe (LISTENING)...%RESET%
echo [1.4] CAC CONG DANG NGHE (LISTENING PORTS): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
netstat -ano | findstr "LISTENING" >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo %GREEN%[+] Hoan thanh phan tich mang%RESET%
echo.

:: ═══════════════════════════════════════════════════════════════════════════════
:: SECTION 2: PROCESS INSPECTION
:: ═══════════════════════════════════════════════════════════════════════════════
echo %CYAN%╔══════════════════════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%  %BOLD%%WHITE%[2/5] KIEM TRA TIEN TRINH (PROCESS INSPECTION)%RESET%                             %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════════════════════╝%RESET%

echo. >> "%LOG_FILE%"
echo ┌──────────────────────────────────────────────────────────────────────────────┐ >> "%LOG_FILE%"
echo │ SECTION 2: PROCESS INSPECTION                                                │ >> "%LOG_FILE%"
echo └──────────────────────────────────────────────────────────────────────────────┘ >> "%LOG_FILE%"

:: 2.1 - All running processes with details
echo %YELLOW%[*] Dang liet ke tat ca tien trinh...%RESET%
echo [2.1] DANH SACH TIEN TRINH DANG CHAY (CHI TIET): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
wmic process get Name,ProcessId,ExecutablePath,CommandLine /format:list 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 2.2 - Check for known malicious process names
echo %YELLOW%[*] Dang kiem tra ten tien trinh dang nghi...%RESET%
echo [2.2] KIEM TRA TIEN TRINH DOC HAI DA BIET: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
set "FOUND_SUSPICIOUS_PROC=0"
for %%p in (%SUSPICIOUS_PROCESSES%) do (
    for /f "tokens=*" %%a in ('tasklist /fi "imagename eq %%p" 2^>nul ^| findstr /i "%%p"') do (
        echo %RED%[!] CANH BAO: Phat hien tien trinh dang nghi - %%p%RESET%
        echo [!] CANH BAO - Tien trinh doc hai: %%a >> "%LOG_FILE%"
        set "FOUND_SUSPICIOUS_PROC=1"
    )
)
if "%FOUND_SUSPICIOUS_PROC%"=="0" (
    echo %GREEN%[+] Khong phat hien tien trinh doc hai da biet%RESET%
    echo [OK] Khong phat hien tien trinh doc hai da biet >> "%LOG_FILE%"
)
echo. >> "%LOG_FILE%"

:: 2.3 - Processes without description
echo %YELLOW%[*] Dang tim tien trinh khong co mo ta...%RESET%
echo [2.3] TIEN TRINH KHONG CO MO TA (Co the dang nghi): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
wmic process where "Description=''" get Name,ProcessId,ExecutablePath 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 2.4 - Processes running from TEMP/AppData
echo %YELLOW%[*] Dang kiem tra tien trinh chay tu TEMP/AppData...%RESET%
echo [2.4] TIEN TRINH CHAY TU THU MUC TAM/APPDATA (DANG NGHI): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
wmic process where "ExecutablePath like '%%\\Temp\\%%'" get Name,ProcessId,ExecutablePath 2>nul >> "%LOG_FILE%"
wmic process where "ExecutablePath like '%%\\AppData\\Local\\Temp\\%%'" get Name,ProcessId,ExecutablePath 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 2.5 - High CPU consumers
echo %YELLOW%[*] Dang kiem tra tien trinh tieu thu CPU cao...%RESET%
echo [2.5] TIEN TRINH TIEU THU TAI NGUYEN CAO: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
wmic path win32_perfformatteddata_perfproc_process get Name,PercentProcessorTime 2>nul | sort /r >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo %GREEN%[+] Hoan thanh kiem tra tien trinh%RESET%
echo.

:: ═══════════════════════════════════════════════════════════════════════════════
:: SECTION 3: STARTUP CHECK
:: ═══════════════════════════════════════════════════════════════════════════════
echo %CYAN%╔══════════════════════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%  %BOLD%%WHITE%[3/5] KIEM TRA KHOI DONG (STARTUP CHECK)%RESET%                                   %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════════════════════╝%RESET%

echo. >> "%LOG_FILE%"
echo ┌──────────────────────────────────────────────────────────────────────────────┐ >> "%LOG_FILE%"
echo │ SECTION 3: STARTUP CHECK                                                     │ >> "%LOG_FILE%"
echo └──────────────────────────────────────────────────────────────────────────────┘ >> "%LOG_FILE%"

:: 3.1 - Registry Run keys (HKLM)
echo %YELLOW%[*] Dang kiem tra Registry Run keys (HKLM)...%RESET%
echo [3.1] REGISTRY RUN KEYS - HKEY_LOCAL_MACHINE: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" 2>nul >> "%LOG_FILE%"
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" 2>nul >> "%LOG_FILE%"
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run" 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 3.2 - Registry Run keys (HKCU)
echo %YELLOW%[*] Dang kiem tra Registry Run keys (HKCU)...%RESET%
echo [3.2] REGISTRY RUN KEYS - HKEY_CURRENT_USER: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" 2>nul >> "%LOG_FILE%"
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce" 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 3.3 - Common Startup Folders
echo %YELLOW%[*] Dang kiem tra thu muc Startup...%RESET%
echo [3.3] THU MUC STARTUP: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
echo --- User Startup Folder --- >> "%LOG_FILE%"
dir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup" /b 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"
echo --- All Users Startup Folder --- >> "%LOG_FILE%"
dir "%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\StartUp" /b 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 3.4 - Scheduled Tasks
echo %YELLOW%[*] Dang kiem tra Scheduled Tasks...%RESET%
echo [3.4] SCHEDULED TASKS (NHIEM VU DA LEN LICH): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
schtasks /query /fo LIST /v 2>nul | findstr /i "TaskName: Status: Task To Run:" >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 3.5 - Services set to auto-start
echo %YELLOW%[*] Dang kiem tra Services tu dong khoi dong...%RESET%
echo [3.5] DICH VU TU DONG KHOI DONG (AUTO-START SERVICES): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
wmic service where "StartMode='Auto'" get Name,DisplayName,PathName,State 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 3.6 - Check for suspicious service paths
echo %YELLOW%[*] Dang kiem tra duong dan dich vu dang nghi...%RESET%
echo [3.6] DICH VU VOI DUONG DAN DANG NGHI: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
wmic service where "PathName like '%%\\Temp\\%%' or PathName like '%%\\AppData\\%%'" get Name,PathName,State 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo %GREEN%[+] Hoan thanh kiem tra khoi dong%RESET%
echo.

:: ═══════════════════════════════════════════════════════════════════════════════
:: SECTION 4: ADDITIONAL SECURITY CHECKS
:: ═══════════════════════════════════════════════════════════════════════════════
echo %CYAN%╔══════════════════════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%  %BOLD%%WHITE%[4/5] KIEM TRA BAO MAT BO SUNG (ADDITIONAL CHECKS)%RESET%                        %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════════════════════╝%RESET%

echo. >> "%LOG_FILE%"
echo ┌──────────────────────────────────────────────────────────────────────────────┐ >> "%LOG_FILE%"
echo │ SECTION 4: ADDITIONAL SECURITY CHECKS                                        │ >> "%LOG_FILE%"
echo └──────────────────────────────────────────────────────────────────────────────┘ >> "%LOG_FILE%"

:: 4.1 - DNS Cache (check for suspicious domains)
echo %YELLOW%[*] Dang kiem tra DNS Cache...%RESET%
echo [4.1] DNS CACHE (Co the chua ten mien doc hai): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
ipconfig /displaydns 2>nul | findstr "Record" >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 4.2 - Hosts file modification
echo %YELLOW%[*] Dang kiem tra file Hosts...%RESET%
echo [4.2] NOI DUNG FILE HOSTS: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
type %WINDIR%\System32\drivers\etc\hosts 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 4.3 - Firewall Status
echo %YELLOW%[*] Dang kiem tra trang thai Firewall...%RESET%
echo [4.3] TRANG THAI FIREWALL: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
netsh advfirewall show allprofiles state 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 4.4 - Check for hidden files in critical directories
echo %YELLOW%[*] Dang kiem tra file an trong thu muc quan trong...%RESET%
echo [4.4] FILE AN TRONG THU MUC HE THONG: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
echo --- C:\Windows\Temp --- >> "%LOG_FILE%"
dir /ah /b "C:\Windows\Temp" 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"
echo --- User Temp --- >> "%LOG_FILE%"
dir /ah /b "%TEMP%" 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 4.5 - Recent executable files in Temp
echo %YELLOW%[*] Dang kiem tra file thuc thi trong Temp...%RESET%
echo [4.5] FILE THUC THI TRONG THU MUC TEMP: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
dir /s /b "%TEMP%\*.exe" "%TEMP%\*.dll" "%TEMP%\*.bat" "%TEMP%\*.ps1" "%TEMP%\*.vbs" 2>nul >> "%LOG_FILE%"
dir /s /b "C:\Windows\Temp\*.exe" "C:\Windows\Temp\*.dll" "C:\Windows\Temp\*.bat" 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 4.6 - Recent PowerShell/CMD history (if accessible)
echo %YELLOW%[*] Dang kiem tra lich su PowerShell...%RESET%
echo [4.6] LICH SU POWERSHELL (Neu co the truy cap): >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
if exist "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" (
    type "%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" 2>nul >> "%LOG_FILE%"
) else (
    echo [INFO] Khong tim thay file lich su PowerShell >> "%LOG_FILE%"
)
echo. >> "%LOG_FILE%"

:: 4.7 - Network profiles
echo %YELLOW%[*] Dang kiem tra cau hinh mang...%RESET%
echo [4.7] CAU HINH MANG HIEN TAI: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
ipconfig /all >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 4.8 - ARP Cache
echo %YELLOW%[*] Dang kiem tra ARP Cache...%RESET%
echo [4.8] ARP CACHE: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
arp -a >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo %GREEN%[+] Hoan thanh kiem tra bao mat bo sung%RESET%
echo.

:: ═══════════════════════════════════════════════════════════════════════════════
:: SECTION 5: SYSTEM INFORMATION
:: ═══════════════════════════════════════════════════════════════════════════════
echo %CYAN%╔══════════════════════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%  %BOLD%%WHITE%[5/5] THONG TIN HE THONG (SYSTEM INFORMATION)%RESET%                              %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════════════════════╝%RESET%

echo. >> "%LOG_FILE%"
echo ┌──────────────────────────────────────────────────────────────────────────────┐ >> "%LOG_FILE%"
echo │ SECTION 5: SYSTEM INFORMATION                                                │ >> "%LOG_FILE%"
echo └──────────────────────────────────────────────────────────────────────────────┘ >> "%LOG_FILE%"

:: 5.1 - System Info
echo %YELLOW%[*] Dang thu thap thong tin he thong...%RESET%
echo [5.1] THONG TIN HE THONG: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type" /C:"Total Physical Memory" /C:"Available Physical Memory" /C:"Hotfix(s)" >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 5.2 - User accounts
echo %YELLOW%[*] Dang kiem tra tai khoan nguoi dung...%RESET%
echo [5.2] TAI KHOAN NGUOI DUNG: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
net user >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 5.3 - Admin accounts
echo %YELLOW%[*] Dang kiem tra tai khoan Admin...%RESET%
echo [5.3] THANH VIEN NHOM ADMINISTRATORS: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
net localgroup Administrators 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 5.4 - Windows Defender Status
echo %YELLOW%[*] Dang kiem tra Windows Defender...%RESET%
echo [5.4] TRANG THAI WINDOWS DEFENDER: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
powershell -Command "Get-MpComputerStatus | Select-Object AntivirusEnabled, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated | Format-List" 2>nul >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 5.5 - Last Windows Update
echo %YELLOW%[*] Dang kiem tra cap nhat Windows gan day...%RESET%
echo [5.5] CAP NHAT WINDOWS GAN DAY: >> "%LOG_FILE%"
echo ─────────────────────────────────────────────────────────────────────────────── >> "%LOG_FILE%"
wmic qfe get Description,InstalledOn | sort /r | more +1 >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo %GREEN%[+] Hoan thanh thu thap thong tin he thong%RESET%
echo.

:: ═══════════════════════════════════════════════════════════════════════════════
:: SUMMARY & COMPLETION
:: ═══════════════════════════════════════════════════════════════════════════════
echo. >> "%LOG_FILE%"
echo ═══════════════════════════════════════════════════════════════════════════════ >> "%LOG_FILE%"
echo     BAO CAO HOAN THANH >> "%LOG_FILE%"
echo     Thoi gian ket thuc: %date% %time% >> "%LOG_FILE%"
echo     File log: %LOG_FILE% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"
echo     LUU Y QUAN TRONG: >> "%LOG_FILE%"
echo     - Day la ket qua chan doan SO BO, khong phai ket luan cuoi cung >> "%LOG_FILE%"
echo     - Can kiem tra ky luong cac muc CANH BAO trong bao cao >> "%LOG_FILE%"
echo     - Neu nghi ngo, hay su dung cong cu antivirus chuyen nghiep >> "%LOG_FILE%"
echo     - KHONG XOA bat ky file nao ma khong xac minh truoc >> "%LOG_FILE%"
echo ═══════════════════════════════════════════════════════════════════════════════ >> "%LOG_FILE%"

echo.
echo %CYAN%╔══════════════════════════════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║%RESET%  %BOLD%%GREEN%QUET HOAN TAT!%RESET%                                                            %CYAN%║%RESET%
echo %CYAN%╠══════════════════════════════════════════════════════════════════════════════╣%RESET%
echo %CYAN%║%RESET%                                                                            %CYAN%║%RESET%
echo %CYAN%║%RESET%  %WHITE%Ket qua da duoc luu vao file:%RESET%                                            %CYAN%║%RESET%
echo %CYAN%║%RESET%  %YELLOW%%LOG_FILE%%RESET%
echo %CYAN%║%RESET%                                                                            %CYAN%║%RESET%
echo %CYAN%║%RESET%  %WHITE%Cac buoc tiep theo:%RESET%                                                        %CYAN%║%RESET%
echo %CYAN%║%RESET%  %YELLOW%1.%RESET% Mo file log va kiem tra cac muc [!] CANH BAO                          %CYAN%║%RESET%
echo %CYAN%║%RESET%  %YELLOW%2.%RESET% Tim kiem cac IP/domain la trong ket noi mang                          %CYAN%║%RESET%
echo %CYAN%║%RESET%  %YELLOW%3.%RESET% Xac minh cac tien trinh dang nghi qua VirusTotal                      %CYAN%║%RESET%
echo %CYAN%║%RESET%  %YELLOW%4.%RESET% Kiem tra cac muc khoi dong khong ro nguon goc                         %CYAN%║%RESET%
echo %CYAN%║%RESET%  %YELLOW%5.%RESET% Su dung cong cu AV chuyen nghiep de quet sau                          %CYAN%║%RESET%
echo %CYAN%║%RESET%                                                                            %CYAN%║%RESET%
echo %CYAN%║%RESET%  %RED%[!] LUU Y: KHONG TU DONG XOA FILE - CHI BAO CAO%RESET%                            %CYAN%║%RESET%
echo %CYAN%║%RESET%                                                                            %CYAN%║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════════════════════════════╝%RESET%
echo.

:: Ask to open log
set /p OPEN_LOG="Ban co muon mo file log ngay bay gio? (Y/N): "
if /i "%OPEN_LOG%"=="Y" (
    notepad "%LOG_FILE%"
)

echo.
echo %GREEN%Cam on ban da su dung cong cu Security Diagnostic!%RESET%
echo %YELLOW%Nhan phim bat ky de thoat...%RESET%
pause >nul
exit /b 0
