@rem Gradle startup script for Windows
@if "%DEBUG%"=="" @echo off
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_HOME=%DIRNAME%
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

if defined JAVA_HOME (
  set JAVA_EXE=%JAVA_HOME%/bin/java.exe
) else (
  set JAVA_EXE=java.exe
)

set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
"%JAVA_EXE%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
