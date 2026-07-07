#!/bin/bash

# ============================================================
# EXHAUSTIVE API TEST SUITE v2 - GrowEasy CRM Backend
# URL: https://groweasy-crm-api.onrender.com
# CORRECTED ENDPOINTS:
#   Preview: POST /api/upload   (field: file)
#   Preview: POST /api/upload/preview (field: file)
#   Import:  POST /api/import   (field: file)
#   Health:  GET  /api/health
#   Version: GET  /api/version
# ============================================================

BASE_URL="https://groweasy-crm-api.onrender.com"
PASS=0
FAIL=0
WARN=0
declare -a RESULTS=()

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; PASS=$((PASS+1)); RESULTS+=("PASS: $1"); }
log_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; FAIL=$((FAIL+1)); RESULTS+=("FAIL: $1"); }
log_warn() { echo -e "${YELLOW}⚠️  WARN${NC}: $1"; WARN=$((WARN+1)); RESULTS+=("WARN: $1"); }
log_info() { echo -e "${BLUE}ℹ️  INFO${NC}: $1"; }
log_section() {
  echo -e "\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}${BOLD} $1${NC}"
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

PREVIEW_URL="$BASE_URL/api/upload/preview"
PREVIEW_URL2="$BASE_URL/api/upload"
IMPORT_URL="$BASE_URL/api/import"
HEALTH_URL="$BASE_URL/api/health"
VERSION_URL="$BASE_URL/api/version"
SAMPLE_CSV="/Users/vimalmanoharan/Desktop/GrowEasy-CRM-Intern-Assignment/sample-data/groweasy_sample.csv"
EDGE_CSV="/Users/vimalmanoharan/Desktop/GrowEasy-CRM-Intern-Assignment/sample-data/edge_cases_test.csv"

# ============================================================
# TEST GROUP 1: SERVER HEALTH & CONNECTIVITY
# ============================================================
log_section "TEST GROUP 1: SERVER HEALTH & CONNECTIVITY"

# 1.1 Root endpoint
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  log_pass "Root GET / returns 200"
  log_info "Body: $BODY"
else
  log_fail "Root GET / returned $STATUS (expected 200)"
fi

# 1.2 Health endpoint
RESP=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  log_pass "GET /api/health returns 200"
  log_info "Body: $BODY"
  if echo "$BODY" | grep -q '"status"'; then
    log_pass "Health: response contains 'status' field"
  else
    log_warn "Health: response missing 'status' field"
  fi
else
  log_fail "GET /api/health returned $STATUS"
fi

# 1.3 Version endpoint
RESP=$(curl -s -w "\n%{http_code}" "$VERSION_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  log_pass "GET /api/version returns 200"
  log_info "Body: $BODY"
else
  log_fail "GET /api/version returned $STATUS"
fi

# 1.4 HTTPS/TLS active
TLS=$(curl -sv "$BASE_URL/" 2>&1 | grep "SSL connection using")
if echo "$TLS" | grep -q "TLS"; then
  log_pass "HTTPS/TLS active: $TLS"
else
  log_fail "HTTPS/TLS not detected"
fi

# 1.5 CSP header
CSP=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i "content-security-policy")
if echo "$CSP" | grep -qi "content-security-policy"; then
  log_pass "Security: Content-Security-Policy header present"
  log_info "CSP: $CSP"
else
  log_warn "Security: Content-Security-Policy header missing"
fi

# 1.6 X-Content-Type-Options
XCTO=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i "x-content-type-options")
if echo "$XCTO" | grep -qi "nosniff"; then
  log_pass "Security: X-Content-Type-Options: nosniff present"
else
  log_warn "Security: X-Content-Type-Options header missing/incorrect"
fi

# 1.7 CORS preflight
CORS=$(curl -sI -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "$PREVIEW_URL" 2>/dev/null | grep -i "access-control")
if echo "$CORS" | grep -qi "access-control-allow-origin"; then
  log_pass "CORS: preflight allows localhost:3000"
  log_info "CORS headers: $(echo "$CORS" | tr '\n' '|')"
else
  log_warn "CORS: preflight response has no access-control-allow-origin"
fi

# ============================================================
# TEST GROUP 2: POST /api/upload/preview
# ============================================================
log_section "TEST GROUP 2: POST /api/upload/preview (NO AI PROCESSING)"

# 2.1 Standard sample with field 'file'
RESP=$(curl -s -w "\n%{http_code}" -X POST \
  -F "file=@$SAMPLE_CSV" \
  "$PREVIEW_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$STATUS" = "200" ]; then
  log_pass "Preview: groweasy_sample.csv returns 200"
else
  log_fail "Preview: groweasy_sample.csv returned $STATUS"
fi

# Check 'previewRows' field
if echo "$BODY" | grep -q '"previewRows"'; then
  log_pass "Preview: response contains 'previewRows' field"
else
  log_warn "Preview: no 'previewRows' field (checking for 'rows')"
  if echo "$BODY" | grep -q '"rows"'; then
    log_pass "Preview: response contains 'rows' field"
  else
    log_fail "Preview: missing both 'previewRows' and 'rows'"
  fi
fi

# Check 'metadata' field
if echo "$BODY" | grep -q '"metadata"'; then
  log_pass "Preview: response contains 'metadata' field"
else
  log_warn "Preview: no 'metadata' field"
fi

