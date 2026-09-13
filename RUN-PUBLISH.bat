@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "DEFAULT_REMOTE=https://github.com/mmingle5867/SEMA-Facilities.git"
set /p "EXPECTED_REMOTE=GitHub repository URL [%DEFAULT_REMOTE%]: "
if "%EXPECTED_REMOTE%"=="" set "EXPECTED_REMOTE=%DEFAULT_REMOTE%"
call :publish || goto :failure
echo.
echo PUBLISH COMPLETE.
pause
exit /b 0
:publish
pushd "%~dp0" || exit /b 1
if not exist ".git" git init -b main || exit /b 1
git remote get-url origin >nul 2>nul && (git remote set-url origin "%EXPECTED_REMOTE%") || (git remote add origin "%EXPECTED_REMOTE%")
git branch -M main || exit /b 1
git add -A || exit /b 1
git diff --cached --quiet || git commit -m "feat: establish SEMA Facilities" || exit /b 1
git push -u origin main || exit /b 1
popd
exit /b 0
:failure
echo.
echo PUBLISH FAILED. Review the error above. No source files were deleted.
pause
exit /b 1
