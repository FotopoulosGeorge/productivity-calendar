Write-Host "Stopping all Electron processes..."

# Kill all electron processes more aggressively
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "Productivity Calendar" -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment for processes to fully terminate
Start-Sleep -Seconds 2

Write-Host "Removing build directories..."

# Define paths to clean
$PathsToClean = @(
    "dist",
    "build"
)

foreach ($Path in $PathsToClean) {
    if (Test-Path $Path) {
        Write-Host "Removing $Path..."
        try {
            # Try multiple times with increasing delays
            $attempts = 0
            $maxAttempts = 3
            
            do {
                try {
                    Remove-Item $Path -Recurse -Force -ErrorAction Stop
                    Write-Host "Successfully removed $Path"
                    break
                } catch {
                    $attempts++
                    if ($attempts -lt $maxAttempts) {
                        Write-Host "Attempt $attempts failed, retrying in 2 seconds..."
                        Start-Sleep -Seconds 2
                    } else {
                        Write-Host "Failed to remove $Path after $maxAttempts attempts: $($_.Exception.Message)"
                        
                        # Try to remove individual files if directory removal fails
                        if (Test-Path $Path) {
                            Write-Host "Attempting to remove files individually..."
                            Get-ChildItem $Path -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
                            Remove-Item $Path -Force -ErrorAction SilentlyContinue
                        }
                    }
                }
            } while ($attempts -lt $maxAttempts)
            
        } catch {
            Write-Host "Error removing $Path`: $($_.Exception.Message)"
        }
    } else {
        Write-Host "$Path does not exist, skipping..."
    }
}

Write-Host "Clean completed!"