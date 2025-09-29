$PROJECT_REF = "dmhlxhatogrrrvuruayv"
$CRON_KEY    = "2b2617b3ef3ecc0d3ed5f6bb58b18e7c5069d7ce3e7b7a7afda12bc1359cdaca"
$CRON_KEY    = $CRON_KEY.Trim()

$headers = @{
  "x-cron-key" = $CRON_KEY
  "Content-Type" = "application/json"
}

$uri = "https://$PROJECT_REF.supabase.co/functions/v1/schedule-nightly-crawl"

Invoke-WebRequest -Uri $uri -Headers $headers -Method POST -Body '{}' |
  Select-Object StatusCode, Content
