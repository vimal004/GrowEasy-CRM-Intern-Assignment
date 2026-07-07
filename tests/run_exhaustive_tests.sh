#!/bin/bash

# Configuration
API_URL=${API_URL:-https://groweasy-crm-api.onrender.com/api}
CSV_FILE="tests/comprehensive_edge_cases.csv"

# Colors for printing
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "================================================================================"
echo -e "🧪 STARTING EXHAUSTIVE DEPLOYED BACKEND E2E TEST SUITE"
echo -e "Target URL: $API_URL"
echo -e "Dataset: $CSV_FILE"
echo -e "================================================================================"

# 1. Check Health
echo -e "\n[1/3] Checking API Deployed Health..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HEALTH_CODE" -eq 200 ]; then
  echo -e "${GREEN}SUCCESS: API is online (HTTP $HEALTH_CODE)${NC}"
  echo "$HEALTH_BODY"
else
  echo -e "${RED}FAILURE: API returned status $HEALTH_CODE${NC}"
  echo "$HEALTH_BODY"
  exit 1
fi

# 2. Upload / Preview Test
echo -e "\n[2/3] Testing Upload Preview Endpoint..."
PREVIEW_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/upload" -F "file=@$CSV_FILE;type=text/csv")
PREVIEW_CODE=$(echo "$PREVIEW_RESPONSE" | tail -n1)
PREVIEW_BODY=$(echo "$PREVIEW_RESPONSE" | sed '$d')

if [ "$PREVIEW_CODE" -eq 200 ]; then
  echo -e "${GREEN}SUCCESS: Preview generated successfully (HTTP $PREVIEW_CODE)${NC}"
  # Extract and print row count and columns count using python helper
  python3 -c "
import json
d = json.loads('''$PREVIEW_BODY''')
m = d['metadata']
print(f'File Name: {m[\"fileName\"]}')
print(f'File Size: {m[\"fileSize\"]} bytes')
print(f'Row Count: {m[\"rowCount\"]}')
print(f'Column Count: {m[\"columnCount\"]}')
print(f'Headers: {m[\"headers\"]}')
"
else
  echo -e "${RED}FAILURE: Preview request failed with status $PREVIEW_CODE${NC}"
  echo "$PREVIEW_BODY"
fi

# 3. Import Pipeline Test
echo -e "\n[3/3] Testing AI Import Pipeline Endpoint (Messy Formats & Edge Cases)..."
IMPORT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/import" -F "file=@$CSV_FILE;type=text/csv")
IMPORT_CODE=$(echo "$IMPORT_RESPONSE" | tail -n1)
IMPORT_BODY=$(echo "$IMPORT_RESPONSE" | sed '$d')

if [ "$IMPORT_CODE" -eq 200 ]; then
  echo -e "${GREEN}SUCCESS: Import pipeline completed successfully (HTTP $IMPORT_CODE)${NC}"
  
  # Write the response to a file for review
  echo "$IMPORT_BODY" > tests/last_exhaustive_response.json
  
  # Print high-level metrics and verification details
  python3 -c "
import json
d = json.loads('''$IMPORT_BODY''')
m = d['metrics']
print(f'==================================================')
print(f'📊 METRICS SUMMARY')
print(f'==================================================')
print(f'Imported count: {m[\"importedCount\"]}')
print(f'Skipped count: {m[\"skippedCount\"]}')
print(f'Success rate: {m[\"successRate\"]}%')
print(f'Processing time: {m[\"processingTimeMs\"]}ms')

print(f'\n==================================================')
print(f'🕵️‍♀️ VERIFYING TARGET CONSTRAINTS & EDGE CASES')
print(f'==================================================')
print(f'1. DD.MM.YYYY Date -> {d[\"importedRecords\"][0][\"created_at\"]}')
print(f'2. ISO with Slash Date -> {d[\"importedRecords\"][1][\"created_at\"]}')
print(f'3. Epoch Date -> {d[\"importedRecords\"][2][\"created_at\"]}')
print(f'4. DD/MM/YYYY Date -> {d[\"importedRecords\"][5][\"created_at\"]}')
print(f'5. Invalid Date Fallback -> {d[\"importedRecords\"][4][\"created_at\"]}')

print(f'\n6. Formula Escaped Name (=) -> {d[\"importedRecords\"][6][\"name\"]}')
print(f'7. Formula Escaped Name (+) -> {d[\"importedRecords\"][7][\"name\"]}')
print(f'8. Formula Escaped Name (-) -> {d[\"importedRecords\"][8][\"name\"]}')
print(f'9. Formula Escaped Name (@) -> {d[\"importedRecords\"][9][\"name\"]}')

print(f'\n10. Uncorrupted Country Code -> {d[\"importedRecords\"][0][\"country_code\"]}')

print(f'\n11. Line Breaks Escaping -> Note: {repr(d[\"importedRecords\"][10][\"crm_note\"])}')
print(f'12. Skip Criteria Row 12 (Skipped Lead) -> Index: {d[\"skippedRecords\"][0][\"rowIndex\"]}, Reason: {d[\"skippedRecords\"][0][\"reason\"]}')

print(f'\n13. Multi Contact De-duplication -> Note: {d[\"importedRecords\"][13][\"crm_note\"]}')

print(f'\n14. Status Fuzzy Match did not connect -> Status: {d[\"importedRecords\"][14][\"crm_status\"]}')
print(f'15. Status Fuzzy Match junk -> Status: {d[\"importedRecords\"][15][\"crm_status\"]}')
print(f'16. Status Fuzzy Match sale -> Status: {d[\"importedRecords\"][16][\"crm_status\"]}')

print(f'\n17. Source Match sarjapur plots -> Source: {d[\"importedRecords\"][17][\"data_source\"]}')
print(f'18. Source Match eden park -> Source: {d[\"importedRecords\"][18][\"data_source\"]}')
print(f'19. Source Match invalid -> Source: {d[\"importedRecords\"][19][\"data_source\"]}')
"
else
  echo -e "${RED}FAILURE: Import pipeline failed with status $IMPORT_CODE${NC}"
  echo "$IMPORT_BODY"
fi
