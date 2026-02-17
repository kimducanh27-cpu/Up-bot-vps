@echo off
chcp 65001 >nul
title Discord Bot Auto-Restart v2
color 0A

:loop
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           DISCORD BOT AUTO-RESTART v2                        ║
echo ║           Tự động khởi động lại khi bot bị đóng              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [%date% %time%] Đang đóng các bot đang chạy...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo [%date% %time%] Đang khởi động bot...
echo.

node index.js

echo.
echo [%date% %time%] Bot đã dừng. Tự động khởi động lại sau 5 giây...
echo Nhấn Ctrl+C để thoát hoàn toàn.
echo.
timeout /t 5 /nobreak >nul
goto loop
