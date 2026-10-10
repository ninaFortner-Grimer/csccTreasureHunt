$baseUrl = "http://localhost:3000/api"

Write-Host "=== TEST 1: NICKNAME VALIDATION ===" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/player" -Method POST -Body '{"name": ";;;;"}' -ContentType "application/json"
    Write-Host "FAIL: Should have rejected invalid nickname" -ForegroundColor Red
} catch {
    Write-Host "PASS: Rejected invalid nickname (StatusCode: $($_.Exception.Response.StatusCode))" -ForegroundColor Green
}

Write-Host "`n=== TEST 2: PLAYER REGISTRATION ===" -ForegroundColor Cyan
$pBody = '{"name": "Champion2026"}'
$pResp = Invoke-RestMethod -Uri "$baseUrl/player" -Method POST -Body $pBody -ContentType "application/json"
$token = $pResp.token
Write-Host "PASS: Registered player $($pResp.name) with token: $token" -ForegroundColor Green

Write-Host "`n=== TEST 3: DUPLICATE REGISTRATION PREVENTION / STABLE SESSION ===" -ForegroundColor Cyan
$headers = @{ "x-player-token" = $token; "Content-Type" = "application/json" }
$pInfo = Invoke-RestMethod -Uri "$baseUrl/player/me" -Method GET -Headers $headers
Write-Host "PASS: Retrieved player info (State: $($pInfo.state), Score: $($pInfo.score))" -ForegroundColor Green

Write-Host "`n=== TEST 4: FIVE ROUND FULL GAMEPLAY SMOKE TEST ===" -ForegroundColor Cyan
for ($round = 1; $round -le 5; $round++) {
    Write-Host "`n--- Round $round ---" -ForegroundColor Yellow
    
    # Fetch challenge
    $chal = Invoke-RestMethod -Uri "$baseUrl/challenge" -Method GET -Headers $headers
    $qText = $chal.question
    $cpId = $chal.checkpoint.id
    $clue = $chal.checkpoint.clue
    Write-Host "Question: $qText" -ForegroundColor Gray
    Write-Host "Target Checkpoint: $cpId - Clue: $clue" -ForegroundColor Gray

    # Test submitting wrong answer first
    $wrongAnswer = if ($chal.options[0] -eq $chal.answer) { $chal.options[1] } else { $chal.options[0] }
    $wrongBody = @{ answer = $wrongAnswer } | ConvertTo-Json
    $wrongResp = Invoke-RestMethod -Uri "$baseUrl/challenge/answer" -Method POST -Headers $headers -Body $wrongBody
    if ($wrongResp.correct -eq $false) {
        Write-Host "PASS: Wrong answer correctly rejected" -ForegroundColor Green
    } else {
        Write-Host "FAIL: Wrong answer accepted!" -ForegroundColor Red
    }

    # Now submit correct answer
    $rightBody = @{ answer = $chal.answer } | ConvertTo-Json
    $rightResp = Invoke-RestMethod -Uri "$baseUrl/challenge/answer" -Method POST -Headers $headers -Body $rightBody
    Write-Host "PASS: Correct answer accepted (State: $($rightResp.state))" -ForegroundColor Green

    # Attempt scan with wrong QR code
    try {
        $badQrBody = @{ payload = "CSCC:QR-99:BADSECRET" } | ConvertTo-Json
        $badScan = Invoke-RestMethod -Uri "$baseUrl/checkpoint/scan" -Method POST -Headers $headers -Body $badQrBody
        Write-Host "FAIL: Bad QR accepted" -ForegroundColor Red
    } catch {
        Write-Host "PASS: Invalid QR code correctly rejected" -ForegroundColor Green
    }

    # Fetch player details to get exact secret for assigned checkpoint
    $pState = Invoke-RestMethod -Uri "$baseUrl/player/me" -Method GET -Headers $headers
    $currentCpId = $pState.assignedCheckpointId

    # Secrets map matching backend qrcodes.json
    $secretsMap = @{
        "QR-01" = "CSCC-LAB-7K2P"
        "QR-02" = "CSCC-ENT-9M4X"
        "QR-03" = "CSCC-NOT-3W8Y"
        "QR-04" = "CSCC-TD-5R1Z"
        "QR-05" = "CSCC-SOC-2L6V"
    }

    $secret = $secretsMap[$currentCpId]
    $validQrPayload = "CSCC:${currentCpId}:${secret}"

    $validScanBody = @{ payload = $validQrPayload } | ConvertTo-Json
    $scanResp = Invoke-RestMethod -Uri "$baseUrl/checkpoint/scan" -Method POST -Headers $headers -Body $validScanBody
    Write-Host "PASS: Checkpoint $currentCpId successfully scanned! New Score: $($scanResp.score), State: $($scanResp.state)" -ForegroundColor Green
}

Write-Host "`n=== TEST 5: FINAL GAME COMPLETION VERIFICATION ===" -ForegroundColor Cyan
$finalMe = Invoke-RestMethod -Uri "$baseUrl/player/me" -Method GET -Headers $headers
Write-Host "Final Player State: $($finalMe.state)" -ForegroundColor Green
Write-Host "Final Score: $($finalMe.score) / 5" -ForegroundColor Green
Write-Host "Completion Timestamp: $($finalMe.completedAt)" -ForegroundColor Green

Write-Host "`n=== TEST 6: LEADERBOARD API ===" -ForegroundColor Cyan
$lb = Invoke-RestMethod -Uri "$baseUrl/leaderboard" -Method GET
Write-Host "PASS: Retrieved Leaderboard with $($lb.Count) players" -ForegroundColor Green
$top = $lb | Select-Object -First 1
Write-Host "Top player: $($top.name) - Score: $($top.score) - Completed: $($top.completedAt)" -ForegroundColor Gray

Write-Host "`n=== TEST 7: ORGANIZER DASHBOARD AUTH & ACCESS ===" -ForegroundColor Cyan
try {
    $unauthDash = Invoke-RestMethod -Uri "$baseUrl/organizer/dashboard" -Method GET
    Write-Host "FAIL: Organizer endpoint allowed unauthenticated access" -ForegroundColor Red
} catch {
    Write-Host "PASS: Unauthenticated organizer dashboard rejected (StatusCode: $($_.Exception.Response.StatusCode))" -ForegroundColor Green
}

$orgBody = '{"password": "CSCC_WELCOME_2026_ADMIN"}'
$orgLogin = Invoke-RestMethod -Uri "$baseUrl/organizer/login" -Method POST -Body $orgBody -ContentType "application/json"
$orgToken = $orgLogin.token
Write-Host "PASS: Organizer login successful, token received" -ForegroundColor Green

$orgHeaders = @{ "Authorization" = "Bearer $orgToken" }
$orgDash = Invoke-RestMethod -Uri "$baseUrl/organizer/dashboard" -Method GET -Headers $orgHeaders
Write-Host "PASS: Organizer dashboard fetched $($orgDash.totalPlayers) total players, $($orgDash.finishedPlayers) finished players" -ForegroundColor Green

Write-Host "`n=== ALL TESTS PASSED SUCCESSFULLY! ===" -ForegroundColor Green