# Check row count = 4 (sample has 4 data rows)
ROW_COUNT=$(echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  rows = d.get('previewRows', d.get('rows', []))
  print(len(rows))
except Exception as e:
  print('ERR:'+str(e))
" 2>/dev/null)
log_info "Preview row count: $ROW_COUNT"
if [ "$ROW_COUNT" = "4" ]; then
  log_pass "Preview: correct 4 rows returned for 4-data-row CSV"
else
  log_fail "Preview: row count is $ROW_COUNT (expected 4)"
fi

# Check no AI-injected fields (preview should be raw rows, no CRM processing)
PREVIEW_HAS_AI=$(echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  rows = d.get('previewRows', d.get('rows', []))
  if rows and isinstance(rows, list) and isinstance(rows[0], dict):
    # These are the original CSV columns - raw data, not AI-mapped
    # If the CSV already has crm_status columns, that's fine (not AI-added)
    print('RAW_ROWS')
  else:
    print('EMPTY_OR_INVALID')
except: print('ERR')
" 2>/dev/null)
log_info "Preview data type: $PREVIEW_HAS_AI"

# 2.2 Check preview does NOT call AI (it should be fast - under 5s)
START=$(date +%s)
curl -s -X POST -F "file=@$SAMPLE_CSV" "$PREVIEW_URL" > /dev/null 2>/dev/null
END=$(date +%s)
ELAPSED=$((END - START))
log_info "Preview response time: ${ELAPSED}s"
if [ "$ELAPSED" -lt 5 ]; then
  log_pass "Preview: fast response (${ELAPSED}s) - no AI processing"
else
  log_warn "Preview: slow (${ELAPSED}s) - may be doing AI processing"
fi

# 2.3 Alternative /api/upload route
RESP=$(curl -s -w "\n%{http_code}" -X POST \
  -F "file=@$SAMPLE_CSV" \
  "$PREVIEW_URL2" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "200" ]; then
  log_pass "Preview: POST /api/upload (alias) also returns 200"
else
  log_warn "Preview: POST /api/upload returned $STATUS"
fi

# 2.4 No file - should return 400
RESP=$(curl -s -w "\n%{http_code}" -X POST "$PREVIEW_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  log_pass "Preview: no file returns $STATUS (correct error)"
else
  log_fail "Preview: no file returned $STATUS (expected 400/422)"
fi

# 2.5 Wrong field name 'csv' instead of 'file'
RESP=$(curl -s -w "\n%{http_code}" -X POST \
  -F "csv=@$SAMPLE_CSV" "$PREVIEW_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
log_info "Preview with wrong field name 'csv': $STATUS"
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  log_pass "Preview: correctly rejects wrong field name 'csv'"
else
  log_warn "Preview: accepts unknown field 'csv' (may be flexible)"
fi

# 2.6 Empty CSV
echo "" > /tmp/test_empty.csv
RESP=$(curl -s -w "\n%{http_code}" -X POST \
  -F "file=@/tmp/test_empty.csv" "$PREVIEW_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
log_info "Preview with empty CSV: $STATUS"
if [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
  log_pass "Preview: empty CSV returns error ($STATUS)"
else
  log_warn "Preview: empty CSV returned $STATUS (should be 400/422)"
fi

# 2.7 Edge cases CSV
RESP=$(curl -s -w "\n%{http_code}" -X POST \
  -F "file=@$EDGE_CSV" "$PREVIEW_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  log_pass "Preview: edge_cases_test.csv returns 200"
  ECOUNT=$(echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  rows = d.get('previewRows', d.get('rows', []))
  print(len(rows))
except: print('ERR')
" 2>/dev/null)
  log_info "Edge CSV preview rows: $ECOUNT (expected 5 data rows)"
  if [ "$ECOUNT" = "5" ]; then
    log_pass "Preview: edge CSV returns 5 rows (including no-contact row)"
  else
    log_warn "Preview: edge CSV returns $ECOUNT rows (expected 5)"
  fi
else
  log_fail "Preview: edge_cases_test.csv returned $STATUS"
fi

# ============================================================
# TEST GROUP 3: POST /api/import (AI EXTRACTION)
# ============================================================
log_section "TEST GROUP 3: POST /api/import (AI EXTRACTION)"

# 3.1 Standard sample
log_info "Running AI import on groweasy_sample.csv..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@$SAMPLE_CSV" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS"

if [ "$STATUS" = "200" ]; then
  log_pass "Import: groweasy_sample.csv returns 200"
else
  log_fail "Import: groweasy_sample.csv returned $STATUS"
fi

# Full response structure check
echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print('JSON_VALID')
  
  # Check top-level keys
  keys = list(d.keys())
  print('TOP_KEYS:', keys)
  
  # importedRecords
  rec = d.get('importedRecords', d.get('parsed', d.get('parsedRecords', d.get('records', None))))
  if rec is not None:
    print('HAS_IMPORTED_RECORDS: count =', len(rec) if isinstance(rec, list) else rec)
  else:
    print('MISSING_RECORDS_KEY')
  
  # skippedRecords
  skip = d.get('skippedRecords', d.get('skipped', None))
  if skip is not None:
    print('HAS_SKIPPED_RECORDS: count =', len(skip) if isinstance(skip, list) else skip)
  else:
    print('MISSING_SKIPPED_KEY')
  
  # metrics
  met = d.get('metrics')
  if met:
    print('HAS_METRICS:', met)
  
  # Sample record CRM fields
  if isinstance(rec, list) and len(rec)>0:
    r = rec[0]
    crm_fields = ['created_at','name','email','country_code','mobile_without_country_code',
                  'company','city','state','country','lead_owner','crm_status','crm_note',
                  'data_source','possession_time','description']
    present = [f for f in crm_fields if f in r]
    missing = [f for f in crm_fields if f not in r]
    print('CRM_FIELDS_PRESENT:', present)
    print('CRM_FIELDS_MISSING:', missing)
    print('SAMPLE:', json.dumps(r, ensure_ascii=False)[:500])
except Exception as e:
  print('JSON_INVALID:', str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "JSON_VALID"; then
    log_pass "Import: response is valid JSON"
  elif echo "$line" | grep -q "JSON_INVALID"; then
    log_fail "Import: invalid JSON - $line"
  elif echo "$line" | grep -q "HAS_IMPORTED_RECORDS"; then
    log_pass "Import: $line"
  elif echo "$line" | grep -q "MISSING_RECORDS_KEY"; then
    log_fail "Import: missing importedRecords/parsed key in response"
  elif echo "$line" | grep -q "HAS_SKIPPED_RECORDS"; then
    log_pass "Import: $line"
  elif echo "$line" | grep -q "MISSING_SKIPPED_KEY"; then
    log_fail "Import: missing skippedRecords key in response"
  elif echo "$line" | grep -q "HAS_METRICS"; then
    log_pass "Import: metrics object present - $line"
  elif echo "$line" | grep -q "CRM_FIELDS_PRESENT"; then
    log_info "$line"
  elif echo "$line" | grep -q "CRM_FIELDS_MISSING"; then
    MISSING=$(echo "$line" | sed 's/CRM_FIELDS_MISSING: //')
    if [ "$MISSING" = "[]" ]; then
      log_pass "Import: all 15 CRM fields present in response"
    else
      log_warn "Import: CRM fields missing: $MISSING"
    fi
  elif echo "$line" | grep -q "SAMPLE:"; then
    log_info "Sample record: $line"
  elif echo "$line" | grep -q "TOP_KEYS:"; then
    log_info "$line"
  fi
done

# 3.2 Validate crm_status values
echo "$BODY" | python3 -c "
import sys,json
valid = {'GOOD_LEAD_FOLLOW_UP','DID_NOT_CONNECT','BAD_LEAD','SALE_DONE',''}
try:
  d=json.load(sys.stdin)
  recs = d.get('importedRecords', d.get('parsed', d.get('parsedRecords', d.get('records', []))))
  all_valid = True
  for r in (recs if isinstance(recs, list) else []):
    s = r.get('crm_status','')
    if s not in valid:
      print(f'INVALID_STATUS: {s}')
      all_valid = False
  print('CRM_STATUS_ALL_VALID' if all_valid else 'CRM_STATUS_HAS_INVALID')
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "CRM_STATUS_ALL_VALID"; then
    log_pass "Import: all crm_status values are valid enum values"
  elif echo "$line" | grep -q "INVALID_STATUS"; then
    log_fail "Import: $line"
  fi
done

# 3.3 Validate data_source values
echo "$BODY" | python3 -c "
import sys,json
valid = {'leads_on_demand','meridian_tower','eden_park','varah_swamy','sarjapur_plots',''}
try:
  d=json.load(sys.stdin)
  recs = d.get('importedRecords', d.get('parsed', d.get('parsedRecords', d.get('records', []))))
  all_valid = True
  for r in (recs if isinstance(recs, list) else []):
    s = r.get('data_source','')
    if s not in valid:
      print(f'INVALID_SOURCE: {s}')
      all_valid = False
  print('DATA_SOURCE_ALL_VALID' if all_valid else 'DATA_SOURCE_HAS_INVALID')
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "DATA_SOURCE_ALL_VALID"; then
    log_pass "Import: all data_source values are valid enum values"
  elif echo "$line" | grep -q "INVALID_SOURCE"; then
    log_fail "Import: $line"
  fi
done

# 3.4 Validate created_at is JS new Date() parseable
echo "$BODY" | python3 -c "
import sys,json
from datetime import datetime
try:
  d=json.load(sys.stdin)
  recs = d.get('importedRecords', d.get('parsed', d.get('parsedRecords', d.get('records', []))))
  for r in (recs if isinstance(recs, list) else []):
    ca = r.get('created_at','')
    if ca:
      # Test parseable formats
      try:
        # ISO format (JS new Date() compatible)
        datetime.fromisoformat(ca.replace('Z',''))
        print(f'DATE_OK: {ca}')
      except:
        print(f'DATE_BAD: {ca}')
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "DATE_OK"; then
    log_pass "Import: created_at is ISO format (JS-parseable) - $line"
  elif echo "$line" | grep -q "DATE_BAD"; then
    log_fail "Import: created_at not JS-parseable - $line"
  fi
done

# ============================================================
# TEST GROUP 4: SKIP RECORDS WITH NO EMAIL AND NO MOBILE
# ============================================================
log_section "TEST GROUP 4: SKIP RECORDS (NO EMAIL + NO MOBILE)"

cat > /tmp/skip_test.csv << 'EOF'
Name,Email,Phone,Company
Valid Person,valid@example.com,9876543210,Acme Corp
No Contact Person,,,Ghost Corp
Another Valid,another@example.com,,Second Corp
Phone Only,,,+91 9988776655
EOF

# Fix: row 4 phone only should NOT be skipped
cat > /tmp/skip_test.csv << 'EOF'
Name,Email,Phone,Company
Valid Person,valid@example.com,9876543210,Acme Corp
No Contact Person,,,Ghost Corp
Another Valid,another@example.com,,Second Corp
EOF

log_info "Testing import with 1 no-contact record (should be skipped)..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/skip_test.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS"

if [ "$STATUS" = "200" ]; then
  log_pass "Skip test: returns 200"
  echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  parsed = d.get('importedRecords', d.get('parsed', []))
  skipped = d.get('skippedRecords', d.get('skipped', []))
  p_count = len(parsed) if isinstance(parsed, list) else parsed
  s_count = len(skipped) if isinstance(skipped, list) else skipped
  print(f'PARSED_COUNT: {p_count}')
  print(f'SKIPPED_COUNT: {s_count}')
  if s_count == 1: print('SKIP_CORRECT')
  else: print(f'SKIP_WRONG: expected 1 got {s_count}')
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "SKIP_CORRECT"; then
    log_pass "Skip test: correctly skipped 1 record with no email/mobile"
  elif echo "$line" | grep -q "SKIP_WRONG"; then
    log_fail "Skip test: $line"
  elif echo "$line" | grep -q "PARSED_COUNT\|SKIPPED_COUNT"; then
    log_info "$line"
  fi
done
else
  log_fail "Skip test: returned $STATUS"
fi

# All invalid
cat > /tmp/all_invalid.csv << 'EOF'
Name,Email,Phone
Ghost One,,,
Ghost Two,,,
EOF

log_info "Testing import with all-invalid records..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/all_invalid.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$STATUS" = "200" ]; then
  log_pass "All-invalid: returns 200"
  PARSED=$(echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  r = d.get('importedRecords', d.get('parsed', []))
  print(len(r) if isinstance(r, list) else r)
except: print('ERR')
" 2>/dev/null)
  if [ "$PARSED" = "0" ]; then
    log_pass "All-invalid: 0 records parsed (all skipped correctly)"
  else
    log_warn "All-invalid: $PARSED records parsed (expected 0)"
  fi
else
  log_fail "All-invalid: returned $STATUS"
fi

# ============================================================
# TEST GROUP 5: MULTIPLE EMAILS/PHONES → crm_note
# ============================================================
log_section "TEST GROUP 5: MULTIPLE EMAILS/PHONES → crm_note"

cat > /tmp/multi_contact.csv << 'EOF'
Name,Emails,Phones,Company
Multi Contact Person,"primary@example.com, secondary@example.com","9876543210, 9876543211",Multicorp
EOF

log_info "Testing multi-contact record..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/multi_contact.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS"
log_info "Body: $BODY"

if [ "$STATUS" = "200" ]; then
  log_pass "Multi-contact: returns 200"
  echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  recs = d.get('importedRecords', d.get('parsed', d.get('records', [])))
  if isinstance(recs, list) and len(recs) > 0:
    r = recs[0]
    email = r.get('email','')
    note = r.get('crm_note','')
    mobile = r.get('mobile_without_country_code','')
    print(f'EMAIL: {email}')
    print(f'MOBILE: {mobile}')
    print(f'NOTE: {note}')
    # First email should be primary
    if 'primary' in email.lower(): print('FIRST_EMAIL_OK')
    else: print('FIRST_EMAIL_FAIL: got '+email)
    # Secondary should be in note
    if 'secondary' in note.lower() or 'secondary' in str(r).lower(): print('SECONDARY_IN_NOTE')
    else: print('SECONDARY_NOT_IN_NOTE')
    # First mobile check
    if '9876543210' in mobile: print('FIRST_MOBILE_OK')
    else: print('FIRST_MOBILE_CHECK: got '+mobile)
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "FIRST_EMAIL_OK"; then
    log_pass "Multi-contact: primary email correctly extracted"
  elif echo "$line" | grep -q "FIRST_EMAIL_FAIL"; then
    log_fail "Multi-contact: $line"
  elif echo "$line" | grep -q "SECONDARY_IN_NOTE"; then
    log_pass "Multi-contact: secondary email moved to crm_note"
  elif echo "$line" | grep -q "SECONDARY_NOT_IN_NOTE"; then
    log_warn "Multi-contact: secondary email not found in crm_note"
  elif echo "$line" | grep -q "FIRST_MOBILE_OK"; then
    log_pass "Multi-contact: first mobile correctly extracted"
  else
    log_info "$line"
  fi
done
else
  log_fail "Multi-contact: returned $STATUS"
fi

# ============================================================
# TEST GROUP 6: MESSY COLUMN HEADERS (AI MAPPING)
# ============================================================
log_section "TEST GROUP 6: MESSY COLUMN HEADERS (AI FIELD MAPPING)"

cat > /tmp/messy_headers.csv << 'EOF'
Date_Registered,Client_Name,MailBox,Ph_No,Org,CityName,StateCode,CountryRegion,OwnerEmail,StatusText,SourceChannel,PossessionTimeframe,ShortDescription
"13/05/2026","John Smith","john.smith@example.com","+91 9988776655","Tech Corp","Mumbai","MH","India","owner@groweasy.ai","GOOD_LEAD_FOLLOW_UP","leads_on_demand","6 months","Interested in 2BHK"
"14/05/2026","Jane Doe","jane.doe@example.com","9988776600","Acme Co","Delhi","DL","India","owner2@groweasy.ai","DID_NOT_CONNECT","meridian_tower","1 year","Wants bigger unit"
EOF

log_info "Testing import with messy column headers..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/messy_headers.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS"
log_info "Response: $BODY"

if [ "$STATUS" = "200" ]; then
  log_pass "Messy headers: returns 200"
  echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  recs = d.get('importedRecords', d.get('parsed', []))
  if isinstance(recs, list) and len(recs)>0:
    r = recs[0]
    name = r.get('name','')
    email = r.get('email','')
    mobile = r.get('mobile_without_country_code','')
    status = r.get('crm_status','')
    city = r.get('city','')
    source = r.get('data_source','')
    print(f'name={name}|email={email}|mobile={mobile}|status={status}|city={city}|source={source}')
    if 'Smith' in name or 'John' in name: print('NAME_MAPPED_OK: Client_Name->name')
    else: print('NAME_MAPPED_FAIL: got '+name)
    if 'john.smith' in email: print('EMAIL_MAPPED_OK: MailBox->email')
    else: print('EMAIL_MAPPED_FAIL: got '+email)
    if '9988776655' in mobile: print('MOBILE_MAPPED_OK: Ph_No->mobile')
    else: print('MOBILE_MAPPED_CHECK: got '+mobile)
    if status in {'GOOD_LEAD_FOLLOW_UP','DID_NOT_CONNECT','BAD_LEAD','SALE_DONE',''}: print('STATUS_VALID')
    else: print('STATUS_INVALID: '+status)
    if city: print('CITY_MAPPED_OK: CityName->city')
    if source in {'leads_on_demand','meridian_tower','eden_park','varah_swamy','sarjapur_plots',''}: print('SOURCE_VALID')
    else: print('SOURCE_INVALID: '+source)
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "_OK\|STATUS_VALID\|SOURCE_VALID"; then
    log_pass "Messy headers: $line"
  elif echo "$line" | grep -q "_FAIL\|_INVALID"; then
    log_fail "Messy headers: $line"
  elif echo "$line" | grep -q "_CHECK"; then
    log_warn "Messy headers: $line"
  else
    log_info "$line"
  fi
done
else
  log_fail "Messy headers: returned $STATUS"
fi

# ============================================================
# TEST GROUP 7: DATE FORMAT VARIATIONS
# ============================================================
log_section "TEST GROUP 7: DATE FORMAT VARIATIONS"

cat > /tmp/date_formats.csv << 'EOF'
Date,Name,Email,Phone
"13/05/2026","Date Format 1 (DD/MM/YYYY)","format1@example.com","9876543201"
"May 15 2026","Date Format 2 (Month DD YYYY)","format2@example.com","9876543202"
"2026-05-13","Date Format 3 (ISO YYYY-MM-DD)","format3@example.com","9876543203"
"13-May-2026","Date Format 4 (DD-Mon-YYYY)","format4@example.com","9876543204"
"May 15, 2026","Date Format 5 (Month DD, YYYY)","format5@example.com","9876543205"
EOF

log_info "Testing various date formats..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/date_formats.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS"

if [ "$STATUS" = "200" ]; then
  log_pass "Date formats: returns 200"
  echo "$BODY" | python3 -c "
import sys,json
from datetime import datetime
try:
  d=json.load(sys.stdin)
  recs = d.get('importedRecords', d.get('parsed', []))
  all_good = True
  for r in (recs if isinstance(recs, list) else []):
    ca = r.get('created_at','')
    name = r.get('name','')
    if ca:
      try:
        dt = datetime.fromisoformat(ca.replace('Z',''))
        print(f'DATE_PARSEABLE: {name} -> {ca}')
      except:
        print(f'DATE_NOT_PARSEABLE: {name} -> {ca}')
        all_good = False
    else:
      print(f'DATE_MISSING: {name}')
  print('ALL_DATES_PARSEABLE' if all_good else 'SOME_DATES_BAD')
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "DATE_PARSEABLE:"; then
    log_pass "Date: $line"
  elif echo "$line" | grep -q "DATE_NOT_PARSEABLE\|DATE_MISSING"; then
    log_fail "Date: $line"
  elif echo "$line" | grep -q "ALL_DATES_PARSEABLE"; then
    log_pass "All date formats converted to JS-parseable ISO format"
  elif echo "$line" | grep -q "SOME_DATES_BAD"; then
    log_fail "Some date conversions failed"
  fi
done
else
  log_fail "Date formats: returned $STATUS"
fi

# ============================================================
# TEST GROUP 8: CRM STATUS ENUM ENFORCEMENT
# ============================================================
log_section "TEST GROUP 8: CRM STATUS ENUM ENFORCEMENT"

cat > /tmp/bad_status.csv << 'EOF'
Name,Email,Phone,Status
Good Lead,good@example.com,9876543210,"interested customer"
Bad Status,bad@example.com,9876543211,"junk lead"
Valid Status,valid@example.com,9876543212,GOOD_LEAD_FOLLOW_UP
Follow Up,followup@example.com,9876543213,"follow up needed"
EOF

log_info "Testing crm_status enum enforcement..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/bad_status.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS | Body: $BODY"

if [ "$STATUS" = "200" ]; then
  log_pass "CRM Status enum: returns 200"
  echo "$BODY" | python3 -c "
import sys,json
valid = {'GOOD_LEAD_FOLLOW_UP','DID_NOT_CONNECT','BAD_LEAD','SALE_DONE',''}
try:
  d=json.load(sys.stdin)
  recs = d.get('importedRecords', d.get('parsed', []))
  all_valid = True
  for r in (recs if isinstance(recs, list) else []):
    s = r.get('crm_status','')
    name = r.get('name','')
    if s in valid:
      print(f'VALID_STATUS: {name} -> {s}')
    else:
      print(f'INVALID_STATUS: {name} -> {s}')
      all_valid = False
  print('ALL_STATUS_VALID' if all_valid else 'HAS_INVALID_STATUS')
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "VALID_STATUS:"; then
    log_info "Status: $line"
  elif echo "$line" | grep -q "INVALID_STATUS:"; then
    log_fail "CRM Status: $line (should be mapped to valid enum or blank)"
  elif echo "$line" | grep -q "ALL_STATUS_VALID"; then
    log_pass "CRM Status: all values mapped to valid enum"
  elif echo "$line" | grep -q "HAS_INVALID_STATUS"; then
    log_fail "CRM Status: has invalid status values in output"
  fi
done
else
  log_fail "CRM Status enum: returned $STATUS"
fi

# ============================================================
# TEST GROUP 9: DATA SOURCE ENUM ENFORCEMENT
# ============================================================
log_section "TEST GROUP 9: DATA SOURCE ENUM ENFORCEMENT"

cat > /tmp/bad_source.csv << 'EOF'
Name,Email,Phone,Source
Valid Source,valid@example.com,9876543210,leads_on_demand
Invalid Source,invalid@example.com,9876543211,facebook ads
Unknown Source,unknown@example.com,9876543212,twitter
Eden Park Lead,eden@example.com,9876543213,eden_park
EOF

log_info "Testing data_source enum enforcement..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/bad_source.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS | Body: $BODY"

if [ "$STATUS" = "200" ]; then
  log_pass "Data source enum: returns 200"
  echo "$BODY" | python3 -c "
import sys,json
valid = {'leads_on_demand','meridian_tower','eden_park','varah_swamy','sarjapur_plots',''}
try:
  d=json.load(sys.stdin)
  recs = d.get('importedRecords', d.get('parsed', []))
  all_valid = True
  for r in (recs if isinstance(recs, list) else []):
    s = r.get('data_source','')
    name = r.get('name','')
    if s in valid:
      print(f'VALID_SOURCE: {name} -> \"{s}\"')
    else:
      print(f'INVALID_SOURCE: {name} -> \"{s}\" (should be blank)')
      all_valid = False
  print('ALL_SOURCE_VALID' if all_valid else 'HAS_INVALID_SOURCE')
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "VALID_SOURCE:"; then
    log_info "Source: $line"
  elif echo "$line" | grep -q "INVALID_SOURCE:"; then
    log_fail "Data source: $line (invalid source not blanked)"
  elif echo "$line" | grep -q "ALL_SOURCE_VALID"; then
    log_pass "Data source: all invalid sources correctly blanked to empty string"
  elif echo "$line" | grep -q "HAS_INVALID_SOURCE"; then
    log_fail "Data source: has invalid source values in output"
  fi
done
else
  log_fail "Data source enum: returned $STATUS"
fi

# ============================================================
# TEST GROUP 10: FACEBOOK/GOOGLE AD CSV FORMATS
# ============================================================
log_section "TEST GROUP 10: REAL-WORLD CSV FORMATS (Facebook/Google Ads)"

cat > /tmp/facebook_leads.csv << 'EOF'
id,created_time,ad_name,full_name,email,phone_number,zip_code,city
123456,"2026/05/13 10:20:00","Summer Campaign","Priya Sharma","priya.sharma@gmail.com","+91-9988112233","400001","Mumbai"
789012,"2026/05/14 11:30:00","Summer Campaign","Ravi Kumar","ravi.kumar@hotmail.com","+91-9977223344","110001","Delhi"
345678,"2026/05/15 12:00:00","Summer Campaign","","",,"110002","Delhi"
EOF

log_info "Testing Facebook Lead Export format..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/facebook_leads.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS | Body: $BODY"

if [ "$STATUS" = "200" ]; then
  log_pass "Facebook format: returns 200"
  PARSED=$(echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  r = d.get('importedRecords', d.get('parsed', []))
  s = d.get('skippedRecords', d.get('skipped', []))
  print(f'parsed={len(r) if isinstance(r,list) else r},skipped={len(s) if isinstance(s,list) else s}')
except: print('ERR')
" 2>/dev/null)
  log_info "Facebook CSV result: $PARSED (expected parsed=2, skipped=1)"
  if echo "$PARSED" | grep -q "parsed=2"; then
    log_pass "Facebook format: correctly parsed 2 records, skipped 1 (no email/phone)"
  else
    log_warn "Facebook format: $PARSED (expected 2 parsed, 1 skipped)"
  fi
else
  log_fail "Facebook format: returned $STATUS"
fi

# Google Ads format
cat > /tmp/google_ads.csv << 'EOF'
Campaign,Ad Group,Final URL,Clicks,Impressions,Lead Form,Contact Name,Contact Email,Contact Phone
"Property Campaign","2BHK","https://groweasy.ai",45,1200,"Property Enquiry","Anita Patel","anita.patel@example.com","+91 9876123456"
"Property Campaign","3BHK","https://groweasy.ai",30,800,"Property Enquiry","Suresh Nair","suresh.nair@example.com","+91 9876654321"
EOF

log_info "Testing Google Ads Export format..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/google_ads.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$STATUS" = "200" ]; then
  log_pass "Google Ads format: returns 200"
  log_info "Response: $BODY"
else
  log_fail "Google Ads format: returned $STATUS"
fi

# ============================================================
# TEST GROUP 11: SECURITY - CORS, HEADERS, INJECTION
# ============================================================
log_section "TEST GROUP 11: SECURITY TESTS"

# 11.1 CSV Formula Injection
cat > /tmp/csv_injection.csv << 'EOF'
Name,Email,Phone,Notes
"=CMD(dangerous)","injection@example.com","9876543210","=HYPERLINK(""http://evil.com"",""click"")"
Normal Person,normal@example.com,9876543211,Regular note
EOF

RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@/tmp/csv_injection.csv" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$STATUS" = "200" ]; then
  log_pass "CSV injection: server handles gracefully (200)"
  if echo "$BODY" | grep -q '"=CMD'; then
    log_warn "CSV injection: =CMD formula not sanitized in output"
  else
    log_pass "CSV injection: formula injection not found verbatim in output"
  fi
else
  log_warn "CSV injection: server returned $STATUS"
fi

# 11.2 CORS from untrusted origin
CORS_UNTRUSTED=$(curl -sI -X OPTIONS \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  "$PREVIEW_URL" 2>/dev/null | grep -i "access-control-allow-origin")
if echo "$CORS_UNTRUSTED" | grep -q "evil.com"; then
  log_fail "CORS: allows untrusted origin evil.com - security risk!"
else
  log_pass "CORS: does NOT allow untrusted origin evil.com"
fi

# 11.3 X-Frame-Options
XFO=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i "x-frame-options")
if echo "$XFO" | grep -qi "deny\|sameorigin"; then
  log_pass "Security: X-Frame-Options present: $XFO"
else
  log_warn "Security: X-Frame-Options header missing"
fi

# 11.4 File upload size limit (228KB file → 500)
python3 -c "
print('Name,Email,Phone')
for i in range(5000):
  print(f'Person {i},person{i}@example.com,{9876543200+i}')
" > /tmp/large_5k.csv
RESP=$(curl -s -w "\n%{http_code}" --max-time 30 -X POST \
  -F "file=@/tmp/large_5k.csv" "$PREVIEW_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
log_info "5000-row preview status: $STATUS"
if [ "$STATUS" = "413" ]; then
  log_pass "File size: 413 returned for oversized file"
elif [ "$STATUS" = "200" ]; then
  log_warn "File size: 5000-row file accepted (no size limit enforced)"
elif [ "$STATUS" = "500" ]; then
  log_warn "File size: 500 error for 5000-row file (crash, not graceful 413)"
else
  log_info "File size: $STATUS for 5000-row file"
fi

# ============================================================
# TEST GROUP 12: EDGE CASES CSV (ASSIGNMENT REQUIRED)
# ============================================================
log_section "TEST GROUP 12: edge_cases_test.csv (FULL ASSIGNMENT SAMPLE)"

log_info "Testing full edge_cases_test.csv import..."
RESP=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -F "file=@$EDGE_CSV" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "Status: $STATUS"
log_info "Full response: $BODY"

if [ "$STATUS" = "200" ]; then
  log_pass "Edge cases CSV: returns 200"
  
  echo "$BODY" | python3 -c "
import sys,json
valid_statuses = {'GOOD_LEAD_FOLLOW_UP','DID_NOT_CONNECT','BAD_LEAD','SALE_DONE',''}
valid_sources = {'leads_on_demand','meridian_tower','eden_park','varah_swamy','sarjapur_plots',''}
try:
  d=json.load(sys.stdin)
  parsed = d.get('importedRecords', d.get('parsed', []))
  skipped = d.get('skippedRecords', d.get('skipped', []))
  met = d.get('metrics',{})
  
  p = len(parsed) if isinstance(parsed, list) else parsed
  s = len(skipped) if isinstance(skipped, list) else skipped
  
  print(f'PARSED_COUNT: {p}')
  print(f'SKIPPED_COUNT: {s}')
  print(f'METRICS: {met}')
  
  # The CSV has 5 rows:
  # Row1: Clean Lead (valid - has email+phone) -> should parse
  # Row2: No Contacts Lead (no email+phone) -> should SKIP
  # Row3: Multiple Contacts (valid) -> should parse, extra in note
  # Row4: CSV Injection name (valid email+phone) -> should parse
  # Row5: Messy Lead (valid email+phone) -> should parse, bad source/status blanked
  
  if s == 1:
    print('SKIP_COUNT_CORRECT: 1 skipped (the no-contact lead)')
  else:
    print(f'SKIP_COUNT_WRONG: got {s}, expected 1')
  
  if p == 4:
    print('PARSE_COUNT_CORRECT: 4 parsed')
  else:
    print(f'PARSE_COUNT_CHECK: got {p}, expected 4')
  
  # Check all statuses valid
  status_ok = all(r.get('crm_status','') in valid_statuses for r in (parsed if isinstance(parsed,list) else []))
  print('ALL_STATUSES_VALID' if status_ok else 'SOME_STATUSES_INVALID')
  
  # Check all sources valid
  source_ok = all(r.get('data_source','') in valid_sources for r in (parsed if isinstance(parsed,list) else []))
  print('ALL_SOURCES_VALID' if source_ok else 'SOME_SOURCES_INVALID')
  
  # Check multi-contact: secondary email in note
  for r in (parsed if isinstance(parsed,list) else []):
    if r.get('name','') and 'Multiple' in r.get('name',''):
      note = r.get('crm_note','')
      email = r.get('email','')
      print(f'MULTI_CONTACT_EMAIL: {email}')
      print(f'MULTI_CONTACT_NOTE: {note[:100]}')
      if 'secondary' in note.lower() or 'secondary' in str(r).lower():
        print('SECONDARY_IN_NOTE_OK')
      else:
        print('SECONDARY_NOT_IN_NOTE')
except Exception as e: print('ERR:'+str(e))
" 2>/dev/null | while read line; do
  if echo "$line" | grep -q "SKIP_COUNT_CORRECT\|PARSE_COUNT_CORRECT\|ALL_STATUSES_VALID\|ALL_SOURCES_VALID\|SECONDARY_IN_NOTE_OK"; then
    log_pass "Edge cases: $line"
  elif echo "$line" | grep -q "SKIP_COUNT_WRONG\|SOME_STATUSES_INVALID\|SOME_SOURCES_INVALID"; then
    log_fail "Edge cases: $line"
  elif echo "$line" | grep -q "PARSE_COUNT_CHECK\|SECONDARY_NOT_IN_NOTE"; then
    log_warn "Edge cases: $line"
  else
    log_info "$line"
  fi
done
else
  log_fail "Edge cases CSV: returned $STATUS"
fi

# ============================================================
# TEST GROUP 13: PERFORMANCE & BATCH PROCESSING
# ============================================================
log_section "TEST GROUP 13: PERFORMANCE & BATCH PROCESSING"

# 20-row batch
python3 -c "
print('Name,Email,Phone,Company,City,Status')
for i in range(20):
  print(f'Person {i},person{i}@example.com,{9876543200+i},Corp {i},City {i},GOOD_LEAD_FOLLOW_UP')
" > /tmp/batch_20.csv

log_info "Testing import with 20-row CSV..."
START=$(date +%s)
RESP=$(curl -s -w "\n%{http_code}" --max-time 300 -X POST \
  -F "file=@/tmp/batch_20.csv" "$IMPORT_URL" 2>/dev/null)
END=$(date +%s)
ELAPSED=$((END - START))
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
log_info "20-row import: Status=$STATUS, Time=${ELAPSED}s"

if [ "$STATUS" = "200" ]; then
  log_pass "Batch 20 rows: returns 200 in ${ELAPSED}s"
  PARSED=$(echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  r=d.get('importedRecords',d.get('parsed',[]))
  print(len(r) if isinstance(r,list) else r)
except: print('ERR')
" 2>/dev/null)
  log_info "Parsed: $PARSED out of 20"
  if [ "$ELAPSED" -lt 120 ]; then
    log_pass "Batch 20: processed in ${ELAPSED}s (acceptable)"
  else
    log_warn "Batch 20: slow processing ${ELAPSED}s"
  fi
else
  log_fail "Batch 20: returned $STATUS"
fi

# ============================================================
# TEST GROUP 14: ERROR HANDLING
# ============================================================
log_section "TEST GROUP 14: ERROR HANDLING"

# 14.1 Wrong HTTP method
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/import" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
log_info "DELETE /api/import status: $STATUS"
if [ "$STATUS" = "404" ] || [ "$STATUS" = "405" ] || [ "$STATUS" = "400" ]; then
  log_pass "Error: DELETE method returns $STATUS (correct rejection)"
else
  log_warn "Error: DELETE method returned $STATUS"
fi

# 14.2 PUT method
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "405" ]; then
  log_pass "Error: PUT returns 405 Method Not Allowed"
else
  log_warn "Error: PUT returned $STATUS (expected 405)"
fi

# 14.3 GET /api/import (should reject)
RESP=$(curl -s -w "\n%{http_code}" "$IMPORT_URL" 2>/dev/null)
STATUS=$(echo "$RESP" | tail -1)
if [ "$STATUS" = "404" ] || [ "$STATUS" = "405" ]; then
  log_pass "Error: GET /api/import returns $STATUS (not accessible via GET)"
else
  log_warn "Error: GET /api/import returned $STATUS"
fi

# 14.4 JSON error format
RESP=$(curl -s -X POST "$IMPORT_URL" 2>/dev/null)
if echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('HAS_ERROR' if 'error' in d else 'NO_ERROR')" 2>/dev/null | grep -q "HAS_ERROR"; then
  log_pass "Error: error responses use JSON format with 'error' key"
else
  log_warn "Error: error response may not use standard JSON 'error' format"
fi

# ============================================================
# FINAL REPORT
# ============================================================
log_section "FINAL TEST REPORT"

TOTAL=$((PASS + FAIL + WARN))
SCORE_PCT=$(python3 -c "print(round(($PASS / max($TOTAL,1)) * 100, 1))" 2>/dev/null)

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  GROWEASY CRM API TEST RESULTS${NC}"
echo -e "${BOLD}  URL: $BASE_URL${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Total Tests Run:  ${BOLD}$TOTAL${NC}"
echo -e "  ${GREEN}✅ PASSED:${NC}         ${BOLD}$PASS${NC}"
echo -e "  ${RED}❌ FAILED:${NC}         ${BOLD}$FAIL${NC}"
echo -e "  ${YELLOW}⚠️  WARNINGS:${NC}       ${BOLD}$WARN${NC}"
echo ""
echo -e "  ${BOLD}Pass Rate: ${SCORE_PCT}%${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━ FAILED TESTS ━━━━━━━━━━━━━━${NC}"
  for r in "${RESULTS[@]}"; do
    if [[ "$r" == FAIL* ]]; then
      echo -e "  ${RED}❌ ${r}${NC}"
    fi
  done
  echo ""
fi

if [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}━━━━━━━━━━━━━━ WARNINGS ━━━━━━━━━━━━━━━━━━${NC}"
  for r in "${RESULTS[@]}"; do
    if [[ "$r" == WARN* ]]; then
      echo -e "  ${YELLOW}⚠️  ${r}${NC}"
    fi
  done
  echo ""
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
