@echo off
chcp 65001 >nul
setlocal

set "PORT=8791"
set "SRVTITLE=MoTiKu Local Server"
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo   墨 · 考研数学真题
echo   ------------------------------
echo   目录: %ROOT%
echo   端口: %PORT%
echo.

rem 端口已被占用就直接开浏览器，不再起第二个服务器
netstat -ano | findstr /r /c:"LISTENING" | findstr /c:":%PORT% " >nul 2>&1
if not errorlevel 1 (
    echo   服务器已在运行，直接打开浏览器。
    start "" "http://localhost:%PORT%/"
    echo.
    pause
    exit /b 0
)

rem 找 python：优先 py 启动器，其次 PATH 里的 python
set "PYCMD="
where py >nul 2>&1 && set "PYCMD=py -3"
if not defined PYCMD ( where python >nul 2>&1 && set "PYCMD=python" )

if not defined PYCMD (
    echo   [x] 没找到 Python。
    echo.
    echo   装一个 Python 3: https://www.python.org/downloads/
    echo   或者有 Node 的话，手动执行:  npx serve -l %PORT% .
    echo.
    pause
    exit /b 1
)

echo   启动中...
echo.

rem 服务器放到后台最小化窗口。窗口标题必须是纯 ASCII ——
rem 标题里带中文/间隔号时 cmd 的 start 会在空格处截断，把后半段当成命令执行。
start "%SRVTITLE%" /min %PYCMD% -m http.server %PORT% --bind 127.0.0.1

rem 轮询最多 10 秒，等监听就绪
set "READY="
for /l %%i in (1,1,20) do (
    if not defined READY (
        ping -n 1 -w 500 127.0.0.1 >nul
        netstat -ano | findstr /r /c:"LISTENING" | findstr /c:":%PORT% " >nul 2>&1
        if not errorlevel 1 set "READY=1"
    )
)

if not defined READY (
    echo   [x] 服务器没起来。看一眼那个最小化的窗口里报了什么。
    echo.
    pause
    exit /b 1
)

start "" "http://localhost:%PORT%/"

echo   [ok] 已打开 http://localhost:%PORT%/
echo.
echo   停止服务：关掉标题为 "%SRVTITLE%" 的那个最小化窗口。
echo.
pause
