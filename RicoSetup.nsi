Unicode true
RequestExecutionLevel user
ManifestDPIAware true
SetCompressor /SOLID lzma

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\RicoBrowser"
Name "Rico Browser"
OutFile "${SETUP}"
InstallDir "$LOCALAPPDATA\Programs\Rico Browser"

VIProductVersion "1.4.1.0"
VIAddVersionKey /LANG=1036 "ProductName" "Rico Browser"
VIAddVersionKey /LANG=1036 "FileDescription" "Installation de Rico Browser"
VIAddVersionKey /LANG=1036 "FileVersion" "1.4.1.0"
VIAddVersionKey /LANG=1036 "LegalCopyright" "Rico Browser"

!define MUI_ICON "${PAYLOAD}\assets\rico.ico"
!define MUI_UNICON "${PAYLOAD}\assets\rico.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\rico.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Ouvrir Rico Browser"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "French"

!macro CheckProfileLock
  ${If} ${FileExists} "$INSTDIR\profile\parent.lock"
    System::Call 'kernel32::CreateFileW(w "$INSTDIR\profile\parent.lock", i 0x80000000, i 0, p 0, i 3, i 0x80, p 0) p .r0'
    ${If} $0 == -1
      MessageBox MB_OK|MB_ICONEXCLAMATION "Fermez Rico Browser avant de continuer." /SD IDOK
      SetErrorLevel 2
      Abort
    ${EndIf}
    System::Call 'kernel32::CloseHandle(p r0)'
  ${EndIf}
!macroend

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "Rico Browser nécessite Windows 64 bits." /SD IDOK
    SetErrorLevel 2
    Abort
  ${EndIf}
  SetRegView 64
  ReadRegStr $0 HKCU "${UNINSTALL_KEY}" "InstallLocation"
  ${If} $0 != ""
  ${AndIf} $0 != $INSTDIR
    MessageBox MB_OK|MB_ICONSTOP "Rico Browser est déjà installé dans $0." /SD IDOK
    SetErrorLevel 2
    Abort
  ${EndIf}
  ${If} $0 == ""
    ${If} ${FileExists} "$INSTDIR\rico.exe"
    ${OrIf} ${FileExists} "$INSTDIR\browser\*.*"
    ${OrIf} ${FileExists} "$INSTDIR\assets\*.*"
      MessageBox MB_OK|MB_ICONSTOP "Le dossier contient déjà une autre copie de Rico. Utilisez un dossier d’installation libre." /SD IDOK
      SetErrorLevel 2
      Abort
    ${EndIf}
  ${EndIf}
  !insertmacro CheckProfileLock
FunctionEnd

Section "Rico Browser"
  SetShellVarContext current
  ClearErrors
  SetOutPath "$INSTDIR"
  File "${PAYLOAD}\rico.exe"
  File "${PAYLOAD}\LISEZ-MOI.md"
  File "${PAYLOAD}\Update-Rico.ps1"
  File "${PAYLOAD}\Mettre a jour Rico.cmd"
  SetOutPath "$INSTDIR\assets"
  File /r /x ".branding-cache" "${PAYLOAD}\assets\*"
  SetOutPath "$INSTDIR\browser"
  File /r /x "policies.json" "${PAYLOAD}\browser\*"
  SetOutPath "$INSTDIR\browser\distribution"
  File /oname=policies.json "${POLICY}"
  IfErrors installFailed

  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateShortCut "$SMPROGRAMS\Rico Browser.lnk" "$INSTDIR\rico.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "Rico Browser"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "1.4.1"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "Rico Browser"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\rico.exe,0"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '$\"$INSTDIR\uninstall.exe$\"'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  IfErrors installFailed done

  installFailed:
    MessageBox MB_OK|MB_ICONSTOP "L’installation n’a pas pu se terminer." /SD IDOK
    SetErrorLevel 2
    Abort
  done:
SectionEnd

Function un.onInit
  SetRegView 64
  ReadRegStr $0 HKCU "${UNINSTALL_KEY}" "InstallLocation"
  ${If} $0 != $INSTDIR
    SetErrorLevel 2
    Abort
  ${EndIf}
  !insertmacro CheckProfileLock
FunctionEnd

Section "Uninstall"
  SetShellVarContext current
  ClearErrors
  RMDir /r "$INSTDIR\browser"
  RMDir /r "$INSTDIR\assets"
  Delete "$INSTDIR\rico.exe"
  Delete "$INSTDIR\LISEZ-MOI.md"
  Delete "$INSTDIR\Update-Rico.ps1"
  Delete "$INSTDIR\Mettre a jour Rico.cmd"
  IfErrors uninstallFailed
  Delete "$SMPROGRAMS\Rico Browser.lnk"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  Goto done

  uninstallFailed:
    MessageBox MB_OK|MB_ICONSTOP "La désinstallation n’a pas pu se terminer." /SD IDOK
    SetErrorLevel 2
    Abort
  done:
SectionEnd
