# Stacktape completion script
$scriptBlock = {
  param($commandName, $wordToComplete, $cursorPosition)
  $words = $wordToComplete -split ' '
  $numberOfWords = $words.count + 1
  $currentWord = $words[$numberOfWords - 2]
  $optionsForCommand = <<OPTIONS_FOR_COMMAND>>
  $optionValues = <<OPTION_VALUES>>
  $commands = <<COMMANDS>>

  if (($numberOfWords -eq 2)) {
    $commands | ForEach-Object {
      New-Object -Type System.Management.Automation.CompletionResult -ArgumentList $_,
          $_,
          "ParameterValue",
          $_
    }
  } elseif (($numberOfWords -eq 3) -and !($commands -contains $currentWord)) {
    $commands -like $currentWord + '*'
  } elseif ($numberOfWords -eq 3) {
    $optionsForCommand[$words[1]]
  } elseif ($numberOfWords -ge 4) {
    if ($optionsForCommand[$words[1]] -contains $currentWord) {
      $optionValues[$currentWord]
    } elseif ($currentWord -like '-*') {
      $optionsForCommand[$words[1]] -like ($currentWord + '*')
    } else {
      $optionsForCommand[$words[1]]
    }
  }
}

Register-ArgumentCompleter  -Native -CommandName stacktape -ScriptBlock $scriptBlock
Register-ArgumentCompleter  -Native -CommandName stp -ScriptBlock $scriptBlock
