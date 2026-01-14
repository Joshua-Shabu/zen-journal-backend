# Test API Endpoints

Write-Host "=== Testing Mini Couple Journal API ===" -ForegroundColor Green

# 1. Register User
Write-Host "`n1. Registering user 'alice'..." -ForegroundColor Yellow
try {
    $register = Invoke-RestMethod -Uri http://localhost:5000/auth/register -Method POST -ContentType "application/json" -Body '{"username": "alice", "password": "1234"}'
    Write-Host "✓ Registration successful: $($register | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "✗ Registration failed: User may already exist" -ForegroundColor Red
}

# 2. Login
Write-Host "`n2. Logging in..." -ForegroundColor Yellow
try {
    $login = Invoke-RestMethod -Uri http://localhost:5000/auth/login -Method POST -ContentType "application/json" -Body '{"username": "alice", "password": "1234"}'
    $token = $login.token
    Write-Host "✓ Login successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Add Journal Entry
Write-Host "`n3. Adding journal entry..." -ForegroundColor Yellow
try {
    $entry = Invoke-RestMethod -Uri http://localhost:5000/entries -Method POST -ContentType "application/json" -Headers @{Authorization = "Bearer $token"} -Body '{"text": "Had coffee together today"}'
    Write-Host "✓ Entry created: $($entry | ConvertTo-Json)" -ForegroundColor Green
    $entryId = $entry.id
} catch {
    Write-Host "✗ Entry creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 4. Fetch Entries
Write-Host "`n4. Fetching entries..." -ForegroundColor Yellow
try {
    $entries = Invoke-RestMethod -Uri http://localhost:5000/entries -Method GET -Headers @{Authorization = "Bearer $token"}
    Write-Host "✓ Entries fetched: $($entries | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "✗ Fetch entries failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Delete Entry
Write-Host "`n5. Deleting entry..." -ForegroundColor Yellow
try {
    $delete = Invoke-RestMethod -Uri http://localhost:5000/entries/$entryId -Method DELETE -Headers @{Authorization = "Bearer $token"}
    Write-Host "✓ Entry deleted: $($delete | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "✗ Delete entry failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== API Test Complete ===" -ForegroundColor Green
