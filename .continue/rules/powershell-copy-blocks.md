---
description: The user copies commands exactly; combining statements causes
  errors. This rule ensures reliable copy/paste execution.
alwaysApply: true
---

Provide PowerShell commands as single-command blocks; never place two statements on one line. Use START COPY/END COPY guards for the user to copy. Prefer Out-File and Notepad methods over here-strings for env files.